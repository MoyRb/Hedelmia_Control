import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';

const isDev = !app.isPackaged;

// --- DB path estable ---
const dbPath = path.join(app.getPath('userData'), 'hedelmia.db');
const templateDbPath = isDev
  ? path.join(__dirname, '../../prisma/hedelmia.db')
  : path.join(process.resourcesPath, 'prisma', 'hedelmia.db');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (fs.existsSync(templateDbPath)) fs.copyFileSync(templateDbPath, dbPath);
}

// IMPORTANTE: setear DATABASE_URL antes de PrismaClient()
process.env.DATABASE_URL = process.env.DATABASE_URL ?? `file:${dbPath}`;

const prisma = new PrismaClient();

// --- Helpers ---
const safeHandle = (
  channel: string,
  fn: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args: any[]) => {
    try {
      return await fn(event, ...args);
    } catch (err: any) {
      console.error(`[IPC:${channel}]`, err);
      throw new Error(err?.message ?? String(err));
    }
  });
};


const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#fcf2e4',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    try {
      await prisma.$disconnect();
    } finally {
      app.quit();
    }
  }
});

// --------------------
// Backup
// --------------------
safeHandle('backup:export', async (_event, destino: string) => {
  fs.copyFileSync(dbPath, destino);
  return { ok: true };
});

// --------------------
// Inventario (materia prima)
// --------------------
safeHandle('inventario:listarMaterias', async () => {
  const [materias, unidades] = await Promise.all([
    prisma.rawMaterial.findMany({
      include: { unidad: true, movimientos: { orderBy: { createdAt: 'desc' }, take: 15 } },
      orderBy: { nombre: 'asc' }
    }),
    prisma.unit.findMany({ orderBy: { nombre: 'asc' } })
  ]);

  return { materias, unidades };
});

safeHandle('inventario:crearUnidad', async (_event, data: { nombre: string }) => {
  return prisma.unit.upsert({
    where: { nombre: data.nombre },
    update: {},
    create: { nombre: data.nombre }
  });
});

safeHandle(
  'inventario:crearMateria',
  async (_event, data: { nombre: string; unidadId: number; stock?: number; costoProm?: number }) => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const material = await tx.rawMaterial.create({
        data: {
          nombre: data.nombre,
          unidadId: data.unidadId,
          stock: data.stock ?? 0,
          costoProm: data.costoProm ?? 0
        }
      });

      if ((data.stock ?? 0) > 0) {
        await tx.rawMaterialMovement.create({
          data: {
            materialId: material.id,
            tipo: 'entrada',
            cantidad: data.stock!,
            costoTotal: (data.costoProm ?? 0) * data.stock!
          }
        });
      }

      return tx.rawMaterial.findUnique({
        where: { id: material.id },
        include: { unidad: true, movimientos: { orderBy: { createdAt: 'desc' }, take: 10 } }
      });
    });
  }
);

safeHandle(
  'inventario:movimientoMateria',
  async (_event, data: { materialId: number; tipo: 'entrada' | 'salida'; cantidad: number; costoTotal?: number }) => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const material = await tx.rawMaterial.findUnique({ where: { id: data.materialId } });
      if (!material) throw new Error('Material no encontrado');

      const cantidad = Number(data.cantidad ?? 0);
      if (cantidad <= 0) throw new Error('Cantidad inválida');

      const costoTotal = Number(data.costoTotal ?? 0);
      const newStock = data.tipo === 'entrada' ? material.stock + cantidad : material.stock - cantidad;
      if (newStock < 0) throw new Error('Stock insuficiente');

      let newCostoProm = material.costoProm;
      if (data.tipo === 'entrada') {
        const totalActual = material.costoProm * material.stock;
        newCostoProm = newStock > 0 ? (totalActual + costoTotal) / newStock : 0;
      }

      await tx.rawMaterial.update({ where: { id: material.id }, data: { stock: newStock, costoProm: newCostoProm } });

      await tx.rawMaterialMovement.create({
        data: { materialId: material.id, tipo: data.tipo, cantidad, costoTotal }
      });

      return tx.rawMaterial.findUnique({
        where: { id: material.id },
        include: { unidad: true, movimientos: { orderBy: { createdAt: 'desc' }, take: 15 } }
      });
    });
  }
);

// --------------------
// Inventario (productos terminados)
// --------------------
safeHandle('inventario:listarProductosStock', async () => {
  return prisma.product.findMany({
    include: {
      tipo: true,
      sabor: true,
      stockMoves: { orderBy: { createdAt: 'desc' }, take: 15 }
    },
    orderBy: { id: 'asc' }
  });
});

safeHandle(
  'inventario:movimientoProducto',
  async (_event, data: { productId: number; tipo: 'entrada' | 'salida'; cantidad: number; referencia?: string }) => {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const producto = await tx.product.findUnique({ where: { id: data.productId } });
      if (!producto) throw new Error('Producto no encontrado');

      const cantidad = Number(data.cantidad ?? 0);
      if (cantidad <= 0) throw new Error('Cantidad inválida');

      const newStock = data.tipo === 'entrada' ? producto.stock + cantidad : producto.stock - cantidad;
      if (newStock < 0) throw new Error('Stock insuficiente');

      await tx.product.update({ where: { id: producto.id }, data: { stock: newStock } });

      await tx.finishedStockMovement.create({
        data: { productId: producto.id, tipo: data.tipo, cantidad, referencia: data.referencia }
      });

      return tx.product.findUnique({
        where: { id: producto.id },
        include: { tipo: true, sabor: true, stockMoves: { orderBy: { createdAt: 'desc' }, take: 15 } }
      });
    });
  }
);

// --------------------
// Catálogo (tipos / sabores / productos) con activo + edición
// --------------------
safeHandle('catalogo:listar', async () => {
  const [sabores, productos, tipos] = await Promise.all([
    prisma.flavor.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.product.findMany({ include: { tipo: true, sabor: true }, orderBy: { id: 'asc' } }),
    prisma.productType.findMany({ orderBy: { nombre: 'asc' } })
  ]);

  return { sabores, productos, tipos };
});

// Tipos
safeHandle('catalogo:crearTipo', async (_event, data: { nombre: string; activo?: boolean }) => {
  return prisma.productType.create({
    data: { nombre: data.nombre, activo: data.activo ?? true }
  });
});

safeHandle('catalogo:actualizarTipo', async (_event, data: { id: number; nombre: string; activo?: boolean }) => {
  return prisma.productType.update({
    where: { id: data.id },
    data: { nombre: data.nombre, ...(typeof data.activo === 'boolean' ? { activo: data.activo } : {}) }
  });
});

safeHandle('catalogo:toggleTipo', async (_event, data: { id: number; activo: boolean }) => {
  return prisma.productType.update({ where: { id: data.id }, data: { activo: data.activo } });
});

// Sabores
safeHandle('catalogo:crearSabor', async (_event, data: { nombre: string; color?: string; activo?: boolean }) => {
  return prisma.flavor.create({
    data: { nombre: data.nombre, color: data.color, activo: data.activo ?? true }
  });
});

safeHandle(
  'catalogo:actualizarSabor',
  async (_event, data: { id: number; nombre: string; color?: string | null; activo?: boolean }) => {
    return prisma.flavor.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        color: data.color ?? null,
        ...(typeof data.activo === 'boolean' ? { activo: data.activo } : {})
      }
    });
  }
);

safeHandle('catalogo:toggleSabor', async (_event, data: { id: number; activo: boolean }) => {
  return prisma.flavor.update({ where: { id: data.id }, data: { activo: data.activo } });
});

// Productos
safeHandle(
  'catalogo:crearProducto',
  async (
    _event,
    data: {
      tipoId: number;
      saborId: number;
      presentacion: string;
      precio: number;
      costo: number;
      sku?: string;
      stock?: number;
      activo?: boolean;
    }
  ) => {
    return prisma.product.create({
      data: {
        tipoId: data.tipoId,
        saborId: data.saborId,
        presentacion: data.presentacion,
        precio: data.precio,
        costo: data.costo,
        sku: data.sku,
        stock: data.stock ?? 0,
        activo: data.activo ?? true
      }
    });
  }
);

safeHandle(
  'catalogo:actualizarProducto',
  async (
    _event,
    data: {
      id: number;
      tipoId: number;
      saborId: number;
      presentacion: string;
      precio: number;
      costo: number;
      sku?: string | null;
      stock?: number;
      activo?: boolean;
    }
  ) => {
    return prisma.product.update({
      where: { id: data.id },
      data: {
        tipoId: data.tipoId,
        saborId: data.saborId,
        presentacion: data.presentacion,
        precio: data.precio,
        costo: data.costo,
        sku: data.sku ?? undefined,
        ...(typeof data.stock === 'number' ? { stock: data.stock } : {}),
        ...(typeof data.activo === 'boolean' ? { activo: data.activo } : {})
      }
    });
  }
);

safeHandle('catalogo:toggleProducto', async (_event, data: { id: number; activo: boolean }) => {
  return prisma.product.update({ where: { id: data.id }, data: { activo: data.activo } });
});

// --------------------
// Cajas
// --------------------
safeHandle('cajas:listarMovimientos', async () => {
  return prisma.cashBox.findMany({
    include: { movimientos: { orderBy: { fecha: 'desc' } } },
    orderBy: { id: 'asc' }
  });
});

safeHandle(
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

// --------------------
// Clientes
// --------------------
safeHandle('clientes:listar', async () => {
  return prisma.customer.findMany({ orderBy: { id: 'asc' } });
});

safeHandle(
  'clientes:crear',
  async (_event, data: { nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => {
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

safeHandle(
  'clientes:actualizar',
  async (_event, data: { id: number; nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => {
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

safeHandle('clientes:toggleEstado', async (_event, data: { id: number; estado: 'activo' | 'inactivo' }) => {
  return prisma.customer.update({ where: { id: data.id }, data: { estado: data.estado } });
});

// --------------------
// Refris
// --------------------
safeHandle('refris:listar', async () => {
  return prisma.fridgeAsset.findMany({ orderBy: { id: 'asc' } });
});

safeHandle('refris:crear', async (_event, data: { modelo: string; serie: string; estado?: string }) => {
  return prisma.fridgeAsset.create({
    data: {
      modelo: data.modelo,
      serie: data.serie,
      estado: data.estado ?? 'activo'
    }
  });
});

safeHandle('refris:actualizar', async (_event, data: { id: number; modelo?: string; serie?: string; estado?: string }) => {
  const { id, ...campos } = data;
  return prisma.fridgeAsset.update({
    where: { id },
    data: {
      ...(campos.modelo !== undefined ? { modelo: campos.modelo } : {}),
      ...(campos.serie !== undefined ? { serie: campos.serie } : {}),
      ...(campos.estado !== undefined ? { estado: campos.estado } : {})
    }
  });
});

safeHandle('refris:toggleEstado', async (_event, data: { id: number }) => {
  const refri = await prisma.fridgeAsset.findUnique({ where: { id: data.id } });
  if (!refri) throw new Error('Refri no encontrado');

  const nuevoEstado = refri.estado === 'activo' ? 'inactivo' : 'activo';
  return prisma.fridgeAsset.update({ where: { id: data.id }, data: { estado: nuevoEstado } });
});

// --------------------
// Ventas
// --------------------
safeHandle('ventas:list', async () => {
  return prisma.sale.findMany({ include: { items: true, pagos: true } });
});

safeHandle(
  'ventas:crear',
  async (_event, data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => {
    const productos = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      select: { id: true, precio: true }
    });

    const total = data.items.reduce((sum, item) => {
      const prod = productos.find((p) => p.id === item.productId);
      return sum + (prod?.precio ?? 0) * item.cantidad;
    }, 0);

    const folio = `V-${Date.now()}`;
    const cajeroId = data.cajeroId ?? 1;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sale = await tx.sale.create({
        data: { folio, cajeroId, total, pagoMetodo: data.metodo }
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
