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
const safeHandle = (channel: string, fn: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>) => {
  ipcMain.handle(channel, async (event, ...args: any[]) => {
    try {
      return await fn(event, ...args);
    } catch (err: any) {
      console.error(`[IPC:${channel}]`, err);
      throw new Error(err?.message ?? String(err));
    }
  });
};

const preferedCashBox = async (tx: Prisma.TransactionClient, cashBoxId?: number) => {
  if (typeof cashBoxId === 'number') {
    const caja = await tx.cashBox.findUnique({ where: { id: cashBoxId } });
    if (!caja) throw new Error('Caja no encontrada');
    return caja;
  }

  const cajaChica = await tx.cashBox.findFirst({ where: { tipo: 'chica' } });
  if (cajaChica) return cajaChica;

  const primera = await tx.cashBox.findFirst({ orderBy: { id: 'asc' } });
  if (!primera) throw new Error('Configura una caja antes de registrar el abono');

  return primera;
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

safeHandle('inventario:crearMateria', async (_event, data: { nombre: string; unidadId: number; stock?: number; costoProm?: number }) => {
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
});

safeHandle('inventario:movimientoMateria', async (_event, data: { materialId: number; tipo: 'entrada' | 'salida'; cantidad: number; costoTotal?: number }) => {
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
});

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

safeHandle('inventario:movimientoProducto', async (_event, data: { productId: number; tipo: 'entrada' | 'salida'; cantidad: number; referencia?: string }) => {
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
});

// --------------------
// Catálogo
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

safeHandle('catalogo:actualizarSabor', async (_event, data: { id: number; nombre: string; color?: string | null; activo?: boolean }) => {
  return prisma.flavor.update({
    where: { id: data.id },
    data: {
      nombre: data.nombre,
      color: data.color ?? null,
      ...(typeof data.activo === 'boolean' ? { activo: data.activo } : {})
    }
  });
});

safeHandle('catalogo:toggleSabor', async (_event, data: { id: number; activo: boolean }) => {
  return prisma.flavor.update({ where: { id: data.id }, data: { activo: data.activo } });
});

// Productos
safeHandle('catalogo:crearProducto', async (_event, data: {
  tipoId: number;
  saborId: number;
  presentacion: string;
  precio: number;
  costo: number;
  sku?: string;
  stock?: number;
  activo?: boolean;
}) => {
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
});

safeHandle('catalogo:actualizarProducto', async (_event, data: {
  id: number;
  tipoId: number;
  saborId: number;
  presentacion: string;
  precio: number;
  costo: number;
  sku?: string | null;
  stock?: number;
  activo?: boolean;
}) => {
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
});

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

safeHandle('cajas:crearMovimiento', async (_event, data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) => {
  return prisma.cashMovement.create({
    data: {
      cashBoxId: data.cashBoxId,
      tipo: data.tipo,
      concepto: data.concepto,
      monto: data.monto,
      fecha: data.fecha ? new Date(data.fecha) : undefined
    }
  });
});

// --------------------
// Clientes
// --------------------
safeHandle('clientes:listar', async () => {
  return prisma.customer.findMany({ orderBy: { id: 'asc' } });
});

safeHandle('clientes:crear', async (_event, data: { nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => {
  return prisma.customer.create({
    data: {
      nombre: data.nombre,
      telefono: data.telefono,
      limite: data.limite ?? 0,
      saldo: data.saldo ?? 0,
      estado: data.estado ?? 'activo'
    }
  });
});

safeHandle('clientes:actualizar', async (_event, data: { id: number; nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => {
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
});

safeHandle('clientes:toggleEstado', async (_event, data: { id: number; estado: 'activo' | 'inactivo' }) => {
  return prisma.customer.update({ where: { id: data.id }, data: { estado: data.estado } });
});

// Créditos / Pagarés
safeHandle('creditos:listarConSaldo', async () => {
  return prisma.customer.findMany({
    where: { saldo: { gt: 0 } },
    orderBy: { id: 'asc' }
  });
});

safeHandle('pagares:listarPorCliente', async (_event, customerId: number) => {
  return prisma.promissoryNote.findMany({
    where: { customerId },
    include: { abonos: { orderBy: { fecha: 'desc' } } },
    orderBy: { fecha: 'desc' }
  });
});

safeHandle('pagares:crear', async (_event, data: { customerId: number; monto: number }) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const cliente = await tx.customer.findUnique({ where: { id: data.customerId } });
    if (!cliente) throw new Error('Cliente no encontrado');

    const monto = Number(data.monto ?? 0);
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto inválido');
    if (monto > cliente.saldo) throw new Error('El monto no puede ser mayor al saldo del cliente');

    return tx.promissoryNote.create({
      data: {
        customerId: cliente.id,
        monto,
        estado: 'vigente'
      }
    });
  });
});

safeHandle('pagares:registrarAbono', async (_event, data: { promissoryNoteId: number; monto: number; cashBoxId?: number }) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const pagare = await tx.promissoryNote.findUnique({
      where: { id: data.promissoryNoteId },
      include: { customer: true }
    });
    if (!pagare) throw new Error('Pagaré no encontrado');
    if (pagare.estado === 'liquidado') throw new Error('El pagaré ya está liquidado');

    const monto = Number(data.monto ?? 0);
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Monto inválido');
    if (monto > pagare.monto) throw new Error('El abono no puede superar el saldo del pagaré');

    const cliente = pagare.customer;
    if (cliente.saldo < monto) throw new Error('El abono supera el saldo del cliente');

    const caja = await preferedCashBox(tx, data.cashBoxId);
    const nuevoMontoPagare = Math.max(pagare.monto - monto, 0);
    const nuevoEstado = nuevoMontoPagare <= 0 ? 'liquidado' : pagare.estado;

    await tx.promissoryPayment.create({
      data: { promissoryNoteId: pagare.id, monto, fecha: new Date() }
    });

    const pagareActualizado = await tx.promissoryNote.update({
      where: { id: pagare.id },
      data: { monto: nuevoMontoPagare, estado: nuevoEstado },
      include: { abonos: { orderBy: { fecha: 'desc' } } }
    });

    const clienteActualizado = await tx.customer.update({
      where: { id: cliente.id },
      data: { saldo: { decrement: monto } }
    });

    await tx.cashMovement.create({
      data: {
        cashBoxId: caja.id,
        tipo: 'ingreso',
        concepto: `Abono pagaré #${pagare.id} - ${cliente.nombre}`,
        monto,
        fecha: new Date()
      }
    });

    return { pagare: pagareActualizado, saldoCliente: clienteActualizado.saldo };
  });
});

// --------------------
// Refris
// --------------------
safeHandle('refris:listar', async () => {
  return prisma.fridgeAsset.findMany({
    include: {
      asignaciones: {
        include: { customer: true },
        orderBy: [{ fechaFin: 'asc' }, { entregadoEn: 'desc' }]
      }
    },
    orderBy: { id: 'asc' }
  });
});

safeHandle('refris:crear', async (_event, data: { modelo: string }) => {
  // serie opcional, pero tu UI suele pedirla; si quieres obligatoria, cámbiala arriba
  return prisma.fridgeAsset.create({
    data: {
      modelo: data.modelo,
      serie: (data as any).serie ?? '',
      estado: (data as any).estado ?? 'activo'
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
    },
    include: {
      asignaciones: {
        include: { customer: true },
        orderBy: [{ fechaFin: 'asc' }, { entregadoEn: 'desc' }]
      }
    }
  });
});

safeHandle('refris:toggleEstado', async (_event, data: { id: number }) => {
  const refri = await prisma.fridgeAsset.findUnique({ where: { id: data.id } });
  if (!refri) throw new Error('Refri no encontrado');

  const nuevoEstado = refri.estado === 'activo' ? 'inactivo' : 'activo';
  return prisma.fridgeAsset.update({
    where: { id: data.id },
    data: { estado: nuevoEstado },
    include: {
      asignaciones: {
        include: { customer: true },
        orderBy: [{ fechaFin: 'asc' }, { entregadoEn: 'desc' }]
      }
    }
  });
});

// --------------------
// Asignaciones (cliente <-> refri)
// --------------------
safeHandle('asignaciones:listarPorCliente', async (_event, customerId: number) => {
  return prisma.fridgeAssignment.findMany({
    where: { customerId },
    include: { asset: true },
    orderBy: [{ fechaFin: 'asc' }, { entregadoEn: 'desc' }]
  });
});

safeHandle('asignaciones:crear', async (_event, data: {
  customerId: number;
  assetId: number;
  ubicacion: string;
  entregadoEn: string;
  deposito?: number;
  renta?: number;
}) => {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const asset = await tx.fridgeAsset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new Error('Refri no encontrado');
    if (asset.estado !== 'activo') throw new Error('El refri está inactivo');

    // bloquear si ya está asignado (como "actualmente asignado")
    const yaAsignado = await tx.fridgeAssignment.findFirst({ where: { assetId: data.assetId, fechaFin: null } });
    if (yaAsignado) throw new Error('Ese refri ya está asignado');

    const asignacion = await tx.fridgeAssignment.create({
      data: {
        customerId: data.customerId,
        assetId: data.assetId,
        ubicacion: data.ubicacion,
        entregadoEn: new Date(data.entregadoEn),
        deposito: data.deposito ?? null,
        renta: data.renta ?? null
      }
    });

    const cargos: Prisma.CustomerMovementCreateManyInput[] = [];
    const referencia = `asignacion:${asignacion.id}`;

    const deposito = typeof data.deposito === 'number' ? Number(data.deposito) : undefined;
    const renta = typeof data.renta === 'number' ? Number(data.renta) : undefined;
    let totalCargo = 0;

    if (typeof deposito === 'number' && !Number.isNaN(deposito)) {
      cargos.push({
        customerId: data.customerId,
        tipo: 'deposito_refri',
        concepto: `Depósito refri ${asset.modelo} (${asset.serie})`,
        monto: deposito,
        referencia
      });
      totalCargo += deposito;
    }

    if (typeof renta === 'number' && !Number.isNaN(renta)) {
      cargos.push({
        customerId: data.customerId,
        tipo: 'renta_refri',
        concepto: `Renta refri ${asset.modelo} (${asset.serie})`,
        monto: renta,
        referencia
      });
      totalCargo += renta;
    }

    if (totalCargo > 0) {
      await tx.customer.update({ where: { id: data.customerId }, data: { saldo: { increment: totalCargo } } });
      await tx.customerMovement.createMany({ data: cargos });
    }

    return tx.fridgeAssignment.findUnique({
      where: { id: asignacion.id },
      include: { asset: true, customer: true }
    });
  });
});

safeHandle('asignaciones:eliminar', async (_event, id: number) => {
  const asignacion = await prisma.fridgeAssignment.findUnique({ where: { id } });
  if (!asignacion) throw new Error('Asignación no encontrada');
  if (!asignacion.fechaFin) {
    await prisma.fridgeAssignment.update({ where: { id }, data: { fechaFin: new Date() } });
  }
  return { ok: true };
});

safeHandle('refris:listarDisponibles', async () => {
  return prisma.fridgeAsset.findMany({
    where: {
      estado: 'activo',
      asignaciones: { none: { fechaFin: null } }
    },
    orderBy: { id: 'asc' }
  });
});

// --------------------
// Ventas
// --------------------
safeHandle('pos:venta', async (_event, data: {
  items: { productId: number; cantidad: number }[];
  customerId?: number | null;
  cashBoxId?: number | null;
}) => {
  const items = (data.items ?? []).map((item) => ({
    productId: Number(item.productId),
    cantidad: Number(item.cantidad)
  }));

  if (items.length === 0) throw new Error('Agrega productos antes de vender');

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const productos = await tx.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, precio: true, stock: true, presentacion: true, sabor: { select: { nombre: true } } }
    });

    const cliente = data.customerId ? await tx.customer.findUnique({ where: { id: data.customerId } }) : null;
    if (data.customerId && !cliente) throw new Error('Cliente no encontrado');

    const caja = await preferedCashBox(tx, data.cashBoxId ?? undefined);
    const folio = `POS-${Date.now()}`;

    const total = items.reduce((sum, item) => {
      const prod = productos.find((p) => p.id === item.productId);
      if (!prod) throw new Error('Producto no encontrado');
      if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) throw new Error('Cantidad inválida');
      if (prod.stock < item.cantidad) throw new Error(`Stock insuficiente para ${prod.sabor.nombre}`);
      return sum + prod.precio * item.cantidad;
    }, 0);

    const sale = await tx.sale.create({
      data: { folio, cajeroId: 1, total, pagoMetodo: cliente ? 'credito' : 'efectivo' }
    });

    await tx.saleItem.createMany({
      data: items.map((item) => {
        const prod = productos.find((p) => p.id === item.productId)!;
        return {
          saleId: sale.id,
          productId: prod.id,
          cantidad: item.cantidad,
          precio: prod.precio
        };
      })
    });

    await tx.payment.create({ data: { saleId: sale.id, monto: total, metodo: cliente ? 'credito' : 'efectivo' } });

    await tx.cashMovement.create({
      data: {
        cashBoxId: caja.id,
        tipo: 'ingreso',
        concepto: `Venta POS ${folio}`,
        monto: total,
        fecha: new Date()
      }
    });

    for (const item of items) {
      const prod = productos.find((p) => p.id === item.productId)!;
      const nuevoStock = prod.stock - item.cantidad;
      await tx.product.update({ where: { id: prod.id }, data: { stock: nuevoStock } });
      await tx.finishedStockMovement.create({
        data: { productId: prod.id, tipo: 'salida', cantidad: item.cantidad, referencia: `venta:${folio}` }
      });
    }

    if (cliente) {
      await tx.customer.update({ where: { id: cliente.id }, data: { saldo: { increment: total } } });
      await tx.customerMovement.create({
        data: {
          customerId: cliente.id,
          tipo: 'venta_pos',
          concepto: `Venta POS ${folio}`,
          monto: total,
          referencia: `sale:${sale.id}`
        }
      });
    }

    return { saleId: sale.id, folio, total, customerId: cliente?.id ?? null };
  });
});

safeHandle('ventas:list', async () => {
  return prisma.sale.findMany({ include: { items: true, pagos: true } });
});

safeHandle('ventas:crear', async (_event, data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => {
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
});
