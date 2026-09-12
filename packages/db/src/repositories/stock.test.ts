import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse, createWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import {
  searchItemStock,
  getItemBatches,
  getSellableBatches,
  getBatchMoves,
  verifyBatchLedger,
  getLowStockItems,
  getExpiryReport,
} from './stock';

let db: Db;
let supplierId: number;
let warehouseId: number;

/** yearsFromNow(1) -> a date one year out, so tests never depend on today's date. */
function yearsFromNow(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  supplierId = createSupplier(db, { nameAr: 'مورد المخزون' });
  warehouseId = getDefaultWarehouse(db).id;
});

function purchaseAndConfirm(itemId: number, qtyBase: number, unitPrice: number, opts: Partial<{
  bonusBase: number; batchNumber: string; expiryDate: string; supplierInvoiceNo: string;
}> = {}) {
  // unit_id must reference a real row. Reuse the item base unit if this
  // helper already created one for it (multiple purchases of the same item
  // are common in these tests), otherwise create it -- item_units has a
  // UNIQUE(item_id, name_ar) constraint so the same name cannot be inserted
  // twice for one item.
  const existingUnit = db
    .prepare('SELECT id FROM item_units WHERE item_id = ? AND name_ar = ?')
    .get(itemId, 'وحدة اختبار') as { id: number } | undefined;
  const unitId =
    existingUnit?.id ??
    Number(
      db
        .prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 0, 1)')
        .run(itemId, 'وحدة اختبار').lastInsertRowid
    );

  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: opts.supplierInvoiceNo ?? `SUP-${Math.random()}`,
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [
      {
        lineNo: 1,
        itemId,
        unitId,
        qtyInUnit: qtyBase,
        qtyBase,
        bonusBase: opts.bonusBase ?? 0,
        bonusInUnit: opts.bonusBase ?? 0,
        batchNumber: opts.batchNumber ?? null,
        expiryDate: opts.expiryDate ?? null,
        unitPurchasePrice: unitPrice,
      },
    ],
  });
  confirmPurchaseInvoice(db, id);
  return id;
}

describe('searchItemStock', () => {
  it('aggregates stock across batches for one item', () => {
    const itemId = createItem(db, { nameAr: 'صنف مخزون أ' });
    purchaseAndConfirm(itemId, 100, 500);
    purchaseAndConfirm(itemId, 50, 500, { batchNumber: 'B2' });

    const [row] = searchItemStock(db, 'صنف مخزون أ');
    expect(row!.qtyOnHand).toBe(150);
  });

  it('finds an item typed without hamza', () => {
    createItem(db, { nameAr: 'أدول للمخزون' });
    expect(searchItemStock(db, 'ادول للمخزون')).toHaveLength(1);
  });

  it('shows zero stock for an item never purchased, not an error', () => {
    createItem(db, { nameAr: 'صنف بدون مخزون' });
    const [row] = searchItemStock(db, 'صنف بدون مخزون');
    expect(row!.qtyOnHand).toBe(0);
    expect(row!.stockValue).toBe(0);
    expect(row!.nearestExpiry).toBeNull();
  });

  it('excludes quarantined batches from the on-hand total', () => {
    const itemId = createItem(db, { nameAr: 'صنف حجر صحي' });
    purchaseAndConfirm(itemId, 100, 500);
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET is_quarantined = 1 WHERE id = ?').run(batch!.id);

    const [row] = searchItemStock(db, 'صنف حجر صحي');
    expect(row!.qtyOnHand).toBe(0);
  });

  it('reports the nearest expiry among batches with stock', () => {
    const itemId = createItem(db, { nameAr: 'صنف صلاحية' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: yearsFromNow(3), batchNumber: 'LATE' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: yearsFromNow(1), batchNumber: 'SOON' });
    const [row] = searchItemStock(db, 'صنف صلاحية');
    expect(row!.nearestExpiry).toBe(yearsFromNow(1));
  });
});

describe('getItemBatches / getSellableBatches', () => {
  it('orders sellable batches FEFO — nearest expiry first', () => {
    const itemId = createItem(db, { nameAr: 'صنف فيفو' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: yearsFromNow(3), batchNumber: 'LATE' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: yearsFromNow(1), batchNumber: 'SOON' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: yearsFromNow(2), batchNumber: 'MID' });

    const sellable = getSellableBatches(db, itemId);
    expect(sellable.map((b) => b.batchNumber)).toEqual(['SOON', 'MID', 'LATE']);
  });

  it('excludes a quarantined batch from sellable candidates', () => {
    const itemId = createItem(db, { nameAr: 'صنف فيفو حجر' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: '2027-01-01' });
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET is_quarantined = 1 WHERE id = ?').run(batch!.id);
    expect(getSellableBatches(db, itemId)).toHaveLength(0);
  });

  it('excludes an expired batch from sellable candidates but keeps it in the full batch list', () => {
    const itemId = createItem(db, { nameAr: 'صنف منتهي' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: '2020-01-01' });
    expect(getSellableBatches(db, itemId)).toHaveLength(0);
    expect(getItemBatches(db, itemId)).toHaveLength(1);
  });

  it('an item with no_expiry stays sellable with a NULL expiry date', () => {
    const itemId = createItem(db, { nameAr: 'صنف بدون صلاحية', noExpiry: true });
    purchaseAndConfirm(itemId, 10, 100);
    expect(getSellableBatches(db, itemId)).toHaveLength(1);
  });

  it('filters sellable batches by warehouse', () => {
    const itemId = createItem(db, { nameAr: 'صنف متعدد المخازن' });
    const otherWarehouse = createWarehouse(db, { nameAr: 'مخزن ثانٍ' });
    purchaseAndConfirm(itemId, 10, 100);

    expect(getSellableBatches(db, itemId, warehouseId)).toHaveLength(1);
    expect(getSellableBatches(db, itemId, otherWarehouse)).toHaveLength(0);
  });

  it('a fully consumed batch (qty 0) is excluded from sellable but stays in history', () => {
    const itemId = createItem(db, { nameAr: 'صنف مستهلك' });
    purchaseAndConfirm(itemId, 10, 100);
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET qty_on_hand = 0 WHERE id = ?').run(batch!.id);

    expect(getSellableBatches(db, itemId)).toHaveLength(0);
    expect(getItemBatches(db, itemId)).toHaveLength(1);
  });
});

describe('getBatchMoves / verifyBatchLedger', () => {
  it('records one stock_moves row per purchase against the batch', () => {
    const itemId = createItem(db, { nameAr: 'صنف حركة' });
    purchaseAndConfirm(itemId, 100, 500);
    const [batch] = getItemBatches(db, itemId);
    const moves = getBatchMoves(db, batch!.id);
    expect(moves).toHaveLength(1);
    expect(moves[0]!.moveType).toBe('purchase');
    expect(moves[0]!.qtyDelta).toBe(100);
  });

  it('verifies qty_on_hand matches the sum of stock_moves (rule 8)', () => {
    const itemId = createItem(db, { nameAr: 'صنف تحقق' });
    purchaseAndConfirm(itemId, 100, 500, { batchNumber: 'MERGE' });
    purchaseAndConfirm(itemId, 50, 500, { batchNumber: 'MERGE' }); // merges, BR-11
    const [batch] = getItemBatches(db, itemId);

    const check = verifyBatchLedger(db, batch!.id);
    expect(check.qtyOnHand).toBe(150);
    expect(check.ledgerSum).toBe(150);
    expect(check.matches).toBe(true);
  });

  it('detects a mismatch if qty_on_hand is corrupted outside the ledger', () => {
    const itemId = createItem(db, { nameAr: 'صنف مخالف' });
    purchaseAndConfirm(itemId, 100, 500);
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET qty_on_hand = 999 WHERE id = ?').run(batch!.id);

    const check = verifyBatchLedger(db, batch!.id);
    expect(check.matches).toBe(false);
  });

  it('throws for a nonexistent batch rather than returning a false match', () => {
    expect(() => verifyBatchLedger(db, 999999)).toThrow(/not found/);
  });
});

describe('getLowStockItems', () => {
  it('flags an item below its configured minimum', () => {
    const itemId = createItem(db, { nameAr: 'صنف منخفض', minStock: 50 });
    purchaseAndConfirm(itemId, 10, 100);
    expect(getLowStockItems(db).some((r) => r.itemId === itemId)).toBe(true);
  });

  it('does not flag an item above its minimum', () => {
    const itemId = createItem(db, { nameAr: 'صنف كافٍ', minStock: 5 });
    purchaseAndConfirm(itemId, 100, 100);
    expect(getLowStockItems(db).some((r) => r.itemId === itemId)).toBe(false);
  });

  it('does not flag an unstocked item whose minimum is also zero (the default)', () => {
    // An item that was never meant to be stock-tracked (min_stock left at its
    // default of 0) should not show up as "low stock" just for having zero
    // quantity -- 0 <= 0 is technically true, which is why this needs its own
    // test rather than trusting the HAVING clause reads as intended.
    const itemId = createItem(db, { nameAr: 'صنف غير متتبع' });
    expect(getLowStockItems(db).some((r) => r.itemId === itemId)).toBe(false);
  });

  it('flags an unstocked item whose minimum was explicitly set above zero', () => {
    const itemId = createItem(db, { nameAr: 'صنف يجب تخزينه', minStock: 10 });
    expect(getLowStockItems(db).some((r) => r.itemId === itemId)).toBe(true);
  });
});

describe('getExpiryReport', () => {
  const ASOF = '2026-06-01';

  function daysFromAsOf(days: number): string {
    const d = new Date(`${ASOF}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  it('buckets a batch that expired before asOf as expired', () => {
    const itemId = createItem(db, { nameAr: 'صنف منتهي' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(-5), batchNumber: 'EXP' });
    const { rows } = getExpiryReport(db, ASOF);
    const row = rows.find((r) => r.itemId === itemId);
    expect(row?.bucket).toBe('expired');
  });

  it('buckets a batch expiring in 10 days as d30, not expired', () => {
    const itemId = createItem(db, { nameAr: 'صنف قريب الصلاحية' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(10), batchNumber: 'SOON' });
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.find((r) => r.itemId === itemId)?.bucket).toBe('d30');
  });

  it('places a batch exactly on the 30/60 day boundary in the lower bucket (d30, not d60)', () => {
    const itemId = createItem(db, { nameAr: 'صنف حدي' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(30), batchNumber: 'EDGE30' });
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.find((r) => r.itemId === itemId)?.bucket).toBe('d30');
  });

  it('buckets a batch far in the future as over180', () => {
    const itemId = createItem(db, { nameAr: 'صنف بعيد الصلاحية' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(400), batchNumber: 'FAR' });
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.find((r) => r.itemId === itemId)?.bucket).toBe('over180');
  });

  it('values each row at qty_on_hand * unit_cost', () => {
    const itemId = createItem(db, { nameAr: 'صنف قيمة' });
    purchaseAndConfirm(itemId, 20, 300, { expiryDate: daysFromAsOf(10), batchNumber: 'VAL' });
    const { rows } = getExpiryReport(db, ASOF);
    const row = rows.find((r) => r.itemId === itemId)!;
    expect(row.value).toBe(row.qtyOnHand * row.unitCost);
  });

  it('excludes a batch with no expiry date (open stock)', () => {
    const itemId = createItem(db, { nameAr: 'صنف بدون صلاحية' });
    purchaseAndConfirm(itemId, 10, 100);
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.some((r) => r.itemId === itemId)).toBe(false);
  });

  it('excludes a quarantined batch even if it would otherwise be near expiry', () => {
    const itemId = createItem(db, { nameAr: 'صنف حجر منتهي' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(5), batchNumber: 'QTN' });
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET is_quarantined = 1 WHERE id = ?').run(batch!.id);
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.some((r) => r.itemId === itemId)).toBe(false);
  });

  it('excludes a batch fully consumed to zero qty_on_hand', () => {
    const itemId = createItem(db, { nameAr: 'صنف مستنفد' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(5), batchNumber: 'ZERO' });
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET qty_on_hand = 0 WHERE id = ?').run(batch!.id);
    const { rows } = getExpiryReport(db, ASOF);
    expect(rows.some((r) => r.itemId === itemId)).toBe(false);
  });

  it('summary counts and values match the rows actually in each bucket', () => {
    const a = createItem(db, { nameAr: 'صنف ملخص أ' });
    const b = createItem(db, { nameAr: 'صنف ملخص ب' });
    purchaseAndConfirm(a, 10, 100, { expiryDate: daysFromAsOf(-1), batchNumber: 'S-EXP' });
    purchaseAndConfirm(b, 5, 200, { expiryDate: daysFromAsOf(-2), batchNumber: 'S-EXP2' });
    const { summary, rows } = getExpiryReport(db, ASOF);
    const expiredSummary = summary.find((s) => s.bucket === 'expired')!;
    const expiredRows = rows.filter((r) => r.bucket === 'expired');
    expect(expiredSummary.batchCount).toBe(expiredRows.length);
    expect(expiredSummary.qtyOnHand).toBe(expiredRows.reduce((s, r) => s + r.qtyOnHand, 0));
    expect(expiredSummary.value).toBe(expiredRows.reduce((s, r) => s + r.value, 0));
  });

  it('orders rows by soonest expiry first', () => {
    const itemId = createItem(db, { nameAr: 'صنف ترتيب' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(60), batchNumber: 'LATER' });
    purchaseAndConfirm(itemId, 10, 100, { expiryDate: daysFromAsOf(5), batchNumber: 'SOONER' });
    const { rows } = getExpiryReport(db, ASOF);
    const own = rows.filter((r) => r.itemId === itemId);
    expect(own[0]!.batchNumber).toBe('SOONER');
    expect(own[1]!.batchNumber).toBe('LATER');
  });
});
