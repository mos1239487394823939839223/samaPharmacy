/**
 * Migration runner.
 *
 * Applies numbered .sql files from the migrations directory in ascending order
 * and records each in schema_migrations. Each file runs inside a transaction, so
 * a failure part-way leaves no partial schema.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './connection';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

const FILENAME = /^(\d+)[-_](.+)\.sql$/;

export function loadMigrations(dir: string): Migration[] {
  if (!fs.existsSync(dir)) return [];

  const migrations = fs
    .readdirSync(dir)
    .map((file) => {
      const match = FILENAME.exec(file);
      if (!match) return null;
      return {
        version: Number(match[1]),
        name: match[2],
        sql: fs.readFileSync(path.join(dir, file), 'utf8'),
      };
    })
    .filter((m): m is Migration => m !== null)
    .sort((a, b) => a.version - b.version);

  const seen = new Set<number>();
  for (const m of migrations) {
    if (seen.has(m.version)) {
      throw new Error(`Duplicate migration version ${m.version}`);
    }
    seen.add(m.version);
  }

  return migrations;
}

function ensureMigrationTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function appliedVersions(db: Db): number[] {
  ensureMigrationTable(db);
  const rows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all() as { version: number }[];
  return rows.map((r) => r.version);
}

export function migrate(db: Db, dir: string): { applied: number[] } {
  ensureMigrationTable(db);

  const already = new Set(appliedVersions(db));
  const pending = loadMigrations(dir).filter((m) => !already.has(m.version));
  const applied: number[] = [];

  const record = db.prepare(
    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
  );

  for (const m of pending) {
    // better-sqlite3 cannot run exec() inside its transaction() helper when the
    // SQL contains its own BEGIN/COMMIT, so drive the transaction explicitly.
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      record.run(m.version, m.name);
      db.exec('COMMIT');
      applied.push(m.version);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(
        `Migration ${m.version} (${m.name}) failed: ${(err as Error).message}`
      );
    }
  }

  return { applied };
}
