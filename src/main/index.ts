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

/* =========================================================
   APP CONFIG
========================================================= */
const isDev = !app.isPackaged

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
      preload: path.join(__dirname, '../preload/index.js'),
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

  return {
    ventasDia: ventasHoy.reduce((sum, v) => sum + v.total, 0)
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

/* =========================================================
   IPC HANDLERS – INVENTARIOS
========================================================= */
safeHandle('inventario:listarMaterias', async () => {
  const prisma = getPrisma()
  return prisma.rawMaterial.findMany({
    include: { unidad: true }
  })
})

safeHandle('inventario:listarProductos', async () => {
  const prisma = getPrisma()
  return prisma.product.findMany()
})

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

/* =========================================================
   IPC HANDLERS – CAJAS
========================================================= */
safeHandle('cajas:listar', async () => {
  const prisma = getPrisma()
  return prisma.cashBox.findMany()
})

safeHandle('cajas:listarMovimientos', async (_event, cashBoxId: number) => {
  const prisma = getPrisma()
  return prisma.cashMovement.findMany({
    where: { cashBoxId },
    orderBy: { fecha: 'desc' }
  })
})

/* =========================================================
   IPC HANDLERS – REFRIS
========================================================= */
safeHandle('refri:listar', async () => {
  const prisma = getPrisma()
  return prisma.fridgeAsset.findMany({
    include: {
      asignaciones: true,
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
