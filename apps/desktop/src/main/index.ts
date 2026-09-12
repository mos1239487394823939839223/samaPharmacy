/**
 * Electron main process.
 *
 * Owns the window, the application menu, and the database utilityProcess. Holds
 * no database handle of its own.
 */

import { app, BrowserWindow, Menu, ipcMain, session, dialog } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { IPC, IPC_EVENTS, type DbRequest } from '@pharmacy/shared';
import { DbClient } from './db-client';

const db = new DbClient();
let mainWindow: BrowserWindow | null = null;

/**
 * Set CSP from here rather than a meta tag in index.html.
 *
 * Vite's dev server injects an inline react-refresh script and opens an HMR
 * websocket. A strict `default-src 'self'` blocks both, and the failure is
 * silent: the window loads and renders nothing. Production keeps the strict
 * policy because none of that machinery is present.
 */
function setResponseCsp(): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL;

  const policy = devUrl
    ? "default-src 'self' 'unsafe-inline' data:; " +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${devUrl}; ` +
      `connect-src 'self' ${devUrl} ws://localhost:* http://localhost:*; ` +
      `style-src 'self' 'unsafe-inline'; font-src 'self' data: ${devUrl};`
    : "default-src 'self'; script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; font-src 'self' data:;";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  // Chromium binds Ctrl+N, Ctrl+Shift+N and Ctrl+Shift+T by default. Those are
  // three of the app's own shortcuts (blueprint §2.7), so the default menu has
  // to go before any accelerator is registered.
  Menu.setApplicationMenu(null);
  setResponseCsp();

  // Both entries are built under out/main/, so this is a sibling directory —
  // not '../db-process', which would resolve outside out/main entirely.
  const dbProcessPath = path.join(__dirname, 'db-process/index.js');
  const databasePath = path.join(app.getPath('userData'), 'pharmacy.db');
  // Dev: out/main/ -> project root is two levels up.
  // Packaged: migrations ship as an extraResource, outside the asar.
  const migrationsDir = app.isPackaged
    ? path.join(process.resourcesPath, 'migrations')
    : path.join(__dirname, '../../packages/db/migrations');

  await db.start(dbProcessPath, databasePath, migrationsDir);

  ipcMain.handle(IPC.dbRequest, async (_event, request: DbRequest) => {
    // File dialogs need the main process — the db process has no window, and
    // the renderer must never touch the filesystem (rule 5).
    if (request.kind === 'import.pickFile') {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls', 'txt'] }],
      });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    }

    if (request.kind === 'import.saveRejects') {
      const result = await dialog.showSaveDialog({
        defaultPath: 'rejected-rows.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (result.canceled || !result.filePath) return null;
      // BOM so Excel opens the Arabic reasons as UTF-8 rather than mojibake.
      await writeFile(result.filePath, '\uFEFF' + request.csv, 'utf8');
      return result.filePath;
    }

    return db.request(request);
  });

  // Relay db-process progress to the window.
  db.onProgress((channel, data) => {
    if (channel === 'import') {
      mainWindow?.webContents.send(IPC_EVENTS.importProgress, data);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => db.stop());
