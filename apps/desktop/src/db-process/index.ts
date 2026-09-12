/**
 * Database host — runs in an Electron utilityProcess.
 *
 * better-sqlite3 is synchronous. Running it on the main process blocks the event
 * loop and freezes the window for the duration of every query, which is invisible
 * at 50 items and unusable at 35,000 (CLAUDE.md rule 6).
 *
 * This process owns the only open handle to the database. It receives request
 * envelopes over the parent port and always replies — errors are serialized into
 * the envelope rather than thrown across the boundary, because an exception here
 * would kill the process and take the handle with it.
 */

import path from 'node:path';
import { openDatabase, migrate, appliedVersions, sqliteVersion, type Db } from '@pharmacy/db';
import type {
  DbRequestEnvelope,
  DbResponseEnvelope,
  PingResult,
  MigrateResult,
} from '@pharmacy/shared';

// utilityProcess exposes the parent port on process.parentPort.
declare const process: NodeJS.Process & {
  parentPort: {
    on(event: 'message', listener: (message: { data: unknown }) => void): void;
    postMessage(message: unknown): void;
  };
};

interface Config {
  databasePath: string;
  migrationsDir: string;
}

let db: Db | null = null;
let config: Config | null = null;

function init(cfg: Config): void {
  config = cfg;
  db = openDatabase(cfg.databasePath);
  // Apply pending migrations at startup so the schema is never behind the code.
  migrate(db, cfg.migrationsDir);
}

function handlePing(): PingResult {
  if (!db || !config) throw new Error('Database not initialized');
  const fk = db.pragma('foreign_keys', { simple: true });
  const journal = db.pragma('journal_mode', { simple: true });
  return {
    sqliteVersion: sqliteVersion(db),
    migrations: appliedVersions(db),
    databasePath: config.databasePath,
    foreignKeys: fk === 1,
    journalMode: String(journal),
  };
}

function handleMigrate(): MigrateResult {
  if (!db || !config) throw new Error('Database not initialized');
  const { applied } = migrate(db, config.migrationsDir);
  return { applied, alreadyCurrent: applied.length === 0 };
}

function dispatch(envelope: DbRequestEnvelope): DbResponseEnvelope {
  try {
    switch (envelope.request.kind) {
      case 'ping':
        return { id: envelope.id, ok: true, data: handlePing() };
      case 'migrate':
        return { id: envelope.id, ok: true, data: handleMigrate() };
      default: {
        const exhaustive: never = envelope.request;
        return {
          id: envelope.id,
          ok: false,
          error: `Unknown request: ${JSON.stringify(exhaustive)}`,
        };
      }
    }
  } catch (err) {
    return { id: envelope.id, ok: false, error: (err as Error).message };
  }
}

process.parentPort.on('message', (message) => {
  const payload = message.data as
    | { type: 'init'; config: Config }
    | { type: 'request'; envelope: DbRequestEnvelope };

  if (payload.type === 'init') {
    try {
      init(payload.config);
      process.parentPort.postMessage({ type: 'ready' });
    } catch (err) {
      process.parentPort.postMessage({ type: 'init-failed', error: (err as Error).message });
    }
    return;
  }

  if (payload.type === 'request') {
    process.parentPort.postMessage({
      type: 'response',
      envelope: dispatch(payload.envelope),
    });
  }
});
