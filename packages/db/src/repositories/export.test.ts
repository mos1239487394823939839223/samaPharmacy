import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { guessMapping, validateRows } from '@pharmacy/core';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { bulkInsertItems, exportItemsSheet } from './import';

function freshDb(): Db {
  const db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  return db;
}

describe('items export', () => {
  it('exports in the import layout and re-imports into a new database unchanged', () => {
    const db = freshDb();
    createItem(db, {
      nameAr: 'كونكور 5 مجم 30 أقراص',
      nameEn: 'Concor 5mg',
      scientificName: 'Bisoprolol',
      publicPrice: 7200,
      shelfLocation: 'A3',
      minStock: 2,
      barcodes: ['6221234567890'],
      units: [
        { nameAr: 'قرص', factor: 1, salePrice: 240, isBase: true, isDefaultSale: false },
        { nameAr: 'علبة', factor: 30, salePrice: 7200, isBase: false, isDefaultSale: true },
      ],
    } as never);
    createItem(db, { nameAr: 'شراب كحة', units: [{ nameAr: 'زجاجة', factor: 1, salePrice: 3500, isBase: true, isDefaultSale: true }], publicPrice: 3500 } as never);

    const sheet = exportItemsSheet(db);
    expect(sheet.rows).toHaveLength(2);
    expect(sheet.rows.find((r) => r[0] === 'كونكور 5 مجم 30 أقراص')).toEqual(
      ['كونكور 5 مجم 30 أقراص', 'Concor 5mg', 'Bisoprolol', 'علبة', 30, '72.00', 'قرص', '6221234567890', 'A3', 2, expect.any(Number), 0]
    );
    const mapping = guessMapping(sheet.headers);
    expect(mapping).toMatchObject({ nameAr: 0, nameEn: 1, scientificName: 2, unitName: 3, unitFactor: 4, publicPrice: 5, baseUnitName: 6, barcode: 7, shelfLocation: 8, minStock: 9 });

    const target = freshDb();
    const { accepted, rejected } = validateRows(sheet.rows.map((r) => r.map(String)), mapping);
    expect(rejected).toEqual([]);
    bulkInsertItems(target, accepted);
    const again = exportItemsSheet(target);
    // Same content (only the item code and stock may differ between databases).
    expect(again.rows.map((r) => r.slice(0, 10))).toEqual(sheet.rows.map((r) => r.slice(0, 10)));
  });
});
