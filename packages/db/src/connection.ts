/**
 * Database connection.
 *
 * Every connection sets the four PRAGMAs from blueprint §2.4. foreign_keys in
 * particular is OFF by default in SQLite and is per-connection, not per-database:
 * forget it and you silently accumulate orphaned invoice lines.
 */

import Database from 'better-sqlite3';

export type Db = Database.Database;

export function openDatabase(path: string): Db {
  const db = new Database(path);

  // journal_mode is persistent, the rest are per-connection. Set all four every
  // time rather than relying on which is which.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  return db;
}

export function sqliteVersion(db: Db): string {
  const row = db.prepare('SELECT sqlite_version() AS v').get() as { v: string };
  return row.v;
}
