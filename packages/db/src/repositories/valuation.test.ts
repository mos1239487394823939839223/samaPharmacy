import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { getStockValuation } from './valuation';
import { FUTURE_EXPIRY, allowHistoryEdits } from '../test-helpers';

let db: Db;
let wh: number;
let sup: number;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  wh = getDefaultWarehouse(db).id;
  sup = createSupplier(db, { nameAr: 'مورد' });
});

function item(name: string, boxPrice: number | null) {
  const id = createItem(db, {
    nameAr: name,
    publicPrice: boxPrice,
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: boxPrice ? boxPrice / 20 : 0, isBase: true, isDefaultSale: false },
      { nameAr: 'علبة', factor: 20, salePrice: boxPrice ?? 0, isBase: false, isDefaultSale: true },
    ],
  } as never);
  const box = (db.prepare('SELECT id FROM item_units WHERE item_id = ? AND factor = 20').get(id) as { id: number }).id;
  return { id, box };
}

function buy(itemId: number, unitId: number, boxes: number, price: number, expiry = FUTURE_EXPIRY) {
  const p = createPurchaseInvoice(db, {
    supplierInvoiceNo: `S${Math.random()}`, supplierId: sup, warehouseId: wh, purchaseType: 'credit', invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: boxes, unitPurchasePrice: price, expiryDate: expiry }],
  });
  confirmPurchaseInvoice(db, p);
}

describe('stock valuation', () => {
  it('cost at landed cost, sale at the box price shared down, profit = sale − cost', () => {
    const a = item('أ', 10000); // box of 20 sells at 100.00
    buy(a.id, a.box, 3, 8000); // 3 boxes bought at 80.00 → 60 tablets at 4.00
    const v = getStockValuation(db);
    expect(v.rows[0]).toMatchObject({ qtyBase: 60, qtyText: '3 علبة', costValue: 24000, saleValue: 30000, profit: 6000 });
    expect(v.totals).toMatchObject({ items: 1, costValue: 24000, saleValue: 30000, profit: 6000, marginPct: 20 });
  });

  it('an item with no price counts in cost but not in sale value or profit', () => {
    const a = item('مسعّر', 10000);
    const b = item('بدون سعر', null);
    buy(a.id, a.box, 1, 8000);
    buy(b.id, b.box, 1, 5000);
    const v = getStockValuation(db);
    expect(v.totals).toMatchObject({ items: 2, costValue: 13000, saleValue: 10000, profit: 2000, unpricedItems: 1, unpricedCost: 5000 });
    expect(v.rows.find((r) => r.nameAr === 'بدون سعر')).toMatchObject({ saleValue: null, profit: null });
  });

  it('expired stock is reported apart, at cost, and not counted as sellable', () => {
    const a = item('منتهي', 10000);
    buy(a.id, a.box, 2, 8000);
    allowHistoryEdits(db);
    db.prepare("UPDATE batches SET expiry_date = '2020-01-01'").run();
    const v = getStockValuation(db);
    expect(v.totals).toMatchObject({ items: 0, costValue: 0, expiredCost: 16000, expiredItems: 1 });
  });

  it('a partly sold box shows boxes and tablets', () => {
    const a = item('جزئي', 10000);
    buy(a.id, a.box, 2, 8000);
    db.prepare('UPDATE batches SET qty_on_hand = 25').run();
    expect(getStockValuation(db).rows[0]).toMatchObject({ qtyText: '1 علبة + 5 قرص', saleValue: 12500 });
  });
});

describe('stock list: in-stock only', () => {
  it('hides items with an empty shelf', async () => {
    const { searchItemStock } = await import('./stock');
    const a = item('له رصيد', 10000);
    item('بدون رصيد', 10000);
    buy(a.id, a.box, 1, 8000);
    expect(searchItemStock(db, '', 100).map((r) => r.nameAr).sort()).toEqual(['بدون رصيد', 'له رصيد']);
    expect(searchItemStock(db, '', 100, undefined, true).map((r) => r.nameAr)).toEqual(['له رصيد']);
  });
});
