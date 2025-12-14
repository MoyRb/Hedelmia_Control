import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';

const isDev = !app.isPackaged;
const dbPath = path.join(app.getPath('userData'), 'hedelmia.db');
const templateDbPath = isDev
  ? path.join(__dirname, '../../prisma/hedelmia.db')
  : path.join(process.resourcesPath, 'prisma', 'hedelmia.db');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(templateDbPath)) {
    fs.copyFileSync(templateDbPath, dbPath);
  }
}

process.env.DATABASE_URL = process.env.DATABASE_URL ?? `file:${dbPath}`;

const prisma = new PrismaClient();

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    },
    backgroundColor: '#fcf2e4'
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('backup:export', async (_event, destino: string) => {
  fs.copyFileSync(dbPath, destino);
  return { ok: true };
});

ipcMain.handle('catalogo:listar', async () => {
  const [sabores, productos, tipos] = await Promise.all([
    prisma.flavor.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.product.findMany({ include: { tipo: true, sabor: true }, orderBy: { id: 'asc' } }),
    prisma.productType.findMany({ orderBy: { nombre: 'asc' } })
  ]);

  return { sabores, productos, tipos };
});

ipcMain.handle('catalogo:crearSabor', async (_event, data: { nombre: string; color?: string; activo?: boolean }) => {
  return prisma.flavor.create({
    data: {
      nombre: data.nombre,
      color: data.color,
      activo: data.activo ?? true
    }
  });
});

ipcMain.handle(
  'catalogo:crearProducto',
  async (
    _event,
    data: { tipoId: number; saborId: number; presentacion: string; precio: number; costo: number; sku?: string; stock?: number }
  ) => {
    return prisma.product.create({
      data: {
        tipoId: data.tipoId,
        saborId: data.saborId,
        presentacion: data.presentacion,
        precio: data.precio,
        costo: data.costo,
        sku: data.sku,
        stock: data.stock ?? 0
      }
    });
  }
);

ipcMain.handle('cajas:listarMovimientos', async () => {
  return prisma.cashBox.findMany({
    include: { movimientos: { orderBy: { fecha: 'desc' } } },
    orderBy: { id: 'asc' }
  });
});

ipcMain.handle(
  'cajas:crearMovimiento',
  async (_event, data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) => {
    return prisma.cashMovement.create({
      data: {
        cashBoxId: data.cashBoxId,
        tipo: data.tipo,
        concepto: data.concepto,
        monto: data.monto,
        fecha: data.fecha ? new Date(data.fecha) : undefined
      }
    });
  }
);

ipcMain.handle('clientes:listar', async () => {
  return prisma.customer.findMany({ orderBy: { id: 'asc' } });
});

ipcMain.handle(
  'clientes:crear',
  async (
    _event,
    data: { nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }
  ) => {
    return prisma.customer.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        limite: data.limite ?? 0,
        saldo: data.saldo ?? 0,
        estado: data.estado ?? 'activo'
      }
    });
  }
);

ipcMain.handle(
  'clientes:actualizar',
  async (
    _event,
    data: { id: number; nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }
  ) => {
    return prisma.customer.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        limite: data.limite ?? 0,
        saldo: data.saldo ?? 0,
        estado: data.estado ?? 'activo'
      }
    });
  }
);

ipcMain.handle('clientes:toggleEstado', async (_event, data: { id: number; estado: 'activo' | 'inactivo' }) => {
  return prisma.customer.update({ where: { id: data.id }, data: { estado: data.estado } });
});

ipcMain.handle('ventas:list', async () => {
  return prisma.sale.findMany({ include: { items: true, pagos: true } });
});

ipcMain.handle(
  'ventas:crear',
  async (_event, data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => {
    const productos = (await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      select: { id: true, precio: true }
    })) as { id: number; precio: number }[];

    const total = data.items.reduce((sum, item) => {
      const prod = productos.find((p) => p.id === item.productId);
      return sum + (prod?.precio ?? 0) * item.cantidad;
    }, 0);

    const folio = `V-${Date.now()}`;
    const cajeroId = data.cajeroId ?? 1;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sale = await tx.sale.create({
        data: {
          folio,
          cajeroId,
          total,
          pagoMetodo: data.metodo
        }
      });

      await tx.saleItem.createMany({
        data: data.items.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          cantidad: item.cantidad,
          precio: productos.find((p) => p.id === item.productId)?.precio ?? 0
        }))
      });

      await tx.payment.create({ data: { saleId: sale.id, monto: total, metodo: data.metodo } });

      return sale;
    });
  }
);
