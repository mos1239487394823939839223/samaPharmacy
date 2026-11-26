import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { getDefaultWarehouse } from './warehouses';
import { postOpeningStock, costFromSellingPrice } from './opening-stock';
import { updateSettings } from './settings';
import { verifyBatchLedger } from './stock';
import { FUTURE_EXPIRY } from '../test-helpers';

let db: Db;
let wh: number;
let item: number;
let box: number;
let tab: number;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  wh = getDefaultWarehouse(db).id;
  item = createItem(db, {
    nameAr: 'كونكور 5 مجم 30 أقراص',
    publicPrice: 10000,
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: 334, isBase: true, isDefaultSale: false },
      { nameAr: 'علبة', factor: 30, salePrice: 10000, isBase: false, isDefaultSale: true },
    ],
  } as never);
  box = (db.prepare('SELECT id FROM item_units WHERE item_id = ? AND factor = 30').get(item) as { id: number }).id;
  tab = (db.prepare('SELECT id FROM item_units WHERE item_id = ? AND factor = 1').get(item) as { id: number }).id;
});

describe('opening stock (رصيد أول المدة)', () => {
  it('cost = selling price − 20%: a box at 100.00 costs 80.00', () => {
    expect(costFromSellingPrice(10000, 1, 20)).toBe(8000);
    expect(costFromSellingPrice(10000, 30, 20)).toBe(267); // per tablet, rounded
  });

  it('posts boxes and tablets as batches with a ledger move, at 80% of the selling price', () => {
    postOpeningStock(db, wh, [
      { itemId: item, unitId: box, qtyInUnit: 5, expiryDate: FUTURE_EXPIRY },
      { itemId: item, unitId: tab, qtyInUnit: 7, expiryDate: FUTURE_EXPIRY },
    ]);
    const batches = db.prepare('SELECT id, qty_on_hand AS q, unit_cost AS c FROM batches').all() as { id: number; q: number; c: number }[];
    // Same item, expiry and cost → one batch holding 150 + 7 tablets.
    expect(batches).toEqual([{ id: batches[0]!.id, q: 157, c: 267 }]);
    expect(verifyBatchLedger(db, batches[0]!.id).matches).toBe(true);
    const adj = db.prepare('SELECT reason_code AS r, note FROM stock_adjustments').get();
    expect(adj).toEqual({ r: 'count', note: 'رصيد أول المدة' });
    // No supplier money involved.
    expect((db.prepare('SELECT count(*) AS c FROM supplier_ledger').get() as { c: number }).c).toBe(0);
  });

  it('follows the discount setting', () => {
    updateSettings(db, { purchaseDiscountPct: 25 });
    postOpeningStock(db, wh, [{ itemId: item, unitId: box, qtyInUnit: 1, expiryDate: FUTURE_EXPIRY }]);
    expect((db.prepare('SELECT unit_cost AS c FROM batches').get() as { c: number }).c).toBe(250);
  });

  it('refuses a past expiry and an item with no selling price', () => {
    expect(() => postOpeningStock(db, wh, [{ itemId: item, unitId: box, qtyInUnit: 1, expiryDate: '2020-01-01' }])).toThrow(
      expect.objectContaining({ code: 'purchase.expiryPast' })
    );
    const free = createItem(db, { nameAr: 'بدون سعر', units: [{ nameAr: 'علبة', factor: 1, salePrice: 0, isBase: true, isDefaultSale: true }] } as never);
    const u = (db.prepare('SELECT id FROM item_units WHERE item_id = ?').get(free) as { id: number }).id;
    expect(() => postOpeningStock(db, wh, [{ itemId: free, unitId: u, qtyInUnit: 1, expiryDate: FUTURE_EXPIRY }])).toThrow(
      expect.objectContaining({ code: 'opening.noPrice' })
    );
    expect((db.prepare('SELECT count(*) AS c FROM batches').get() as { c: number }).c).toBe(0);
  });
});
