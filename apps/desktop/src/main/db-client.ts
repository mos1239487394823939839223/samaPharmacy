/**
 * Main-process client for the database utilityProcess.
 *
 * Owns the child's lifecycle and correlates request/response envelopes by id.
 * Every pending request is rejected if the child exits, so a crashed database
 * process surfaces as a failed call rather than a promise that never settles.
 */

import { utilityProcess, type UtilityProcess } from 'electron';
import type { DbRequest, DbRequestEnvelope, DbResponseEnvelope } from '@pharmacy/shared';

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export class DbClient {
  private child: UtilityProcess | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private ready: Promise<void> | null = null;
  private progressListeners = new Set<(channel: string, data: unknown) => void>();

  /** Subscribe to progress pushed by the db process during long operations. */
  onProgress(listener: (channel: string, data: unknown) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  async start(entryPath: string, databasePath: string, migrationsDir: string): Promise<void> {
    if (this.ready) return this.ready;

    this.ready = new Promise<void>((resolve, reject) => {
      const child = utilityProcess.fork(entryPath, [], { stdio: 'inherit' });
      this.child = child;

      const onExit = (code: number) => {
        const error = new Error(`Database process exited (code ${code})`);
        for (const [, p] of this.pending) p.reject(error);
        this.pending.clear();
        this.child = null;
        this.ready = null;
        reject(error);
      };

      child.on('exit', onExit);

      child.on('message', (message: unknown) => {
        const payload = message as
          | { type: 'ready' }
          | { type: 'init-failed'; error: string }
          | { type: 'progress'; channel: string; data: unknown }
          | { type: 'response'; envelope: DbResponseEnvelope };

        if (payload.type === 'ready') {
          resolve();
          return;
        }
        if (payload.type === 'init-failed') {
          reject(new Error(`Database init failed: ${payload.error}`));
          return;
        }
        if (payload.type === 'progress') {
          for (const l of this.progressListeners) l(payload.channel, payload.data);
          return;
        }
        if (payload.type === 'response') {
          const { envelope } = payload;
          const entry = this.pending.get(envelope.id);
          if (!entry) return;
          this.pending.delete(envelope.id);
          if (envelope.ok) entry.resolve(envelope.data);
          else entry.reject(new Error(envelope.error));
        }
      });

      child.postMessage({ type: 'init', config: { databasePath, migrationsDir } });
    });

    return this.ready;
  }

  request<T>(request: DbRequest): Promise<T> {
    const child = this.child;
    if (!child) return Promise.reject(new Error('Database process not running'));

    const envelope: DbRequestEnvelope = { id: this.nextId++, request };

    return new Promise<T>((resolve, reject) => {
      this.pending.set(envelope.id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      child.postMessage({ type: 'request', envelope });
    });
  }

  stop(): void {
    this.child?.kill();
    this.child = null;
    this.ready = null;
  }
}
