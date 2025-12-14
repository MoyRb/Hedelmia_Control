import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

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

  const isDev = !app.isPackaged; // ✅ reemplazo de electron-is-dev

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
  const dbPath = path.join(app.getPath('userData'), 'hedelmia.db');
  fs.copyFileSync(dbPath, destino);
  return { ok: true };
});

ipcMain.handle('ventas:list', async () => {
  return prisma.sale.findMany({ include: { items: true } });
});
