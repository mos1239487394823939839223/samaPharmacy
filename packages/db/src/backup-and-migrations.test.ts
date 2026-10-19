import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from './connection';
import { openDatabase } from './connection';
import { loadMigrations, migrate, pendingMigrations } from './migrate';
import { backupDatabase, listBackups, verifyBackup } from './backup';
import { createItem } from './repositories/items';

const MIGRATIONS = path.join(__dirname, '../migrations');
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-test-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('backups', () => {
  it('writes a valid snapshot to both destinations and prunes to `keep`', () => {
    const db = openDatabase(path.join(tmp, 'live.db'));
    migrate(db, MIGRATIONS);
    createItem(db, { nameAr: 'صنف محفوظ' });
    const primary = path.join(tmp, 'backups');
    const usb = path.join(tmp, 'usb');

    for (let i = 0; i < 4; i++) backupDatabase(db, primary, { secondaryDir: usb, keep: 3, reason: 'manual' });

    expect(listBackups(primary)).toHaveLength(3);
    expect(listBackups(usb)).toHaveLength(3);
    const latest = listBackups(primary)[0]!;
    expect(() => verifyBackup(latest.path)).not.toThrow();
    const copy = new Database(latest.path, { readonly: true });
    expect((copy.prepare('SELECT name_ar AS n FROM items').get() as { n: string }).n).toBe('صنف محفوظ');
    copy.close();
    db.close();
  });

  it('an unreachable second destination never prevents the local backup', () => {
    const db = openDatabase(path.join(tmp, 'live.db'));
    migrate(db, MIGRATIONS);
    const blocker = path.join(tmp, 'not-a-dir');
    fs.writeFileSync(blocker, 'x');
    const result = backupDatabase(db, path.join(tmp, 'b'), { secondaryDir: path.join(blocker, 'sub') });
    expect(fs.existsSync(result.file)).toBe(true);
    expect(result.errors).toHaveLength(1);
    db.close();
  });

  it('verifyBackup rejects a file that is not a pharmacy database', () => {
    const junk = path.join(tmp, 'junk.db');
    fs.writeFileSync(junk, 'definitely not sqlite');
    expect(() => verifyBackup(junk)).toThrow(/Not a valid pharmacy backup/);
  });
});

describe('upgrading an existing database (migrations 0005–0008)', () => {
  /** Build a database at version 5 with real-looking data, the shape installed pharmacies have today. */
  function legacyDb(): Db {
    const dir = path.join(tmp, 'm5');
    fs.mkdirSync(dir);
    for (const m of loadMigrations(MIGRATIONS).filter((m) => m.version <= 5)) {
      fs.writeFileSync(path.join(dir, `${String(m.version).padStart(4, '0')}-${m.name}.sql`), m.sql);
    }
    const db = openDatabase(path.join(tmp, 'legacy.db'));
    migrate(db, dir);
    db.exec(`
      INSERT INTO items (id, code, name_ar, name_ar_norm, storage_condition) VALUES (1, 100001, 'انسولين', 'انسولين', 'fridge');
      INSERT INTO item_units (id, item_id, name_ar, factor, sale_price, is_base) VALUES (1, 1, 'قلم', 1, 5000, 1);
      INSERT INTO suppliers (id, code, name_ar, name_norm) VALUES (1, 1001, 'مورد', 'مورد');
      INSERT INTO batches (id, item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, received_at)
        VALUES (1, 1, 1, 'LOT-9', '2099-01-01', 9, 3000, '2026-05-01 21:30:00');
      INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, at)
        VALUES (1, 1, 1, 10, 3000, 'purchase', '2026-05-01 21:30:00');
      INSERT INTO sales_invoices (id, serial, warehouse_id, user_id, invoice_type, status, subtotal, total, paid_cash, cost_total, created_at, confirmed_at)
        VALUES (1, 1, 1, 1, 'cash', 'confirmed', 5000, 5000, 10000, 3000, '2026-05-01 22:30:00', '2026-05-01 22:30:00');
      INSERT INTO sales_invoice_lines (invoice_id, line_no, item_id, batch_id, unit_id, qty_in_unit, qty_base, unit_price,
        value_before_discount, value_after_discount, unit_cost) VALUES (1, 1, 1, 1, 1, 1, 1, 5000, 5000, 5000, 3000);
      INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, at)
        VALUES (1, 1, 1, -1, 3000, 'sale', '2026-05-01 22:30:00');
    `);
    return db;
  }

  it('preserves every row and reference, and fixes paid_cash', () => {
    const db = legacyDb();
    expect(pendingMigrations(db, MIGRATIONS).slice(0, 3)).toEqual([6, 7, 8]);
    migrate(db, MIGRATIONS);

    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.prepare('SELECT id, qty_on_hand AS q FROM batches').all()).toEqual([{ id: 1, q: 9 }]);
    const inv = db.prepare('SELECT paid_cash AS p, cash_tendered AS t FROM sales_invoices').get();
    expect(inv).toEqual({ p: 5000, t: 10000 });
    db.close();
  });

  it('allows the quarantine twin the old UNIQUE key rejected', () => {
    const db = legacyDb();
    migrate(db, MIGRATIONS);
    expect(() =>
      db
        .prepare(
          `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, is_quarantined)
           VALUES (1, 1, 'LOT-9', '2099-01-01', 1, 3000, 1)`
        )
        .run()
    ).not.toThrow();
    db.close();
  });

  it('converts UTC timestamps to local time', () => {
    const db = legacyDb();
    migrate(db, MIGRATIONS);
    const expected = (db.prepare("SELECT datetime('2026-05-01 22:30:00', 'localtime') AS v").get() as { v: string }).v;
    expect((db.prepare('SELECT confirmed_at AS v FROM sales_invoices').get() as { v: string }).v).toBe(expected);
    db.close();
  });

  it('after 0008 history cannot be edited or deleted', () => {
    const db = legacyDb();
    migrate(db, MIGRATIONS);
    expect(() => db.prepare('UPDATE sales_invoices SET total = 1').run()).toThrow(/immutable/);
    expect(() => db.prepare('DELETE FROM sales_invoice_lines').run()).toThrow(/immutable/);
    expect(() => db.prepare('DELETE FROM items').run()).toThrow(/immutable/);
    expect(() => db.prepare('UPDATE stock_moves SET qty_delta = 99').run()).toThrow(/immutable/);
    db.close();
  });
});

describe('migration numbering', () => {
  it('refuses to start when an applied version was recorded under another name', () => {
    const db = openDatabase(path.join(tmp, 'renum.db'));
    migrate(db, MIGRATIONS);
    db.prepare("UPDATE schema_migrations SET name = 'something-else' WHERE version = 5").run();
    expect(() => migrate(db, MIGRATIONS)).toThrow(/must never be reused/);
    db.close();
  });
});

describe('local-time guard', () => {
  it('no repository writes a bare UTC datetime(\'now\') or date(\'now\')', () => {
    const dir = path.join(__dirname, 'repositories');
    const offenders = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .filter((f) => /(datetime|date|julianday)\('now'\)/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
