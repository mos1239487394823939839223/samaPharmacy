/**
 * IPC handlers for main process communication
 */

import { ipcMain, IpcMainEvent } from 'electron';
import { PrinterService, type PrintJob } from './printer-service';

export interface IpcHandlers {
  printReceipt: (data: any) => Promise<string>;
  openDrawer: (pin?: 2 | 5) => Promise<void>;
  testPrinter: () => Promise<void>;
  getPrinterStatus: () => Promise<any>;
  getPrinterDiagnostics: () => any;
}

let printerService: PrinterService | null = null;

export function setupIpcHandlers(printer: PrinterService): void {
  printerService = printer;

  ipcMain.handle('printer:receipt', async (_, data: any) => {
    if (!printerService) throw new Error('Printer service not initialized');
    return printerService.enqueue({
      kind: 'receipt',
      html: receiptHtml(data),
      fallbackText: fallbackText(data),
      openDrawer: true,
      copies: 1,
    });
  });

  ipcMain.handle('printer:drawer', async () => {
    if (!printerService) throw new Error('Printer service not initialized');
    await printerService.openDrawer();
  });

  ipcMain.handle('printer:test', async () => {
    if (!printerService) throw new Error('Printer service not initialized');
    return printerService.verify();
  });

  ipcMain.handle('printer:status', async () => {
    if (!printerService) throw new Error('Printer service not initialized');
    // Return basic status
    return { reachable: true, paperOut: null };
  });

  ipcMain.on('printer:subscribe', (event: IpcMainEvent) => {
    if (!printerService) return;
    const handler = (data: any) => {
      event.reply('printer:event', data);
    };
    printerService.on('event', handler);
    event.sender.on('destroyed', () => {
      printerService?.off('event', handler);
    });
  });
}

function receiptHtml(data: any): string {
  // Placeholder — implement using escpos-printer.receiptHtml
  return '<html><body>Receipt</body></html>';
}

function fallbackText(data: any): string {
  // Placeholder — implement using escpos-printer.fallbackText
  return `Invoice: ${data.serial}`;
}
