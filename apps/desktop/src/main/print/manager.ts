/**
 * Print manager (main process) — one entry point for every receipt.
 *
 * Two routes:
 *   * 'system'  — the Windows driver of a named printer. Works with any
 *                 printer that has a driver (thermal roll or A5/A4 laser);
 *                 Chromium shapes the Arabic. No cash-drawer kick.
 *   * 'network' / 'share' — raw ESC/POS: the HTML is rasterised to a 1-bit
 *                 image (escpos.ts, guards P1–P10) and the drawer can open.
 *
 * Printing never blocks a sale (hardware doc §2.5): the renderer calls
 * print.receipt AFTER checkout committed; this returns immediately and the
 * job runs in the background. Failures are reported as events (toast on the
 * till) and kept for "retry failed" — the sale itself is already safe.
 */

import { BrowserWindow, type WebContents } from 'electron';
import path from 'node:path';
import type { PrinterSettings, PrinterStatus } from '@pharmacy/shared';
import { PrinterService, type PrinterConfig, type PrinterEvent } from './escpos';
import { fallbackText } from './receipt-html';

type Notify = (event: { level: 'info' | 'warn' | 'error'; code: string; detail?: string }) => void;

interface FailedJob {
  id: string;
  html: string;
  copies: number;
  lastError: string;
  createdAt: string;
}

export class PrintManager {
  private settings: PrinterSettings | null = null;
  private escpos: PrinterService | null = null;
  private failed: FailedJob[] = [];
  private lastMessage: string | null = null;
  private systemChain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly queueFile: string,
    private readonly notify: Notify
  ) {}

  configure(settings: PrinterSettings): void {
    this.settings = settings;
    this.escpos?.dispose();
    this.escpos = null;
    if (settings.mode === 'network' || settings.mode === 'share') {
      const cfg: PrinterConfig =
        settings.mode === 'network'
          ? { transport: 'network', host: settings.host, port: settings.port, paperWidth: settings.paperWidth, drawerPin: settings.drawerPin }
          : { transport: 'share', shareName: settings.shareName, paperWidth: settings.paperWidth, drawerPin: settings.drawerPin };
      this.escpos = new PrinterService(cfg, this.queueFile);
      this.escpos.on('event', (e: PrinterEvent) => this.onEscposEvent(e));
      void this.escpos.init();
    }
  }

  private onEscposEvent(e: PrinterEvent): void {
    if (e.type === 'paper_out') this.report('error', 'print.paperOut');
    else if (e.type === 'dead') this.report('error', 'print.failed', e.message);
    else if (e.type === 'error') this.report('warn', 'print.retrying', e.message);
    else if (e.type === 'warn') this.lastMessage = e.message;
    else if (e.type === 'fallback') this.report('warn', 'print.fallback');
  }

  private report(level: 'info' | 'warn' | 'error', code: string, detail?: string): void {
    this.lastMessage = detail ?? code;
    this.notify({ level, code, detail });
  }

  isEnabled(): boolean {
    return Boolean(this.settings && this.settings.mode !== 'none');
  }

  /** Queue a receipt. Returns at once; never throws for a printer fault. */
  print(html: string, opts: { openDrawer?: boolean; fallback?: Parameters<typeof fallbackText>[0] } = {}): void {
    const s = this.settings;
    if (!s || s.mode === 'none') return;
    if (this.escpos) {
      this.escpos.enqueue({
        kind: 'receipt',
        html,
        copies: s.copies,
        openDrawer: Boolean(opts.openDrawer && s.openDrawer),
        fallbackText: opts.fallback ? fallbackText(opts.fallback) : undefined,
      });
      return;
    }
    this.enqueueSystem(html, s.copies);
  }

  private enqueueSystem(html: string, copies: number, id = `${Date.now()}`): void {
    this.systemChain = this.systemChain
      .then(() => this.printViaDriver(html, copies))
      .catch((err: Error) => {
        this.failed.push({ id, html, copies, lastError: err.message, createdAt: new Date().toISOString() });
        this.report('error', 'print.failed', err.message);
      });
  }

  /** Render offscreen and print silently through the Windows driver of the configured printer. */
  private async printViaDriver(html: string, copies: number): Promise<void> {
    const s = this.settings!;
    const win = new BrowserWindow({
      show: false,
      width: s.format === 'a5' ? 560 : s.paperWidth === 58 ? 384 : 576,
      height: 800,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
      const heightPx = (await win.webContents.executeJavaScript('document.documentElement.scrollHeight')) as number;
      // Roll paper: page as tall as the receipt (px at 96 dpi → microns).
      const pageSize =
        s.format === 'a5'
          ? ('A5' as const)
          : { width: s.paperWidth * 1000, height: Math.max(50_000, Math.ceil((heightPx / 96) * 25_400) + 5_000) };
      await new Promise<void>((resolve, reject) => {
        win.webContents.print(
          {
            silent: true,
            deviceName: s.deviceName || undefined,
            printBackground: true,
            copies,
            margins: { marginType: s.format === 'a5' ? 'default' : 'none' },
            pageSize,
          },
          (success, reason) => (success ? resolve() : reject(new Error(reason || 'print failed')))
        );
      });
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  }

  async openDrawer(): Promise<void> {
    if (!this.escpos) throw new Error('drawer-unsupported');
    await this.escpos.openDrawer();
  }

  status(): PrinterStatus {
    const dead = this.escpos?.deadLetters() ?? [];
    return {
      pending: this.escpos?.pending() ?? 0,
      failed: [
        ...dead.map((j) => ({ id: j.id, lastError: j.lastError ?? '', createdAt: j.createdAt })),
        ...this.failed.map((j) => ({ id: j.id, lastError: j.lastError, createdAt: j.createdAt })),
      ],
      lastMessage: this.lastMessage,
    };
  }

  retryFailed(): void {
    this.escpos?.requeueAll();
    const jobs = this.failed.splice(0);
    for (const j of jobs) this.enqueueSystem(j.html, j.copies, j.id);
  }

  async listPrinters(contents: WebContents): Promise<string[]> {
    const printers = await contents.getPrintersAsync();
    return printers.map((p) => p.name);
  }

  dispose(): void {
    this.escpos?.dispose();
  }
}

export function printQueueFile(userData: string): string {
  return path.join(userData, 'print-queue.json');
}
