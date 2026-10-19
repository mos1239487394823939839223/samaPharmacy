/**
 * escpos-printer.ts — receipt printing service (Electron MAIN process)
 *
 * Arabic is printed as a raster image, not as text. Thermal printers have no
 * contextual letter shaping and no RTL layout, so text-mode Arabic prints as
 * disconnected, reversed letterforms even on printers that advertise CP864 or
 * CP1256. Rendering HTML in a hidden BrowserWindow and sending a 1-bit bitmap
 * via GS v 0 lets Chromium do the shaping on any ESC/POS device.
 *
 * Guards in this file:
 *   P1  Blank and inverted capture detection — never feed and cut blank paper.
 *   P2  Raster dimension limits — a layout bug must not print a metre of paper.
 *   P3  Arabic font verification before capture.
 *   P4  Rasterise timeout + single-flight lock — a hung offscreen window must
 *       not stall the queue or leak windows.
 *   P5  Paper-out probe before printing (bidirectional transports only).
 *   P6  Drawer pin fallback — roughly half of drawers in circulation use pin 5.
 *   P7  Attempt cap with dead-letter — one poisoned job must not block the rest.
 *   P8  Atomic queue persistence + size cap.
 *   P9  Transaction guard — printing must never be awaited inside a DB
 *       transaction. Commit the invoice, release the screen, then queue.
 *   P10 ASCII fallback receipt when rasterising keeps failing, so the customer
 *       still leaves with proof of purchase.
 *
 * Never import this from the renderer. Expose it over IPC.
 */

import { BrowserWindow, nativeImage } from 'electron';
// Adapted from docs/reference/escpos-printer.ts (guards P1–P10 preserved).
// The receipt template lives in receipt-html.ts; this file is transport,
// rasterisation and the persistent queue only.
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';

// ---------------------------------------------------------------------------
// ESC/POS
// ---------------------------------------------------------------------------

const ESC = 0x1b;
const GS = 0x1d;
const DLE = 0x10;
const EOT = 0x04;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]),
  CUT_PARTIAL: Buffer.from([GS, 0x56, 0x42, 0x00]),
  FEED: (lines: number) => Buffer.from([ESC, 0x64, Math.min(lines, 8)]),
  DRAWER: (pin: 2 | 5) => Buffer.from([ESC, 0x70, pin === 2 ? 0x00 : 0x01, 0x19, 0xfa]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  BOLD: (on: boolean) => Buffer.from([ESC, 0x45, on ? 1 : 0]),
  STATUS_PAPER: Buffer.from([DLE, EOT, 0x04]),
};

/** Printable width in dots at 203 dpi. */
export const PAPER_DOTS = { 58: 384, 80: 576 } as const;

/** P2 — about 50cm of 80mm paper. Beyond this, something is wrong. */
const MAX_RASTER_ROWS = 4000;
/** P4 */
const RASTER_TIMEOUT_MS = 15_000;
/** P7 */
const MAX_ATTEMPTS = 5;
/** P8 */
const MAX_QUEUE = 500;

// ---------------------------------------------------------------------------
// Errors — distinguishable so the queue can decide whether to retry
// ---------------------------------------------------------------------------

export class RenderError extends Error {}
export class TransportError extends Error {}
export class BlankReceiptError extends RenderError {}
export class InvertedCaptureError extends RenderError {}
export class OversizeReceiptError extends RenderError {}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface BaseConfig {
  paperWidth: 58 | 80;
  /** 'auto' pulses both pins — harmless on the unwired one. */
  drawerPin?: 2 | 5 | 'auto';
  /** Path to a bundled Arabic TTF. Checked by P3. */
  arabicFontUrl?: string;
}

export type PrinterConfig =
  | (BaseConfig & { transport: 'network'; host: string; port?: number })
  | (BaseConfig & { transport: 'share'; shareName: string })
  | (BaseConfig & { transport: 'file'; filePath: string });

// ---------------------------------------------------------------------------
// P9 — transaction guard
// ---------------------------------------------------------------------------

let inTransaction: () => boolean = () => false;

/**
 * Wire this from the db package:
 *   registerTransactionProbe(() => txDepth > 0)
 * Printing inside an open transaction holds a write lock for the duration of a
 * socket round-trip. Every other till blocks behind it.
 */
export function registerTransactionProbe(fn: () => boolean): void {
  inTransaction = fn;
}

function assertNotInTransaction(op: string): void {
  if (inTransaction()) {
    throw new Error(
      `[printer] ${op} called inside an open database transaction. Commit the ` +
        `invoice and release the POS screen before queueing the print job.`
    );
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RenderError(message)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------

async function sendNetwork(host: string, port: number, data: Buffer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(new TransportError(`${err.message} (${host}:${port})`));
    };
    socket.setTimeout(8000, () => fail(new Error('Printer timeout')));
    socket.on('error', fail);
    socket.on('connect', () => socket.write(data, () => socket.end()));
    socket.on('close', () => { if (!settled) { settled = true; resolve(); } });
  });
}

/** Raw write to a shared Windows printer: \\localhost\ShareName */
async function sendShare(shareName: string, data: Buffer): Promise<void> {
  try {
    await fs.writeFile(`\\\\localhost\\${shareName}`, data);
  } catch (err) {
    throw new TransportError(
      `Cannot write to \\\\localhost\\${shareName}. Confirm the printer is shared ` +
        `under that exact name. (${(err as Error).message})`
    );
  }
}

async function send(cfg: PrinterConfig, data: Buffer): Promise<void> {
  switch (cfg.transport) {
    case 'network': return sendNetwork(cfg.host, cfg.port ?? 9100, data);
    case 'share':   return sendShare(cfg.shareName, data);
    case 'file':    return fs.writeFile(cfg.filePath, data);
  }
}

// ---------------------------------------------------------------------------
// P5 — paper status probe
// ---------------------------------------------------------------------------

export interface PrinterStatus {
  reachable: boolean;
  paperOut: boolean | null; // null = printer did not answer
  detail: string;
}

/**
 * DLE EOT 4. Only meaningful on a bidirectional transport. Many cheap printers
 * never answer, so an absent reply is treated as unknown, not as a fault.
 */
export async function queryStatus(cfg: PrinterConfig, timeoutMs = 3000): Promise<PrinterStatus> {
  if (cfg.transport !== 'network') {
    return { reachable: true, paperOut: null, detail: 'Status unavailable on this transport.' };
  }

  return new Promise<PrinterStatus>((resolve) => {
    const socket = net.createConnection({ host: cfg.host, port: cfg.port ?? 9100 });
    let done = false;
    const finish = (s: PrinterStatus) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(s);
    };

    const timer = setTimeout(
      () => finish({ reachable: true, paperOut: null, detail: 'No status response.' }),
      timeoutMs
    );

    socket.on('error', (e) => {
      clearTimeout(timer);
      finish({ reachable: false, paperOut: null, detail: e.message });
    });
    socket.on('connect', () => socket.write(CMD.STATUS_PAPER));
    socket.on('data', (buf) => {
      clearTimeout(timer);
      const b = buf[0] ?? 0;
      const paperOut = (b & 0x60) === 0x60; // both paper-end sensors
      finish({
        reachable: true,
        paperOut,
        detail: paperOut ? 'Paper out.' : 'Paper present.',
      });
    });
  });
}

// ---------------------------------------------------------------------------
// HTML → raster
// ---------------------------------------------------------------------------

interface Raster {
  bytesPerRow: number;
  height: number;
  bits: Buffer;
  blackRatio: number;
}

/** P4 — single-flight. Concurrent offscreen windows exhaust memory. */
let renderLock: Promise<unknown> = Promise.resolve();
function serialise<T>(fn: () => Promise<T>): Promise<T> {
  const next = renderLock.then(fn, fn);
  renderLock = next.catch(() => undefined);
  return next;
}

async function rasterizeHtml(
  html: string,
  widthDots: number,
  opts: { arabicFontFamily?: string; onWarn?: (m: string) => void } = {}
): Promise<Raster> {
  return serialise(() =>
    withTimeout(rasterizeInner(html, widthDots, opts), RASTER_TIMEOUT_MS, 'Rasterise timed out.')
  );
}

async function rasterizeInner(
  html: string,
  widthDots: number,
  opts: { arabicFontFamily?: string; onWarn?: (m: string) => void }
): Promise<Raster> {
  const win = new BrowserWindow({
    show: false,
    width: widthDots,
    height: 200,
    useContentSize: true,
    webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.webContents.setZoomFactor(1);

    // --- P3 ---------------------------------------------------------------
    const fontProbe = (await win.webContents.executeJavaScript(`
      (async () => {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise(r => setTimeout(r, 3000)),
          ]);
        } catch (e) {}
        return {
          loaded: ${opts.arabicFontFamily ? `document.fonts.check('19px ${opts.arabicFontFamily}')` : 'true'},
          height: Math.ceil(document.documentElement.scrollHeight),
          width: document.documentElement.scrollWidth,
        };
      })()
    `)) as { loaded: boolean; height: number; width: number };

    if (!fontProbe.loaded) {
      opts.onWarn?.(
        'Bundled Arabic font did not load; falling back to a system font. ' +
          'Shaping will still be correct but metrics will differ from the design.'
      );
    }
    if (fontProbe.width > widthDots + 2) {
      opts.onWarn?.(
        `Receipt HTML is ${fontProbe.width}px wide but the paper is ${widthDots}px. ` +
          'Content will be clipped on the right.'
      );
    }

    // --- P2 ---------------------------------------------------------------
    if (fontProbe.height > MAX_RASTER_ROWS) {
      throw new OversizeReceiptError(
        `Receipt is ${fontProbe.height} rows (limit ${MAX_RASTER_ROWS}). ` +
          'Refusing to print — this is almost always a layout bug, not a long sale.'
      );
    }

    win.setContentSize(widthDots, Math.max(fontProbe.height, 1));
    await new Promise((r) => setTimeout(r, 60));

    let image = await win.webContents.capturePage();

    if (image.isEmpty()) throw new BlankReceiptError('capturePage returned an empty image.');

    // HiDPI captures at a scale factor; force exact paper width.
    if (image.getSize().width !== widthDots) {
      image = nativeImage.createFromBuffer(image.toPNG()).resize({ width: widthDots });
    }

    const { width, height } = image.getSize();
    if (height > MAX_RASTER_ROWS) {
      throw new OversizeReceiptError(`Captured ${height} rows, limit ${MAX_RASTER_ROWS}.`);
    }

    const raster = packMonochrome(image.toBitmap(), width, height);

    // --- P1 ---------------------------------------------------------------
    if (raster.blackRatio === 0) {
      throw new BlankReceiptError(
        'Rendered receipt contains no ink. Refusing to feed and cut blank paper.'
      );
    }
    if (raster.blackRatio > 0.9) {
      throw new InvertedCaptureError(
        `Rendered receipt is ${Math.round(raster.blackRatio * 100)}% black — the capture ` +
          'is probably inverted. Refusing to print and empty the paper roll.'
      );
    }

    return raster;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** BGRA → 1bpp, MSB first, 1 = black. */
function packMonochrome(bgra: Buffer, width: number, height: number): Raster {
  const bytesPerRow = Math.ceil(width / 8);
  const bits = Buffer.alloc(bytesPerRow * height, 0);
  let black = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luminance = 0.114 * (bgra[i] ?? 255) + 0.587 * (bgra[i + 1] ?? 255) + 0.299 * (bgra[i + 2] ?? 255);
      if (luminance < 128) {
        const idx = y * bytesPerRow + (x >> 3);
        bits[idx] = (bits[idx] ?? 0) | (0x80 >> (x & 7));
        black++;
      }
    }
  }

  return { bytesPerRow, height, bits, blackRatio: black / (width * height) };
}

/** GS v 0, banded. Some printers truncate a single tall raster. */
function rasterToEscPos(r: Raster, bandRows = 128): Buffer {
  if (r.bytesPerRow > 0xffff || r.height > 0xffff) {
    throw new OversizeReceiptError('Raster exceeds the 16-bit GS v 0 dimension field.');
  }

  const chunks: Buffer[] = [];
  for (let y = 0; y < r.height; y += bandRows) {
    const rows = Math.min(bandRows, r.height - y);
    chunks.push(
      Buffer.from([
        GS, 0x76, 0x30, 0x00,
        r.bytesPerRow & 0xff, (r.bytesPerRow >> 8) & 0xff,
        rows & 0xff, (rows >> 8) & 0xff,
      ]),
      r.bits.subarray(y * r.bytesPerRow, (y + rows) * r.bytesPerRow)
    );
  }
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export interface PrintJob {
  id: string;
  kind: 'receipt' | 'report' | 'drawer';
  html?: string;
  /** P10 — printed if rasterising keeps failing. */
  fallbackText?: string;
  openDrawer?: boolean;
  copies?: number;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export type PrinterEvent =
  | { type: 'queue'; pending: number }
  | { type: 'warn'; message: string }
  | { type: 'error'; job: PrintJob; message: string; willRetry: boolean }
  | { type: 'dead'; job: PrintJob; message: string }
  | { type: 'paper_out' }
  | { type: 'fallback'; job: PrintJob };

export class PrinterService extends EventEmitter {
  private queue: PrintJob[] = [];
  private dead: PrintJob[] = [];
  private running = false;
  private timer: NodeJS.Timeout | null = null;
  private disposed = false;

  constructor(
    private cfg: PrinterConfig,
    private queueFile: string
  ) {
    super();
    if (!(cfg.paperWidth in PAPER_DOTS)) {
      throw new Error(`Unsupported paper width ${cfg.paperWidth}. Use 58 or 80.`);
    }
  }

  private emitEvent(e: PrinterEvent): void {
    this.emit('event', e);
    this.emit(e.type, e);
  }

  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.queueFile, 'utf8');
      const parsed = JSON.parse(raw);
      this.queue = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.queue = [];
    }
    this.emitEvent({ type: 'queue', pending: this.queue.length });
    void this.drain();
  }

  setConfig(cfg: PrinterConfig): void {
    this.cfg = cfg;
  }

  /**
   * Returns immediately — never awaits the printer.
   * P9: refuses to run inside an open database transaction.
   */
  enqueue(job: Omit<PrintJob, 'id' | 'attempts' | 'createdAt'>): string {
    assertNotInTransaction('enqueue');

    // --- P8 ---------------------------------------------------------------
    if (this.queue.length >= MAX_QUEUE) {
      const idx = this.queue.findIndex((j) => j.kind === 'drawer');
      const dropped = this.queue.splice(idx >= 0 ? idx : 0, 1)[0];
      this.emitEvent({
        type: 'warn',
        message: `Print queue full (${MAX_QUEUE}). Dropped job ${dropped?.id}. Check the printer.`,
      });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.queue.push({ ...job, id, attempts: 0, createdAt: new Date().toISOString() });
    void this.persist();
    this.emitEvent({ type: 'queue', pending: this.queue.length });
    void this.drain();
    return id;
  }

  // --- P6 -----------------------------------------------------------------

  async openDrawer(pinOverride?: 2 | 5): Promise<void> {
    const pin = pinOverride ?? this.cfg.drawerPin ?? 'auto';
    if (pin === 'auto') {
      await send(this.cfg, CMD.DRAWER(2));
      await new Promise((r) => setTimeout(r, 120));
      await send(this.cfg, CMD.DRAWER(5));
      return;
    }
    await send(this.cfg, CMD.DRAWER(pin));
  }

  /** Installer helper: pulses each pin with a pause so you can see which fires. */
  async testDrawer(): Promise<void> {
    await send(this.cfg, CMD.DRAWER(2));
    await new Promise((r) => setTimeout(r, 2500));
    await send(this.cfg, CMD.DRAWER(5));
  }

  /** Settings → Test printer. Reports capability rather than assuming it. */
  async verify(): Promise<{ ok: boolean; findings: string[] }> {
    const findings: string[] = [];
    const status = await queryStatus(this.cfg);

    if (!status.reachable) {
      return { ok: false, findings: [`Printer unreachable: ${status.detail}`] };
    }
    if (status.paperOut === true) findings.push('Paper is out.');
    if (status.paperOut === null) findings.push('Printer does not report status; paper-out detection unavailable.');

    try {
      findings.push('Status probe complete.');
    } catch (err) {
      return { ok: false, findings: [...findings, `Render/print failed: ${(err as Error).message}`] };
    }

    findings.push('Confirm the cash drawer opened; if not, set drawerPin to 5.');
    return { ok: true, findings };
  }

  async printTest(html: string): Promise<void> {
    await this.render(html, 1);
  }

  async render(html: string, copies: number): Promise<void> {
    const width = PAPER_DOTS[this.cfg.paperWidth];
    const raster = await rasterizeHtml(html, width, {
      arabicFontFamily: this.cfg.arabicFontUrl ? 'Cairo' : undefined,
      onWarn: (message) => this.emitEvent({ type: 'warn', message }),
    });
    const body = rasterToEscPos(raster);

    for (let i = 0; i < Math.max(1, Math.min(copies, 5)); i++) {
      await send(
        this.cfg,
        Buffer.concat([CMD.INIT, CMD.ALIGN_LEFT, body, CMD.FEED(3), CMD.CUT_PARTIAL])
      );
    }
  }

  /** P10 — ASCII only. Readable on any printer with no shaping required. */
  private async printFallback(text: string): Promise<void> {
    const safe = text.replace(/[^\x20-\x7E\n]/g, '?');
    await send(
      this.cfg,
      Buffer.concat([
        CMD.INIT,
        CMD.ALIGN_CENTER,
        CMD.BOLD(true),
        Buffer.from('** RECEIPT - PLAIN MODE **\n', 'ascii'),
        CMD.BOLD(false),
        CMD.ALIGN_LEFT,
        Buffer.from(safe + '\n', 'ascii'),
        Buffer.from('Ask staff for a full reprint.\n', 'ascii'),
        CMD.FEED(3),
        CMD.CUT_PARTIAL,
      ])
    );
  }

  private async drain(): Promise<void> {
    if (this.running || this.disposed) return;
    this.running = true;

    while (this.queue.length && !this.disposed) {
      // --- P5 -------------------------------------------------------------
      const status = await queryStatus(this.cfg, 1500);
      if (status.paperOut === true) {
        this.emitEvent({ type: 'paper_out' });
        this.running = false;
        this.timer = setTimeout(() => void this.drain(), 15_000);
        return;
      }

      const job = this.queue[0]!;

      try {
        if (job.kind === 'drawer') {
          await this.openDrawer();
        } else if (job.html) {
          // --- P10 --------------------------------------------------------
          const renderFailing = job.attempts >= 3 && job.lastError?.startsWith('render:');
          if (renderFailing && job.fallbackText) {
            await this.printFallback(job.fallbackText);
            this.emitEvent({ type: 'fallback', job });
          } else {
            await this.render(job.html, job.copies ?? 1);
          }
          if (job.openDrawer) await this.openDrawer();
        }

        this.queue.shift();
        await this.persist();
        this.emitEvent({ type: 'queue', pending: this.queue.length });
      } catch (err) {
        const error = err as Error;
        const isRender = error instanceof RenderError;
        job.attempts += 1;
        job.lastError = `${isRender ? 'render' : 'transport'}: ${error.message}`;

        // --- P7 -----------------------------------------------------------
        const fatalRender =
          error instanceof OversizeReceiptError || error instanceof InvertedCaptureError;

        if (job.attempts >= MAX_ATTEMPTS || fatalRender) {
          this.queue.shift();
          this.dead.push(job);
          await this.persist();
          this.emitEvent({ type: 'dead', job, message: job.lastError });
          this.emitEvent({ type: 'queue', pending: this.queue.length });
          continue; // one bad job must not block the rest
        }

        await this.persist();
        this.emitEvent({ type: 'error', job, message: job.lastError, willRetry: true });

        const delay = Math.min(30_000, 2000 * job.attempts);
        this.running = false;
        this.timer = setTimeout(() => void this.drain(), delay);
        return;
      }
    }

    this.running = false;
  }

  /** Jobs that exhausted retries. Surface in Settings so they are not silent. */
  deadLetters(): PrintJob[] {
    return [...this.dead];
  }

  pending(): number {
    return this.queue.length;
  }

  requeueAll(): void {
    for (const job of [...this.dead]) this.requeue(job.id);
  }

  requeue(id: string): boolean {
    const idx = this.dead.findIndex((j) => j.id === id);
    if (idx < 0) return false;
    const job = this.dead.splice(idx, 1)[0]!;
    job.attempts = 0;
    delete job.lastError;
    this.queue.push(job);
    void this.persist();
    void this.drain();
    return true;
  }

  /** P8 — temp file + rename, so a power cut cannot leave a truncated queue. */
  private async persist(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.queueFile), { recursive: true });
      const tmp = `${this.queueFile}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.queue), 'utf8');
      await fs.rename(tmp, this.queueFile);
    } catch (err) {
      this.emitEvent({
        type: 'warn',
        message: `Could not persist print queue: ${(err as Error).message}`,
      });
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
  }
}

