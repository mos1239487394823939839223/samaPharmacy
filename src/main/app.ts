/**
 * Application lifecycle management
 */

import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { PrinterService } from './printer-service';
import { setupIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let printerService: PrinterService | null = null;

export function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload.js'),
    },
  });

  // In development, load from file; in production from packaged assets
  const filePath = path.join(__dirname, '../renderer/index.html');
  const url = `file://${filePath}`;
  console.log('Loading URL:', url);
  mainWindow.loadFile(filePath).catch(e => console.error('Failed to load:', e));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

export function initPrinter(): void {
  const queueFile = path.join(app.getPath('userData'), 'print-queue.json');
  printerService = new PrinterService(
    {
      transport: 'network',
      host: '192.168.1.50',
      port: 9100,
      paperWidth: 80,
      drawerPin: 'auto',
    },
    queueFile
  );

  printerService.on('event', (event) => {
    if (mainWindow) {
      mainWindow.webContents.send('printer:event', event);
    }
  });

  void printerService.init();
  setupIpcHandlers(printerService);
}

export function createMenu(): void {
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

export function dispose(): void {
  printerService?.dispose();
}
