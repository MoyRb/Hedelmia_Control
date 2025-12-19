import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

/* =========================================================
   PRISMA – Electron-safe lazy loader (FINAL)
========================================================= */
type PrismaClientType = import('@prisma/client').PrismaClient;

let prisma: PrismaClientType | null = null;

function getPrisma(): PrismaClientType {
  if (!prisma) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma!;
}

/* =========================================================
   APP CONFIG
========================================================= */
const isDev = !app.isPackaged;

/* =========================================================
   DATABASE SETUP
========================================================= */
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

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${dbPath}`;

/* =========================================================
   IPC SAFE HANDLER
========================================================= */
const safeHandle = (
  channel: string,
  fn: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...args);
    } catch (err: any) {
      console.error(`[IPC:${channel}]`, err);
      throw new Error(err?.message ?? String(err));
    }
  });
};

/* =========================================================
   WINDOW
========================================================= */
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
    // ✅ RUTA CORRECTA EN PRODUCCIÓN (ESTA ES LA CLAVE)
    await win.loadFile(
      path.join(__dirname, '../renderer/index.html')
    );
  }
};

/* =========================================================
   APP LIFECYCLE
========================================================= */
app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    try {
      if (prisma) await prisma.$disconnect();
    } finally {
      app.quit();
    }
  }
});

/* =========================================================
   EJEMPLO REAL DE PRISMA
========================================================= */
safeHandle('dashboard:resumen', async () => {
  const prisma = getPrisma();

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const finHoy = new Date(inicioHoy);
  finHoy.setDate(finHoy.getDate() + 1);

  const ventasHoy = await prisma.sale.findMany({
    where: {
      fecha: {
        gte: inicioHoy,
        lt: finHoy
      }
    }
  });

  return {
    ventasDia: ventasHoy.reduce((sum, v) => sum + v.total, 0)
  };
});

/* =========================================================
   FIN – ESTE ARCHIVO YA ES ESTABLE
========================================================= */
