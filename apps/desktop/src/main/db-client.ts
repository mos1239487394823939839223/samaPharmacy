/**
 * Main-process client for the database utilityProcess.
 *
 * Owns the child's lifecycle and correlates request/response envelopes by id.
 * Every pending request is rejected if the child exits, so a crashed database
 * process surfaces as a failed call rather than a promise that never settles —
 * and the child is then restarted automatically, so one crash does not leave
 * the till dead until someone restarts the whole application.
 */

import { utilityProcess, type UtilityProcess } from 'electron';
import type { DbRequest, DbRequestEnvelope, DbResponseEnvelope } from '@pharmacy/shared';

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

interface StartArgs {
  entryPath: string;
  config: { databasePath: string; migrationsDir: string; backupDir: string };
}

const MAX_RESTARTS = 5;

export class DbClient {
  private child: UtilityProcess | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private ready: Promise<void> | null = null;
  private args: StartArgs | null = null;
  private stopping = false;
  private restarts = 0;
  private shutdownWaiter: (() => void) | null = null;
  private progressListeners = new Set<(channel: string, data: unknown) => void>();
  private logListeners = new Set<(line: string) => void>();

  /** Subscribe to progress pushed by the db process during long operations. */
  onProgress(listener: (channel: string, data: unknown) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /** Lifecycle events (crash, restart) for the log file. */
  onLog(listener: (line: string) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private log(line: string): void {
    for (const l of this.logListeners) l(line);
  }

  start(entryPath: string, config: StartArgs['config']): Promise<void> {
    this.args = { entryPath, config };
    return this.spawn();
  }

  /** Resolves once the db process is ready (waiting through a restart if one is under way). */
  whenReady(): Promise<void> {
    return this.ready ?? this.spawn();
  }

  private spawn(): Promise<void> {
    if (this.ready) return this.ready;
    const args = this.args;
    if (!args) return Promise.reject(new Error('Database process not configured'));

    this.ready = new Promise<void>((resolve, reject) => {
      const child = utilityProcess.fork(args.entryPath, [], { stdio: 'inherit' });
      this.child = child;

      child.on('exit', (code: number) => {
        const error = new Error(`Database process exited (code ${code})`);
        for (const [, p] of this.pending) p.reject(error);
        this.pending.clear();
        this.child = null;
        this.ready = null;
        reject(error);
        this.shutdownWaiter?.();

        if (!this.stopping && this.restarts < MAX_RESTARTS) {
          this.restarts += 1;
          this.log(`db process exited with code ${code}; restarting (${this.restarts}/${MAX_RESTARTS})`);
          void this.spawn().catch((err: Error) => this.log(`db restart failed: ${err.message}`));
        }
      });

      child.on('message', (message: unknown) => {
        const payload = message as
          | { type: 'ready' }
          | { type: 'init-failed'; error: string }
          | { type: 'shutdown-done' }
          | { type: 'progress'; channel: string; data: unknown }
          | { type: 'response'; envelope: DbResponseEnvelope };

        if (payload.type === 'ready') {
          resolve();
          return;
        }
        if (payload.type === 'init-failed') {
          this.log(`db init failed: ${payload.error}`);
          reject(new Error(`Database init failed: ${payload.error}`));
          return;
        }
        if (payload.type === 'shutdown-done') {
          this.shutdownWaiter?.();
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

      child.postMessage({ type: 'init', config: args.config });
    });

    return this.ready;
  }

  async request<T>(request: DbRequest): Promise<T> {
    await this.whenReady();
    const child = this.child;
    if (!child) throw new Error('Database process not running');

    const envelope: DbRequestEnvelope = { id: this.nextId++, request };

    return new Promise<T>((resolve, reject) => {
      this.pending.set(envelope.id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      child.postMessage({ type: 'request', envelope });
    });
  }

  /**
   * Graceful stop: the db process takes its closing backup, checkpoints the
   * WAL and closes the file before exiting. Falls back to kill() if it does
   * not answer within `timeoutMs`.
   */
  async shutdown(timeoutMs = 15000): Promise<void> {
    this.stopping = true;
    const child = this.child;
    if (!child) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.shutdownWaiter = () => {
        clearTimeout(timer);
        resolve();
      };
      child.postMessage({ type: 'shutdown' });
    });
    this.shutdownWaiter = null;
    this.child?.kill();
    this.child = null;
    this.ready = null;
  }
}
