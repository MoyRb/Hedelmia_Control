import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hedelmia', {
  listarVentas: () => ipcRenderer.invoke('ventas:list'),
  exportarBackup: (destino: string) => ipcRenderer.invoke('backup:export', destino)
});

declare global {
  interface Window {
    hedelmia: {
      listarVentas: () => Promise<unknown>;
      exportarBackup: (destino: string) => Promise<{ ok: boolean }>;
    };
  }
}
