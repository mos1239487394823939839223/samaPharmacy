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

app.whenReady().then(() => {
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

  // Spawning the db utilityProcess (native module load + migrations) and
  // creating/loading the window are independent — the renderer's first
  // paint does not need the database, and every screen already renders a
  // loading state while its own IPC calls are in flight. Starting them
  // concurrently instead of awaiting the database first (measured ~110ms
  // on this machine) overlaps that cost with window/renderer startup
  // instead of adding to it. The IPC handler below is registered
  // immediately, before `dbReady` resolves — it awaits `dbReady`
  // internally for any request that actually touches the database, so an
  // early renderer call queues behind it rather than failing with "no
  // handler registered."
  const dbReady = db.start(dbProcessPath, databasePath, migrationsDir);
  // A rejection here is real and must still surface — to whichever IPC call
  // first awaits it — but Node treats an unawaited rejected promise as an
  // "unhandled rejection" the moment it settles, before any handler has had
  // a chance to await it. This silences that spurious warning without
  // swallowing the error itself.
  dbReady.catch(() => {});

  ipcMain.handle(IPC.dbRequest, async (_event, request: DbRequest) => {
    // File dialogs need the main process — the db process has no window, and
    // the renderer must never touch the filesystem (rule 5). Neither touches
    // the database, so neither needs to wait on dbReady.
    if (request.kind === 'import.pickFile') {
      // Unparented (no BrowserWindow passed), a native dialog on macOS opens
      // as its own independent, non-modal window instead of a sheet on the
      // app's window — it can open behind the main window or not visibly
      // steal focus, which reads as "I clicked the button and nothing
      // happened." Passing mainWindow attaches it as a proper sheet.
      const result = mainWindow
        ? await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls', 'txt'] }],
          })
        : await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Spreadsheets', extensions: ['csv', 'xlsx', 'xls', 'txt'] }],
          });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    }

    if (request.kind === 'import.saveRejects') {
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'rejected-rows.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          })
        : await dialog.showSaveDialog({
            defaultPath: 'rejected-rows.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          });
      if (result.canceled || !result.filePath) return null;
      // BOM so Excel opens the Arabic reasons as UTF-8 rather than mojibake.
      await writeFile(result.filePath, '\uFEFF' + request.csv, 'utf8');
      return result.filePath;
    }

    await dbReady;
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
