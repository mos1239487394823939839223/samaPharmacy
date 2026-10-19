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

/**
 * A version recorded as applied under a different name than the file now
 * carrying that number means the numbering was reused — the new migration
 * would be silently skipped on that database (it happened: a lost 0005 file
 * left version 5 "applied" on existing installs). Refuse to start instead.
 */
function assertNoRenumbering(db: Db, migrations: Migration[]): void {
  const recorded = db.prepare('SELECT version, name FROM schema_migrations').all() as { version: number; name: string }[];
  const byVersion = new Map(migrations.map((m) => [m.version, m.name]));
  for (const r of recorded) {
    const fileName = byVersion.get(r.version);
    if (fileName !== undefined && fileName !== r.name) {
      throw new Error(
        `Migration ${r.version} was applied as "${r.name}" but the file is now "${fileName}". ` +
          `Migration numbers must never be reused — restore the original file and renumber the new one.`
      );
    }
  }
}

export function migrate(db: Db, dir: string): { applied: number[] } {
  ensureMigrationTable(db);

  const all = loadMigrations(dir);
  assertNoRenumbering(db, all);
  const already = new Set(appliedVersions(db));
  const pending = all.filter((m) => !already.has(m.version));
  const applied: number[] = [];

  const record = db.prepare(
    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)'
  );

  for (const m of pending) {
    // A migration that rebuilds a referenced table (SQLite has no ALTER
    // CONSTRAINT) must run with foreign keys off — the pragma is a no-op
    // inside a transaction, so it is toggled outside it, and integrity is
    // re-checked with foreign_key_check before the COMMIT. This is the
    // procedure the SQLite docs give for "making other kinds of table schema
    // changes".
    const fkOff = FK_OFF_DIRECTIVE.test(m.sql);
    if (fkOff) db.pragma('foreign_keys = OFF');

    // better-sqlite3 cannot run exec() inside its transaction() helper when the
    // SQL contains its own BEGIN/COMMIT, so drive the transaction explicitly.
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      if (fkOff) {
        const violations = db.pragma('foreign_key_check') as unknown[];
        if (violations.length > 0) {
          throw new Error(`foreign_key_check reported ${violations.length} violation(s)`);
        }
      }
      record.run(m.version, m.name);
      db.exec('COMMIT');
      applied.push(m.version);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(
        `Migration ${m.version} (${m.name}) failed: ${(err as Error).message}`
      );
    } finally {
      if (fkOff) db.pragma('foreign_keys = ON');
    }
  }

  return { applied };
}

/** First-line directive a migration uses to request foreign keys off while it runs. */
const FK_OFF_DIRECTIVE = /^--\s*migrate:foreign-keys-off\b/m;

/** Versions in `dir` that have not been applied yet — lets the caller back up first. */
export function pendingMigrations(db: Db, dir: string): number[] {
  const already = new Set(appliedVersions(db));
  return loadMigrations(dir)
    .filter((m) => !already.has(m.version))
    .map((m) => m.version);
}
