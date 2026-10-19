/**
 * Backups (spec M11). Runs inside the db utilityProcess — the only process
 * holding the database open.
 *
 * `VACUUM INTO` writes a consistent, compacted snapshot of the live database
 * (WAL included) to a new file in one statement — unlike copying
 * pharmacy.db by hand, which silently misses whatever still sits in the
 * -wal file. The snapshot is written to the primary folder first, then
 * copied to the optional second destination (USB stick / network share);
 * a failing second destination never prevents the local backup.
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DomainError } from '@pharmacy/core';
import type { Db } from './connection';

const FILE = /^pharmacy-(\d{8})-(\d{6})(?:-([a-z-]+))?\.db$/;

export type BackupReason = 'auto' | 'close' | 'manual' | 'pre-migration' | 'before-restore';

export interface BackupFile {
  name: string;
  path: string;
  dir: string;
  size: number;
  /** Local timestamp 'YYYY-MM-DD HH:MM:SS' parsed from the file name. */
  takenAt: string;
  reason: string;
}

export interface BackupResult {
  file: string;
  copies: string[];
  errors: Array<{ dir: string; message: string }>;
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Write a snapshot to `primaryDir` (and copy it to `secondaryDir`), then prune each folder to `keep` files. */
export function backupDatabase(
  db: Db,
  primaryDir: string,
  options: { secondaryDir?: string; keep?: number; reason?: BackupReason } = {}
): BackupResult {
  const keep = options.keep ?? 30;
  fs.mkdirSync(primaryDir, { recursive: true });

  let name = `pharmacy-${stamp()}-${options.reason ?? 'manual'}.db`;
  let target = path.join(primaryDir, name);
  // Two backups in the same second (close right after a manual one) must not collide.
  for (let n = 2; fs.existsSync(target); n++) {
    name = `pharmacy-${stamp()}-${options.reason ?? 'manual'}${'-'.repeat(n - 1)}.db`;
    target = path.join(primaryDir, name);
  }

  db.prepare('VACUUM INTO ?').run(target);

  const result: BackupResult = { file: target, copies: [], errors: [] };
  const secondary = options.secondaryDir?.trim();
  if (secondary) {
    try {
      fs.mkdirSync(secondary, { recursive: true });
      const copy = path.join(secondary, name);
      fs.copyFileSync(target, copy);
      result.copies.push(copy);
      pruneBackups(secondary, keep);
    } catch (err) {
      result.errors.push({ dir: secondary, message: (err as Error).message });
    }
  }
  pruneBackups(primaryDir, keep);
  return result;
}

export function listBackups(dir: string): BackupFile[] {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => ({ name, m: FILE.exec(name) }))
    .filter((f): f is { name: string; m: RegExpExecArray } => f.m !== null)
    .map(({ name, m }) => {
      const full = path.join(dir, name);
      const d = m[1]!;
      const t = m[2]!;
      return {
        name,
        path: full,
        dir,
        size: fs.statSync(full).size,
        takenAt: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`,
        reason: m[3] ?? 'manual',
      };
    })
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

export function pruneBackups(dir: string, keep: number): void {
  for (const old of listBackups(dir).slice(keep)) {
    fs.rmSync(old.path, { force: true });
  }
}

/**
 * Open a candidate backup read-only and prove it is a sound pharmacy
 * database before anything is overwritten with it.
 */
export function verifyBackup(file: string): void {
  if (!fs.existsSync(file)) throw new DomainError('backup.notFound', `Backup ${file} does not exist`);
  let probe: Database.Database | null = null;
  try {
    probe = new Database(file, { readonly: true, fileMustExist: true });
    const check = probe.pragma('integrity_check', { simple: true });
    if (check !== 'ok') throw new Error(String(check));
    probe.prepare('SELECT COUNT(*) FROM schema_migrations').get();
    probe.prepare('SELECT COUNT(*) FROM items').get();
  } catch (err) {
    throw new DomainError('backup.invalid', `Not a valid pharmacy backup: ${(err as Error).message}`);
  } finally {
    probe?.close();
  }
}
