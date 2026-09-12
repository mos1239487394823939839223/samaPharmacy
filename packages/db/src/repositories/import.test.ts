/**
 * M3 acceptance: 35,000 rows in under 60 seconds, then search under 200ms.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { validateRows, guessMapping } from '@pharmacy/core';
import type { Db } from '../connection';
import { bulkInsertItems, readSheet, existingKeys } from './import';
import { searchItems, findByBarcode, countItems } from './items';

let db: Db;
let tmp: string;

const MIGRATION = join(__dirname, '../../migrations/0001-initial-schema.sql');

beforeAll(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(MIGRATION, 'utf8'));
  tmp = mkdtempSync(join(tmpdir(), 'pharmacy-import-'));
});

afterAll(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('readSheet', () => {
  it('reads a CSV with Arabic headers', () => {
    const file = join(tmp, 'items.csv');
    writeFileSync(
      file,
      'اسم الصنف,باركود,سعر الجمهور\nبانادول,6221048123450,25.00\nكلاريتين,111222333,40.50\n',
      'utf8'
    );
    const { headers, rows } = readSheet(file);
    expect(headers).toEqual(['اسم الصنف', 'باركود', 'سعر الجمهور']);
    expect(rows).toHaveLength(2);
    expect(rows[0]![0]).toBe('بانادول');
  });

  it('preserves a leading-zero barcode as text, not a number', () => {
    const file = join(tmp, 'zeros.csv');
    writeFileSync(file, 'اسم الصنف,باركود\nصنف,0004567\n', 'utf8');
    const { rows } = readSheet(file);
    expect(rows[0]![1]).toBe('0004567');
  });

  it('rejects an unsupported extension rather than guessing', () => {
    expect(() => readSheet(join(tmp, 'x.pdf'))).toThrow(/Unsupported/);
  });
});

describe('bulkInsertItems', () => {
  it('inserts validated rows with barcodes and units', () => {
    const { accepted } = validateRows(
      [['بانادول اكسترا', 'Panadol Extra', '6221048100001', '25.00']],
      { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 }
    );
    const { inserted } = bulkInsertItems(db, accepted);
    expect(inserted).toBe(1);
    expect(findByBarcode(db, '6221048100001')?.nameAr).toBe('بانادول اكسترا');
  });

  it('rolls the whole import back if any row fails', () => {
    const before = countItems(db);
    const { accepted } = validateRows(
      [
        ['صنف سليم', '', '5550001', ''],
        // Collides with the row inserted above, which validateRows cannot see
        // because it was not given the existing barcode set.
        ['صنف مصطدم', '', '6221048100001', ''],
      ],
      { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 }
    );
    expect(() => bulkInsertItems(db, accepted)).toThrow();
    expect(countItems(db)).toBe(before);
    expect(findByBarcode(db, '5550001')).toBeUndefined();
  });

  it('does not reissue item codes across imports', () => {
    const mk = (name: string) =>
      validateRows([[name, '', '', '']], { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 })
        .accepted;

    bulkInsertItems(db, mk('صنف كود أ'));
    bulkInsertItems(db, mk('صنف كود ب'));

    const codes = db
      .prepare('SELECT code FROM items ORDER BY code')
      .all() as { code: number }[];
    expect(new Set(codes.map((c) => c.code)).size).toBe(codes.length);
  });

  it('reports progress as it goes', () => {
    const rows = Array.from({ length: 1200 }, (_, i) => [`صنف تقدم ${i}`, '', '', '']);
    const { accepted } = validateRows(rows, { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 });

    const updates: number[] = [];
    bulkInsertItems(db, accepted, (p) => updates.push(p.done));

    expect(updates.length).toBeGreaterThan(1);
    expect(updates[updates.length - 1]).toBe(1200);
  });
});

describe('M3 acceptance: 35,000 rows', () => {
  let elapsedMs = 0;

  it('imports 35,000 rows in under 60 seconds', () => {
    const rows = Array.from({ length: 35000 }, (_, i) => [
      `دواء مستورد رقم ${i}`,
      `Imported Drug ${i}`,
      `620000${String(i).padStart(7, '0')}`,
      '35.75',
      'علبة',
      '20',
    ]);

    const mapping = {
      nameAr: 0,
      nameEn: 1,
      barcode: 2,
      publicPrice: 3,
      unitName: 4,
      unitFactor: 5,
    };

    const keys = existingKeys(db);
    const { accepted, rejected } = validateRows(rows, mapping, keys);
    expect(rejected).toHaveLength(0);

    const outcome = bulkInsertItems(db, accepted);
    elapsedMs = outcome.elapsedMs;

    expect(outcome.inserted).toBe(35000);
    expect(elapsedMs).toBeLessThan(60000);
  }, 120000);

  it('searches the imported catalogue in under 200ms', () => {
    const start = performance.now();
    const hits = searchItems(db, 'دواء مستورد رقم 17500', 50);
    const ms = performance.now() - start;

    expect(hits.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(200);
  });

  it('finds an imported item by barcode', () => {
    expect(findByBarcode(db, '6200000017500')?.nameEn).toBe('Imported Drug 17500');
  });

  it('detects duplicates on a second import of the same file', () => {
    const rows = Array.from({ length: 100 }, (_, i) => [
      `دواء مستورد رقم ${i}`,
      '',
      `620000${String(i).padStart(7, '0')}`,
      '',
    ]);
    const keys = existingKeys(db);
    const { accepted, rejected } = validateRows(
      rows,
      { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 },
      keys
    );
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(100);
  });
});
