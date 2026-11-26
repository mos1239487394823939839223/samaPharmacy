/**
 * Electron main process.
 *
 * Owns the window, the application menu, and the database utilityProcess. Holds
 * no database handle of its own.
 */

import { app, BrowserWindow, Menu, ipcMain, session, dialog } from 'electron';
import { appendFileSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  IPC,
  IPC_EVENTS,
  encodeAppError,
  type DbRequest,
  type PharmacyProfile,
  type PrinterSettings,
  type PharmacySettings,
  type PrintableDocument,
} from '@pharmacy/shared';
import { DbClient } from './db-client';
import { PrintManager, printQueueFile } from './print/manager';
import { receiptHtml, testReceiptData, type ReceiptData } from './print/receipt-html';
import { documentHtml, documentTitle } from './print/document-html';

const db = new DbClient();
let mainWindow: BrowserWindow | null = null;

/**
 * Files the user picked in the import dialog. import.preview/apply only
 * accept these — the renderer cannot name an arbitrary path on the disk.
 */
const pickedImportFiles = new Set<string>();

function appError(code: string, message: string, params: Record<string, string | number | null> = {}): Error {
  return new Error(encodeAppError({ code, params, message }));
}

/** Append-only diagnostics log in userData/logs (no customer data is written here). */
function logLine(line: string): void {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    mkdirSync(dir, { recursive: true });
    const day = new Date();
    const name = `main-${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}.log`;
    appendFileSync(path.join(dir, name), `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    // Logging must never take the app down.
  }
}

// One instance only: two copies would run two database processes on the
// same file, and a pharmacist double-clicking the shortcut is routine.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

process.on('uncaughtException', (err) => logLine(`uncaughtException: ${err.stack ?? err.message}`));
process.on('unhandledRejection', (err) => logLine(`unhandledRejection: ${String(err)}`));

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
    // Small enough for a half-screen window or a small tablet — the layout adapts.
    minWidth: 360,
    minHeight: 520,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());

  // The app never navigates away from its own page or opens new windows.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (!devUrl || !url.startsWith(devUrl)) event.preventDefault();
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    logLine(`renderer gone: ${details.reason}`);
    if (details.reason !== 'clean-exit') mainWindow?.reload();
  });
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
  if (!gotSingleInstanceLock) return;
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
  const backupDir = path.join(app.getPath('userData'), 'backups');
  db.onLog(logLine);
  const dbReady = db.start(dbProcessPath, { databasePath, migrationsDir, backupDir });
  // A rejection here is real and must still surface — to whichever IPC call
  // first awaits it — but Node treats an unawaited rejected promise as an
  // "unhandled rejection" the moment it settles, before any handler has had
  // a chance to await it. This silences that spurious warning without
  // swallowing the error itself.
  dbReady.catch(() => {});

  const printer = new PrintManager(printQueueFile(app.getPath('userData')), (e) => {
    logLine(`printer ${e.level}: ${e.code} ${e.detail ?? ''}`);
    mainWindow?.webContents.send(IPC_EVENTS.printerEvent, e);
  });

  /** Load printer settings (and the receipt header) from the database. */
  async function refreshPrinter(): Promise<{ pharmacy: PharmacyProfile; printer: PrinterSettings; returnWindowDays: number }> {
    const settings = await db.request<{ pharmacy: PharmacyProfile; printer: PrinterSettings; salesReturnWindowDays: number }>(
      { kind: 'settings.get' }
    );
    printer.configure(settings.printer);
    return { pharmacy: settings.pharmacy, printer: settings.printer, returnWindowDays: settings.salesReturnWindowDays };
  }
  void dbReady.then(() => refreshPrinter()).catch((err: Error) => logLine(`printer config: ${err.message}`));

  ipcMain.handle(IPC.dbRequest, async (_event, request: DbRequest) => {
    try {
      return await handleRequest(request);
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      // An error that already carries a code passes through untouched; any
      // other failure (process down, dialog error) gets the generic code.
      if (!message.includes('APPERR:')) {
        logLine(`request ${request.kind} failed: ${message}`);
        throw new Error(encodeAppError({ code: 'internal', params: {}, message }));
      }
      throw err;
    }
  });

  /**
   * A4 preview in its own window; its «طباعة» button opens the system print
   * dialog. A separate session partition keeps the app's strict CSP (and
   * its preload bridge) out of a page that only shows printable HTML.
   */
  function openDocumentPreview(html: string, title: string): void {
    const win = new BrowserWindow({
      parent: mainWindow ?? undefined,
      width: 920,
      height: 1000,
      title,
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, partition: 'print-preview' },
    });
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }

  async function handleRequest(request: DbRequest): Promise<unknown> {
    // ---- printing & files ----------------------------------------------
    if (request.kind === 'print.receipt') {
      await dbReady;
      const data = await db.request<{ receipt: ReceiptData; pharmacy: PharmacyProfile; printer: PrinterSettings }>(
        { kind: 'sales.receipt', id: request.invoiceId }
      );
      const cfg = await refreshPrinter();
      if (!printer.isEnabled()) throw appError('print.notConfigured', 'No printer configured');
      // After commit, never inside it (P9): this call is made by the renderer
      // once checkout has returned.
      printer.print(receiptHtml(data.receipt, data.pharmacy, data.printer, { reprint: request.reprint, returnWindowDays: cfg.returnWindowDays }), {
        openDrawer: !request.reprint && data.receipt.invoiceType === 'cash',
        fallback: data.receipt,
      });
      return undefined;
    }
    if (request.kind === 'print.document') {
      await dbReady;
      const [doc, settings] = await Promise.all([
        db.request<PrintableDocument>({ kind: 'documents.get', doc: request.doc, id: request.id }),
        db.request<PharmacySettings>({ kind: 'settings.get' }),
      ]);
      openDocumentPreview(documentHtml(doc, settings.pharmacy), documentTitle(doc));
      return undefined;
    }
    if (request.kind === 'print.test') {
      await dbReady;
      const cfg = await refreshPrinter();
      if (!printer.isEnabled()) throw appError('print.notConfigured', 'No printer configured');
      printer.print(receiptHtml(testReceiptData(), cfg.pharmacy, cfg.printer, { returnWindowDays: cfg.returnWindowDays }));
      return undefined;
    }
    if (request.kind === 'print.status') return printer.status();
    if (request.kind === 'print.retryFailed') {
      printer.retryFailed();
      return undefined;
    }
    if (request.kind === 'print.openDrawer') {
      try {
        await printer.openDrawer();
      } catch {
        throw appError('print.drawerUnsupported', 'Drawer needs a network/shared ESC/POS printer');
      }
      logLine('drawer opened manually');
      return undefined;
    }
    if (request.kind === 'print.listPrinters') {
      return mainWindow ? printer.listPrinters(mainWindow.webContents) : [];
    }
    if (request.kind === 'file.saveCsv') {
      const options = {
        defaultPath: request.defaultName.replace(/[\\/:*?"<>|]/g, '-'),
        filters: [{ name: 'CSV (Excel)', extensions: ['csv'] }],
      };
      const result = mainWindow ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, '\uFEFF' + request.csv, 'utf8');
      return result.filePath;
    }

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
      const picked = result.canceled ? null : (result.filePaths[0] ?? null);
      if (picked) pickedImportFiles.add(picked);
      return picked;
    }

    if (request.kind === 'import.preview' || request.kind === 'import.apply') {
      if (!pickedImportFiles.has(request.filePath)) {
        throw new Error(encodeAppError({ code: 'import.fileNotPicked', params: {}, message: 'File was not chosen in the dialog' }));
      }
    }

    if (request.kind === 'backup.pickFolder') {
      const options = { properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'> };
      const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
      return result.canceled ? null : (result.filePaths[0] ?? null);
    }

    if (request.kind === 'backup.restore') {
      let filePath = request.filePath;
      if (!filePath) {
        const options = {
          defaultPath: backupDir,
          properties: ['openFile'] as Array<'openFile'>,
          filters: [{ name: 'Pharmacy backup', extensions: ['db'] }],
        };
        const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
        if (result.canceled || !result.filePaths[0]) return null;
        filePath = result.filePaths[0];
      }
      await dbReady;
      await db.request({ kind: 'backup.restore', filePath });
      logLine(`database restored from ${filePath}`);
      // Every screen holds state from the old database — start them fresh.
      setTimeout(() => mainWindow?.reload(), 300);
      return true;
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
    const result = await db.request(request);
    if (request.kind === 'settings.update') void refreshPrinter().catch(() => undefined);
    return result;
  }

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

// The db process takes a closing backup and closes the file cleanly before
// the app exits (spec M11: "automatic on close").
let quitting = false;
app.on('before-quit', (event) => {
  if (quitting) return;
  quitting = true;
  event.preventDefault();
  void db
    .shutdown()
    .catch((err: Error) => logLine(`shutdown failed: ${err.message}`))
    .finally(() => app.exit(0));
});
