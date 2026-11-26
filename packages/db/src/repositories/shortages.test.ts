import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { addShortage, listShortages, setShortageStatus, updateShortage, activeShortageItemIds } from './shortages';

let db: Db;
let item: number;
let box: number;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  item = createItem(db, {
    nameAr: 'كونكور 5 مجم 30 أقراص',
    barcodes: ['622'],
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: 240, isBase: true, isDefaultSale: false },
      { nameAr: 'علبة', factor: 30, salePrice: 7200, isBase: false, isDefaultSale: true },
    ],
  } as never);
  box = (db.prepare("SELECT id FROM item_units WHERE item_id = ? AND factor = 30").get(item) as { id: number }).id;
});

describe('shortages', () => {
  it('adds an item by id with quantity and note, and lists it with its barcode and stock', () => {
    addShortage(db, { itemId: item, unitId: box, requiredQty: 5, note: 'من ابن سينا' });
    const [row] = listShortages(db);
    expect(row).toMatchObject({ itemId: item, itemNameAr: 'كونكور 5 مجم 30 أقراص', barcode: '622', stockBase: 0, unitNameAr: 'علبة', requiredQty: 5, note: 'من ابن سينا', status: 'open' });
    expect(row!.stockText).toBe('0 قرص');
    expect((db.prepare('SELECT count(*) AS c FROM items').get() as { c: number }).c).toBe(1);
  });

  it('refuses the same item twice while it is open or ordered', () => {
    const id = addShortage(db, { itemId: item });
    expect(() => addShortage(db, { itemId: item })).toThrow(expect.objectContaining({ code: 'shortage.exists' }));
    setShortageStatus(db, id, 'ordered');
    expect(() => addShortage(db, { itemId: item })).toThrow(expect.objectContaining({ code: 'shortage.exists' }));
  });

  it('a resolved item can be listed again; the old row stays as history', () => {
    const first = addShortage(db, { itemId: item });
    setShortageStatus(db, first, 'resolved');
    expect(activeShortageItemIds(db)).toEqual([]);
    addShortage(db, { itemId: item });
    expect(listShortages(db, 'active')).toHaveLength(1);
    expect(listShortages(db, 'closed')).toHaveLength(1);
    expect(listShortages(db, 'closed')[0]!.closedAt).not.toBeNull();
  });

  it('closed rows are final and cannot be deleted', () => {
    const id = addShortage(db, { itemId: item });
    setShortageStatus(db, id, 'cancelled');
    expect(() => setShortageStatus(db, id, 'open')).toThrow(expect.objectContaining({ code: 'shortage.closed' }));
    expect(() => updateShortage(db, id, { requiredQty: 2 })).toThrow(expect.objectContaining({ code: 'shortage.closed' }));
    expect(() => db.prepare('DELETE FROM shortages WHERE id = ?').run(id)).toThrow(/immutable/);
  });

  it('rejects a unit that belongs to another item', () => {
    const other = createItem(db, { nameAr: 'آخر', units: [{ nameAr: 'علبة', factor: 1, salePrice: 100, isBase: true, isDefaultSale: true }] } as never);
    const otherUnit = (db.prepare('SELECT id FROM item_units WHERE item_id = ?').get(other) as { id: number }).id;
    expect(() => addShortage(db, { itemId: item, unitId: otherUnit })).toThrow(expect.objectContaining({ code: 'shortage.unitInvalid' }));
  });
});
