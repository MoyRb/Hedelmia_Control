import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

/* =========================================================
   ESM PATHS + CommonJS bridge (NECESARIO)
========================================================= */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cjsRequire = createRequire(import.meta.url)

/* =========================================================
   PRISMA – Electron-safe lazy loader
========================================================= */
import type { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | undefined

function getPrisma(): PrismaClient {
  if (!prisma) {
    const { PrismaClient } = cjsRequire('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma!
}

async function getDefaultUserId(prismaClient: PrismaClient): Promise<number> {
  const existing = await prismaClient.user.findFirst({ orderBy: { id: 'asc' } })
  if (existing) return existing.id

  const created = await prismaClient.user.create({
    data: {
      email: 'cajero@hedelmia.local',
      nombre: 'Cajero',
      password: 'changeme',
      role: 'CAJERO'
    }
  })

  return created.id
}

async function ensureDefaultCashBoxes(prismaClient: PrismaClient) {
  const existentes = await prismaClient.cashBox.findMany()
  if (existentes.length > 0) return

  await prismaClient.cashBox.createMany({
    data: [
      { nombre: 'Caja chica', tipo: 'chica' },
      { nombre: 'Caja grande', tipo: 'grande' }
    ]
  })
}

/* =========================================================
   APP CONFIG
========================================================= */
const isDev = !app.isPackaged

const resolvePreloadPath = () => {
  const appPath = app.getAppPath()
  const resourcePath = process.resourcesPath
  const candidates = [
    path.join(__dirname, '../preload/index.js'),
    path.join(appPath, 'dist', 'preload', 'index.js'),
    path.join(resourcePath, 'app.asar', 'dist', 'preload', 'index.js'),
    path.join(resourcePath, 'app.asar.unpacked', 'dist', 'preload', 'index.js'),
    path.join(resourcePath, 'dist', 'preload', 'index.js')
  ]
  const found = candidates.find((candidate) => fs.existsSync(candidate))
  if (!found) {
    console.error('[preload] No se encontró el archivo preload.', { candidates })
    return candidates[0]
  }
  return found
}

/* =========================================================
   PRISMA ENGINE PATH (asar-safe)
========================================================= */
if (!isDev) {
  const prismaEngineDir = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    '.prisma',
    'client'
  )
  if (fs.existsSync(prismaEngineDir)) {
    const engineFile = fs
      .readdirSync(prismaEngineDir)
      .find((file) => file.startsWith('libquery_engine') || file.startsWith('query_engine'))
    if (engineFile) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(prismaEngineDir, engineFile)
    }
  }
}

/* =========================================================
   DATABASE SETUP (SQLite portable)
========================================================= */
const dbPath = path.join(app.getPath('userData'), 'hedelmia.db')

const templateDbPath = isDev
  ? path.join(__dirname, '../../prisma/hedelmia.db')
  : path.join(process.resourcesPath, 'prisma', 'hedelmia.db')

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  if (fs.existsSync(templateDbPath)) {
    fs.copyFileSync(templateDbPath, dbPath)
  }
}

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${dbPath}`

/* =========================================================
   IPC SAFE HANDLER
========================================================= */
const safeHandle = (
  channel: string,
  fn: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args)
    } catch (err: any) {
      console.error(`[IPC:${channel}]`, err)
      throw new Error(err?.message ?? String(err))
    }
  })
}

/* =========================================================
   WINDOW
========================================================= */
const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#fcf2e4',
    show: false,
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  if (isDev) {
    await win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    await win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

/* =========================================================
   APP LIFECYCLE
========================================================= */
app.whenReady().then(createWindow)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    try {
      if (prisma) await prisma.$disconnect()
    } finally {
      app.quit()
    }
  }
})

/* =========================================================
   IPC HANDLERS – DASHBOARD
========================================================= */
safeHandle('dashboard:resumen', async () => {
  const prisma = getPrisma()

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)

  const finHoy = new Date(inicioHoy)
  finHoy.setDate(finHoy.getDate() + 1)

  const ventasHoy = await prisma.sale.findMany({
    where: {
      fecha: {
        gte: inicioHoy,
        lt: finHoy
      }
    }
  })

  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)

  const movimientosHoy = await prisma.cashMovement.findMany({
    where: {
      fecha: {
        gte: inicioHoy,
        lt: finHoy
      }
    }
  })

  const cajaDia = movimientosHoy.reduce((sum, mov) => {
    const monto = Number(mov.monto) || 0
    return mov.tipo === 'egreso' ? sum - monto : sum + monto
  }, 0)

  const clientesConAdeudo = await prisma.customer.count({
    where: { saldo: { gt: 0 } }
  })

  const refrisAsignados = await prisma.fridgeAssignment.count({
    where: { fechaFin: null }
  })

  const refrisDisponibles = await prisma.fridgeAsset.count({
    where: {
      estado: 'activo',
      asignaciones: { none: { fechaFin: null } }
    }
  })

  const ultimasVentas = await prisma.sale.findMany({
    orderBy: { fecha: 'desc' },
    take: 5
  })

  const clientesSaldo = await prisma.customer.findMany({
    orderBy: { saldo: 'desc' },
    take: 5
  })

  const inventarioBajo = await prisma.product.findMany({
    orderBy: { stock: 'asc' },
    take: 5,
    include: { tipo: true, sabor: true }
  })

  const inicioSemana = new Date(inicioHoy)
  inicioSemana.setDate(inicioSemana.getDate() - 6)

  const movimientosSemana = await prisma.cashMovement.findMany({
    where: {
      fecha: {
        gte: inicioSemana,
        lt: finHoy
      }
    },
    orderBy: { fecha: 'asc' }
  })

  const ingresosVsEgresos = Array.from({ length: 7 }).map((_, idx) => {
    const fecha = new Date(inicioSemana)
    fecha.setDate(inicioSemana.getDate() + idx)
    const label = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    return {
      fecha: label,
      ingresos: 0,
      egresos: 0
    }
  })

  movimientosSemana.forEach((mov) => {
    const fecha = new Date(mov.fecha)
    const diff = Math.floor((fecha.getTime() - inicioSemana.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0 || diff >= ingresosVsEgresos.length) return
    if (mov.tipo === 'egreso') ingresosVsEgresos[diff].egresos += mov.monto
    else ingresosVsEgresos[diff].ingresos += mov.monto
  })

  return {
    kpis: {
      cajaDia,
      ventasDia: totalVentasHoy,
      clientesConAdeudo,
      refrisAsignados,
      refrisDisponibles
    },
    tablas: {
      ultimasVentas,
      clientesSaldo,
      inventarioBajo
    },
    graficas: {
      ingresosVsEgresos,
      refrisAsignadosVsLibres: [
        { label: 'Asignados', valor: refrisAsignados },
        { label: 'Disponibles', valor: refrisDisponibles }
      ]
    }
  }
})

/* =========================================================
   IPC HANDLERS – CATÁLOGO
========================================================= */
safeHandle('catalogo:listar', async () => {
  const prisma = getPrisma()

  const tipos = await prisma.productType.findMany()
  const sabores = await prisma.flavor.findMany()
  const productos = await prisma.product.findMany({
    include: { tipo: true, sabor: true }
  })

  return { tipos, sabores, productos }
})

safeHandle('catalogo:crearTipo', async (_event, data: { nombre: string; activo?: boolean }) => {
  const prisma = getPrisma()
  return prisma.productType.create({
    data: { nombre: data.nombre, activo: data.activo ?? true }
  })
})

safeHandle('catalogo:actualizarTipo', async (_event, data: { id: number; nombre: string; activo?: boolean }) => {
  const prisma = getPrisma()
  return prisma.productType.update({
    where: { id: data.id },
    data: { nombre: data.nombre, activo: data.activo ?? true }
  })
})

safeHandle('catalogo:toggleTipo', async (_event, data: { id: number; activo: boolean }) => {
  const prisma = getPrisma()
  return prisma.productType.update({
    where: { id: data.id },
    data: { activo: data.activo }
  })
})

safeHandle('catalogo:crearSabor', async (_event, data: { nombre: string; color?: string; activo?: boolean }) => {
  const prisma = getPrisma()
  return prisma.flavor.create({
    data: { nombre: data.nombre, color: data.color, activo: data.activo ?? true }
  })
})

safeHandle(
  'catalogo:actualizarSabor',
  async (_event, data: { id: number; nombre: string; color?: string | null; activo?: boolean }) => {
    const prisma = getPrisma()
    return prisma.flavor.update({
      where: { id: data.id },
      data: { nombre: data.nombre, color: data.color ?? null, activo: data.activo ?? true }
    })
  }
)

safeHandle('catalogo:toggleSabor', async (_event, data: { id: number; activo: boolean }) => {
  const prisma = getPrisma()
  return prisma.flavor.update({
    where: { id: data.id },
    data: { activo: data.activo }
  })
})

safeHandle(
  'catalogo:crearProducto',
  async (
    _event,
    data: {
      tipoId: number
      saborId: number
      presentacion: string
      precio: number
      costo: number
      sku?: string | null
      stock?: number
      activo?: boolean
    }
  ) => {
    const prisma = getPrisma()
    return prisma.product.create({
      data: {
        tipoId: data.tipoId,
        saborId: data.saborId,
        presentacion: data.presentacion,
        precio: data.precio,
        costo: data.costo,
        sku: data.sku ?? null,
        stock: data.stock ?? 0,
        activo: data.activo ?? true
      },
      include: { tipo: true, sabor: true }
    })
  }
)

safeHandle(
  'catalogo:actualizarProducto',
  async (
    _event,
    data: {
      id: number
      tipoId: number
      saborId: number
      presentacion: string
      precio: number
      costo: number
      sku?: string | null
      stock?: number
      activo?: boolean
    }
  ) => {
    const prisma = getPrisma()
    return prisma.product.update({
      where: { id: data.id },
      data: {
        tipoId: data.tipoId,
        saborId: data.saborId,
        presentacion: data.presentacion,
        precio: data.precio,
        costo: data.costo,
        sku: data.sku ?? null,
        stock: data.stock ?? undefined,
        activo: data.activo ?? true
      },
      include: { tipo: true, sabor: true }
    })
  }
)

safeHandle('catalogo:toggleProducto', async (_event, data: { id: number; activo: boolean }) => {
  const prisma = getPrisma()
  return prisma.product.update({
    where: { id: data.id },
    data: { activo: data.activo },
    include: { tipo: true, sabor: true }
  })
})

/* =========================================================
   IPC HANDLERS – INVENTARIOS
========================================================= */
safeHandle('inventario:listarMaterias', async () => {
  const prisma = getPrisma()
  const [materias, unidades] = await Promise.all([
    prisma.rawMaterial.findMany({
      include: {
        unidad: true,
        movimientos: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { nombre: 'asc' }
    }),
    prisma.unit.findMany({ orderBy: { nombre: 'asc' } })
  ])

  return { materias, unidades }
})

safeHandle('inventario:listarProductos', async () => {
  const prisma = getPrisma()
  return prisma.product.findMany()
})

safeHandle('inventario:crearUnidad', async (_event, data: { nombre: string }) => {
  const prisma = getPrisma()
  return prisma.unit.create({ data: { nombre: data.nombre } })
})

safeHandle(
  'inventario:crearMateria',
  async (_event, data: { nombre: string; unidadId: number; stock?: number; costoProm?: number }) => {
    const prisma = getPrisma()
    return prisma.rawMaterial.create({
      data: {
        nombre: data.nombre,
        unidadId: data.unidadId,
        stock: data.stock ?? 0,
        costoProm: data.costoProm ?? 0
      },
      include: { unidad: true, movimientos: true }
    })
  }
)

safeHandle(
  'inventario:movimientoMateria',
  async (_event, data: { materialId: number; tipo: 'entrada' | 'salida'; cantidad: number; costoTotal?: number }) => {
    const prisma = getPrisma()

    return prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUniqueOrThrow({ where: { id: data.materialId } })
      const cantidad = Number(data.cantidad) || 0
      const costoTotal = Number(data.costoTotal) || 0

      if (cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a cero.')
      }

      let nuevoStock = material.stock
      let nuevoCostoProm = material.costoProm

      if (data.tipo === 'entrada') {
        const stockBase = material.stock
        nuevoStock = stockBase + cantidad
        if (nuevoStock > 0 && costoTotal > 0) {
          const costoAcumulado = stockBase * material.costoProm + costoTotal
          nuevoCostoProm = costoAcumulado / nuevoStock
        }
      } else {
        if (material.stock < cantidad) {
          throw new Error('No hay stock suficiente.')
        }
        nuevoStock = material.stock - cantidad
      }

      await tx.rawMaterialMovement.create({
        data: {
          materialId: material.id,
          tipo: data.tipo,
          cantidad,
          costoTotal: data.tipo === 'entrada' ? costoTotal : 0
        }
      })

      return tx.rawMaterial.update({
        where: { id: material.id },
        data: { stock: nuevoStock, costoProm: nuevoCostoProm },
        include: { unidad: true, movimientos: { orderBy: { createdAt: 'desc' } } }
      })
    })
  }
)

safeHandle('inventario:listarProductosStock', async () => {
  const prisma = getPrisma()
  return prisma.product.findMany({
    include: {
      tipo: true,
      sabor: true,
      stockMoves: { orderBy: { createdAt: 'desc' } }
    },
    orderBy: { stock: 'asc' }
  })
})

safeHandle(
  'inventario:movimientoProducto',
  async (_event, data: { productId: number; tipo: 'entrada' | 'salida'; cantidad: number; referencia?: string }) => {
    const prisma = getPrisma()

    return prisma.$transaction(async (tx) => {
      const producto = await tx.product.findUniqueOrThrow({ where: { id: data.productId } })
      const cantidad = Number(data.cantidad) || 0

      if (cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a cero.')
      }

      let nuevoStock = producto.stock
      if (data.tipo === 'entrada') {
        nuevoStock = producto.stock + cantidad
      } else {
        if (producto.stock < cantidad) {
          throw new Error('No hay stock suficiente.')
        }
        nuevoStock = producto.stock - cantidad
      }

      await tx.finishedStockMovement.create({
        data: {
          productId: producto.id,
          tipo: data.tipo,
          cantidad,
          referencia: data.referencia
        }
      })

      return tx.product.update({
        where: { id: producto.id },
        data: { stock: nuevoStock },
        include: {
          tipo: true,
          sabor: true,
          stockMoves: { orderBy: { createdAt: 'desc' } }
        }
      })
    })
  }
)

/* =========================================================
   IPC HANDLERS – CLIENTES
========================================================= */
safeHandle('clientes:listar', async () => {
  const prisma = getPrisma()
  return prisma.customer.findMany({
    include: {
      creditos: true,
      movimientos: true
    }
  })
})

safeHandle(
  'clientes:crear',
  async (_event, data: { nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: string }) => {
    const prisma = getPrisma()
    return prisma.customer.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono ?? null,
        limite: data.limite ?? 0,
        saldo: data.saldo ?? 0,
        estado: data.estado ?? 'activo'
      }
    })
  }
)

safeHandle(
  'clientes:actualizar',
  async (
    _event,
    data: { id: number; nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: string }
  ) => {
    const prisma = getPrisma()
    return prisma.customer.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono ?? null,
        limite: data.limite ?? 0,
        saldo: data.saldo ?? 0,
        estado: data.estado ?? 'activo'
      }
    })
  }
)

safeHandle('clientes:toggleEstado', async (_event, data: { id: number; estado: string }) => {
  const prisma = getPrisma()
  return prisma.customer.update({
    where: { id: data.id },
    data: { estado: data.estado }
  })
})

safeHandle('creditos:listarConSaldo', async () => {
  const prisma = getPrisma()
  return prisma.customer.findMany({
    where: { saldo: { gt: 0 } },
    orderBy: { saldo: 'desc' }
  })
})

safeHandle('pagares:listarPorCliente', async (_event, customerId: number) => {
  const prisma = getPrisma()
  return prisma.promissoryNote.findMany({
    where: { customerId },
    include: { abonos: { orderBy: { fecha: 'desc' } } },
    orderBy: { fecha: 'desc' }
  })
})

safeHandle('pagares:crear', async (_event, data: { customerId: number; monto: number }) => {
  const prisma = getPrisma()
  return prisma.promissoryNote.create({
    data: {
      customerId: data.customerId,
      monto: data.monto,
      estado: 'vigente'
    }
  })
})

safeHandle(
  'pagares:registrarAbono',
  async (_event, data: { promissoryNoteId: number; monto: number; cashBoxId?: number }) => {
    const prisma = getPrisma()

    return prisma.$transaction(async (tx) => {
      const pagare = await tx.promissoryNote.findUniqueOrThrow({
        where: { id: data.promissoryNoteId }
      })

      if (data.monto <= 0) {
        throw new Error('El monto debe ser mayor a cero.')
      }

      if (data.monto > pagare.monto) {
        throw new Error('El abono no puede ser mayor al monto pendiente.')
      }

      await tx.promissoryPayment.create({
        data: {
          promissoryNoteId: pagare.id,
          monto: data.monto
        }
      })

      const nuevoMonto = pagare.monto - data.monto
      const estado = nuevoMonto <= 0 ? 'pagado' : pagare.estado

      const pagareActualizado = await tx.promissoryNote.update({
        where: { id: pagare.id },
        data: { monto: nuevoMonto, estado },
        include: { abonos: { orderBy: { fecha: 'desc' } } }
      })

      const cliente = await tx.customer.update({
        where: { id: pagare.customerId },
        data: {
          saldo: {
            decrement: data.monto
          }
        }
      })

      if (data.cashBoxId) {
        await tx.cashMovement.create({
          data: {
            cashBoxId: data.cashBoxId,
            tipo: 'ingreso',
            concepto: `Abono pagaré #${pagare.id}`,
            monto: data.monto
          }
        })
      }

      await tx.customerMovement.create({
        data: {
          customerId: cliente.id,
          tipo: 'abono',
          concepto: `Abono pagaré #${pagare.id}`,
          monto: data.monto,
          referencia: `pagare:${pagare.id}`
        }
      })

      return { pagare: pagareActualizado, saldoCliente: cliente.saldo }
    })
  }
)

/* =========================================================
   IPC HANDLERS – CAJAS
========================================================= */
safeHandle('cajas:listar', async () => {
  const prisma = getPrisma()
  await ensureDefaultCashBoxes(prisma)
  return prisma.cashBox.findMany({
    include: {
      movimientos: { orderBy: { fecha: 'desc' } }
    }
  })
})

safeHandle('cajas:listarMovimientos', async (_event, cashBoxId: number) => {
  const prisma = getPrisma()
  return prisma.cashMovement.findMany({
    where: { cashBoxId },
    orderBy: { fecha: 'desc' }
  })
})

safeHandle(
  'cajas:crearMovimiento',
  async (_event, data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) => {
    const prisma = getPrisma()
    return prisma.cashMovement.create({
      data: {
        cashBoxId: data.cashBoxId,
        tipo: data.tipo,
        concepto: data.concepto,
        monto: data.monto,
        fecha: data.fecha ? new Date(data.fecha) : new Date()
      }
    })
  }
)

/* =========================================================
   IPC HANDLERS – REFRIS
========================================================= */
safeHandle('refris:listar', async () => {
  const prisma = getPrisma()
  return prisma.fridgeAsset.findMany({
    include: {
      asignaciones: {
        include: { customer: true },
        orderBy: { entregadoEn: 'desc' }
      },
      visitas: true
    }
  })
})

safeHandle('refris:listarDisponibles', async () => {
  const prisma = getPrisma()
  return prisma.fridgeAsset.findMany({
    where: {
      estado: 'activo',
      asignaciones: { none: { fechaFin: null } }
    }
  })
})

safeHandle('refris:crear', async (_event, data: { modelo: string; serie: string; estado?: string }) => {
  const prisma = getPrisma()
  return prisma.fridgeAsset.create({
    data: {
      modelo: data.modelo,
      serie: data.serie,
      estado: data.estado ?? 'activo'
    }
  })
})

safeHandle(
  'refris:actualizar',
  async (_event, data: { id: number; modelo?: string; serie?: string; estado?: string }) => {
    const prisma = getPrisma()
    return prisma.fridgeAsset.update({
      where: { id: data.id },
      data: {
        modelo: data.modelo,
        serie: data.serie,
        estado: data.estado
      },
      include: { asignaciones: true }
    })
  }
)

safeHandle('refris:toggleEstado', async (_event, data: { id: number }) => {
  const prisma = getPrisma()
  const refri = await prisma.fridgeAsset.findUniqueOrThrow({ where: { id: data.id } })
  const nuevoEstado = refri.estado === 'activo' ? 'inactivo' : 'activo'
  return prisma.fridgeAsset.update({
    where: { id: refri.id },
    data: { estado: nuevoEstado },
    include: { asignaciones: true }
  })
})

safeHandle('asignaciones:listarPorCliente', async (_event, customerId: number) => {
  const prisma = getPrisma()
  return prisma.fridgeAssignment.findMany({
    where: { customerId },
    include: { asset: true },
    orderBy: { entregadoEn: 'desc' }
  })
})

safeHandle(
  'asignaciones:crear',
  async (
    _event,
    data: { customerId: number; assetId: number; ubicacion: string; entregadoEn: string; deposito?: number; renta?: number }
  ) => {
    const prisma = getPrisma()
    return prisma.$transaction(async (tx) => {
      const active = await tx.fridgeAssignment.findFirst({
        where: { assetId: data.assetId, fechaFin: null }
      })
      if (active) {
        throw new Error('El refri ya está asignado.')
      }

      const asignacion = await tx.fridgeAssignment.create({
        data: {
          customerId: data.customerId,
          assetId: data.assetId,
          ubicacion: data.ubicacion,
          entregadoEn: new Date(data.entregadoEn),
          deposito: data.deposito ?? null,
          renta: data.renta ?? null
        },
        include: { asset: true, customer: true }
      })

      return asignacion
    })
  }
)

safeHandle('asignaciones:eliminar', async (_event, id: number) => {
  const prisma = getPrisma()
  await prisma.fridgeAssignment.update({
    where: { id },
    data: {
      fechaFin: new Date()
    }
  })
  return { ok: true }
})

safeHandle('ventas:list', async () => {
  const prisma = getPrisma()
  return prisma.sale.findMany({
    include: { items: true },
    orderBy: { fecha: 'desc' }
  })
})

safeHandle(
  'ventas:crear',
  async (_event, data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => {
    const prisma = getPrisma()
    const cajeroId = data.cajeroId ?? (await getDefaultUserId(prisma))
    const folio = `VENTA-${Date.now()}`

    return prisma.$transaction(async (tx) => {
      const productos = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } }
      })
      const total = data.items.reduce((sum, item) => {
        const prod = productos.find((p) => p.id === item.productId)
        if (!prod) throw new Error('Producto no encontrado.')
        if (prod.stock < item.cantidad) throw new Error('Stock insuficiente.')
        return sum + prod.precio * item.cantidad
      }, 0)

      const sale = await tx.sale.create({
        data: {
          folio,
          cajeroId,
          total,
          pagoMetodo: data.metodo
        }
      })

      await tx.saleItem.createMany({
        data: data.items.map((item) => {
          const prod = productos.find((p) => p.id === item.productId)!
          return {
            saleId: sale.id,
            productId: item.productId,
            cantidad: item.cantidad,
            precio: prod.precio
          }
        })
      })

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.cantidad } }
        })
      }

      await tx.payment.create({
        data: { saleId: sale.id, monto: total, metodo: data.metodo }
      })

      return sale
    })
  }
)

safeHandle(
  'pos:venta',
  async (
    _event,
    data: { items: { productId: number; cantidad: number }[]; customerId?: number | null; cashBoxId?: number | null }
  ) => {
    const prisma = getPrisma()
    const cajeroId = await getDefaultUserId(prisma)
    const folio = `POS-${Date.now()}`

    return prisma.$transaction(async (tx) => {
      const productos = await tx.product.findMany({
        where: { id: { in: data.items.map((i) => i.productId) } }
      })

      const total = data.items.reduce((sum, item) => {
        const prod = productos.find((p) => p.id === item.productId)
        if (!prod) throw new Error('Producto no encontrado.')
        if (prod.stock < item.cantidad) throw new Error('Stock insuficiente.')
        return sum + prod.precio * item.cantidad
      }, 0)

      const sale = await tx.sale.create({
        data: {
          folio,
          cajeroId,
          total,
          pagoMetodo: data.customerId ? 'crédito' : 'efectivo'
        }
      })

      await tx.saleItem.createMany({
        data: data.items.map((item) => {
          const prod = productos.find((p) => p.id === item.productId)!
          return {
            saleId: sale.id,
            productId: item.productId,
            cantidad: item.cantidad,
            precio: prod.precio
          }
        })
      })

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.cantidad } }
        })

        await tx.finishedStockMovement.create({
          data: {
            productId: item.productId,
            tipo: 'salida',
            cantidad: item.cantidad,
            referencia: `Venta ${folio}`
          }
        })
      }

      await tx.payment.create({
        data: { saleId: sale.id, monto: total, metodo: data.customerId ? 'crédito' : 'efectivo' }
      })

      if (data.cashBoxId) {
        await tx.cashMovement.create({
          data: {
            cashBoxId: data.cashBoxId,
            tipo: 'ingreso',
            concepto: `Venta POS ${folio}`,
            monto: total
          }
        })
      }

      if (data.customerId) {
        await tx.customer.update({
          where: { id: data.customerId },
          data: { saldo: { increment: total } }
        })

        await tx.customerMovement.create({
          data: {
            customerId: data.customerId,
            tipo: 'cargo',
            concepto: `Venta POS ${folio}`,
            monto: total,
            referencia: `venta:${sale.id}`
          }
        })
      }

      return { saleId: sale.id, folio: sale.folio, total: sale.total, customerId: data.customerId ?? null }
    })
  }
)

safeHandle('backup:export', async (_event, destino: string) => {
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.copyFileSync(dbPath, destino)
  return { ok: true }
})

safeHandle('refri:listar', async () => {
  const prisma = getPrisma()
  return prisma.fridgeAsset.findMany({
    include: {
      asignaciones: {
        include: { customer: true },
        orderBy: { entregadoEn: 'desc' }
      },
      visitas: true
    }
  })
})

/* =========================================================
   IPC HANDLERS – STOCK
========================================================= */
safeHandle('stock:movimientos', async (_event, productId: number) => {
  const prisma = getPrisma()
  return prisma.finishedStockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' }
  })
})
