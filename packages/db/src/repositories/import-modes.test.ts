import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { guessMapping, validateRows } from '@pharmacy/core';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, getItem } from './items';
import { bulkInsertItems, planImport, updateImportedItems, type ImportMode } from './import';

let db: Db;
let concor: number;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  concor = createItem(db, {
    nameAr: 'كونكور 5 مجم 30 أقراص',
    publicPrice: 7200,
    shelfLocation: 'A3',
    barcodes: ['111'],
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: 240, isBase: true, isDefaultSale: false },
      { nameAr: 'علبة', factor: 30, salePrice: 7200, isBase: false, isDefaultSale: true },
    ],
  } as never);
});

const headers = ['اسم الصنف', 'الوحدة', 'المعامل', 'سعر الجمهور', 'الوحدة الصغرى', 'باركود', 'مكان الصنف'];
const file = [
  ['كونكور 5 مجم 30 أقراص', 'علبة', '30', '90', 'قرص', '', ''], // price rise; empty shelf must not wipe A3
  ['صنف جديد', 'علبة', '10', '50', 'قرص', '', 'B1'],
];

function run(mode: ImportMode, rows = file) {
  const mapping = guessMapping(headers);
  const { accepted } = validateRows(rows, mapping, {});
  const plan = planImport(db, accepted, mode);
  const inserted = plan.toInsert.length ? bulkInsertItems(db, plan.toInsert).inserted : 0;
  const upd = updateImportedItems(db, plan.toUpdate, { minStock: false });
  return { inserted, ...upd, skipped: plan.skipped };
}
const count = () => (db.prepare('SELECT count(*) AS c FROM items').get() as { c: number }).c;
const units = (id: number) =>
  (db.prepare('SELECT name_ar AS n, sale_price AS p FROM item_units WHERE item_id = ?').all(id) as { n: string; p: number }[]).map((u) => `${u.n}=${u.p}`).sort();

describe('import modes', () => {
  it('add: new items only, existing untouched', () => {
    expect(run('add')).toMatchObject({ inserted: 1, updated: 0, skipped: 1 });
    expect(getItem(db, concor)!.publicPrice).toBe(7200);
    expect(count()).toBe(2);
  });

  it('update: existing items only — box gets the new price, tablet its share, empty cells keep values', () => {
    expect(run('update')).toMatchObject({ inserted: 0, updated: 1, skipped: 1 });
    const item = getItem(db, concor)!;
    expect(item.publicPrice).toBe(9000);
    expect(item.shelfLocation).toBe('A3');
    expect(units(concor)).toEqual(['علبة=9000', 'قرص=300']);
    expect(count()).toBe(1);
  });

  it('upsert: both', () => {
    expect(run('upsert')).toMatchObject({ inserted: 1, updated: 1, skipped: 0 });
    expect(count()).toBe(2);
  });

  it('matches by barcode when the name changed', () => {
    const r = run('update', [['كونكور جديد الاسم', 'علبة', '30', '80', 'قرص', '111', '']]);
    expect(r.updated).toBe(1);
    expect(getItem(db, concor)!.publicPrice).toBe(8000);
  });

  it('never restructures units: a different pack size keeps the old prices', () => {
    const r = run('update', [['كونكور 5 مجم 30 أقراص', 'علبة', '20', '90', 'قرص', '', '']]);
    expect(r.unitsMismatch).toBe(1);
    expect(units(concor)).toEqual(['علبة=7200', 'قرص=240']);
  });
});
