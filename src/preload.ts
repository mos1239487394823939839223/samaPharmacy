/**
 * Preload script for context isolation
 */

import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  printer: {
    printReceipt: (data: any) => ipcRenderer.invoke('printer:receipt', data),
    openDrawer: (pin?: 2 | 5) => ipcRenderer.invoke('printer:drawer', pin),
    test: () => ipcRenderer.invoke('printer:test'),
    status: () => ipcRenderer.invoke('printer:status'),
    subscribe: (callback: (event: any) => void) => {
      ipcRenderer.on('printer:event', (_, data) => callback(data));
      ipcRenderer.send('printer:subscribe');
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
