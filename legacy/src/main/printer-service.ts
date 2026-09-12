/**
 * Simple printer service wrapper
 * Using the full service from hardware/escpos-printer
 */

import { EventEmitter } from 'events';

export interface PrintJob {
  id: string;
  kind: 'receipt' | 'report' | 'drawer';
  html?: string;
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

export interface PrinterConfig {
  transport: 'network' | 'share' | 'file';
  host?: string;
  port?: number;
  shareName?: string;
  filePath?: string;
  paperWidth: 58 | 80;
  drawerPin?: 2 | 5 | 'auto';
  arabicFontUrl?: string;
}

export class PrinterService extends EventEmitter {
  private queue: PrintJob[] = [];

  constructor(
    private cfg: PrinterConfig,
    private queueFile: string
  ) {
    super();
  }

  async init(): Promise<void> {
    // Initialize printer service
    console.log('[Printer] Service initialized');
    this.emitEvent({ type: 'queue', pending: 0 });
  }

  private emitEvent(e: PrinterEvent): void {
    this.emit('event', e);
  }

  enqueue(job: Omit<PrintJob, 'id' | 'attempts' | 'createdAt'>): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.queue.push({ ...job, id, attempts: 0, createdAt: new Date().toISOString() });
    this.emitEvent({ type: 'queue', pending: this.queue.length });
    return id;
  }

  async openDrawer(pinOverride?: 2 | 5): Promise<void> {
    console.log('[Printer] Drawer requested');
  }

  async verify(): Promise<{ ok: boolean; findings: string[] }> {
    return { ok: true, findings: ['Printer service running in mock mode'] };
  }

  dispose(): void {
    // Cleanup
  }
}
