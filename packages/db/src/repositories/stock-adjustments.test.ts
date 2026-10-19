import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, getItemUnits } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { getItemBatches, searchItemStock, verifyBatchLedger, getExpiryReport } from './stock';
import { createStockAdjustment, getStockAdjustmentMoves, listStockAdjustments, writeOffExpired } from './stock-adjustments';
import { todayLocal } from '@pharmacy/core';
import { FUTURE_EXPIRY } from '../test-helpers';

let db: Db;
let itemId: number;
let batchId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  itemId = createItem(db, { nameAr: 'صنف للتسوية', units: [{ nameAr: 'قرص', factor: 1, salePrice: 500, isBase: true }] });
  const unitId = (getItemUnits(db, itemId) as Array<{ id: number }>)[0]!.id;
  const supplierId = createSupplier(db, { nameAr: 'مورد' });
  const inv = createPurchaseInvoice(db, {
    supplierInvoiceNo: 'A1',
    supplierId,
    warehouseId: getDefaultWarehouse(db).id,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 50, unitPurchasePrice: 300, expiryDate: FUTURE_EXPIRY }],
  });
  confirmPurchaseInvoice(db, inv);
  batchId = getItemBatches(db, itemId)[0]!.id;
});

describe('createStockAdjustment', () => {
  it('writes off damaged stock with a matching ledger row', () => {
    const id = createStockAdjustment(db, { reasonCode: 'damage', lines: [{ batchId, qtyDelta: -5 }] });
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(45);
    expect(verifyBatchLedger(db, batchId).matches).toBe(true);
    expect(getStockAdjustmentMoves(db, id)).toEqual([expect.objectContaining({ qtyDelta: -5, unitCost: 300 })]);
    expect(listStockAdjustments(db)[0]).toMatchObject({ reasonCode: 'damage', qtyDelta: -5, valueDelta: -1500 });
  });

  it('a physical count sets the batch to the counted quantity, up or down', () => {
    createStockAdjustment(db, { reasonCode: 'count', lines: [{ batchId, countedQty: 52 }] });
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(52);
    createStockAdjustment(db, { reasonCode: 'count', lines: [{ batchId, countedQty: 48 }] });
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(48);
    expect(verifyBatchLedger(db, batchId).matches).toBe(true);
  });

  it('refuses to add stock for damage, expiry or theft', () => {
    expect(() => createStockAdjustment(db, { reasonCode: 'damage', lines: [{ batchId, qtyDelta: 5 }] })).toThrow(/only remove/);
  });

  it('refuses to go below zero', () => {
    expect(() => createStockAdjustment(db, { reasonCode: 'damage', lines: [{ batchId, qtyDelta: -51 }] })).toThrow(/cannot remove/);
  });

  it('requires a note for theft and correction', () => {
    expect(() => createStockAdjustment(db, { reasonCode: 'theft', lines: [{ batchId, qtyDelta: -1 }] })).toThrow(/requires a note/);
    expect(() =>
      createStockAdjustment(db, { reasonCode: 'theft', note: 'فقد أثناء الجرد', lines: [{ batchId, qtyDelta: -1 }] })
    ).not.toThrow();
  });

  it('refuses an adjustment that changes nothing', () => {
    expect(() => createStockAdjustment(db, { reasonCode: 'count', lines: [{ batchId, countedQty: 50 }] })).toThrow(/matches/);
  });

  it('stock_adjustments and its moves are append-only', () => {
    const id = createStockAdjustment(db, { reasonCode: 'damage', lines: [{ batchId, qtyDelta: -1 }] });
    expect(() => db.prepare('DELETE FROM stock_adjustments WHERE id = ?').run(id)).toThrow(/immutable/);
    expect(() => db.prepare('UPDATE stock_moves SET qty_delta = 0').run()).toThrow(/immutable/);
  });
});

describe('writeOffExpired', () => {
  it('zeroes every expired batch (expiring today counts) in one adjustment', () => {
    db.prepare('UPDATE batches SET expiry_date = ? WHERE id = ?').run(todayLocal(), batchId);
    expect(searchItemStock(db, 'صنف للتسوية')[0]).toMatchObject({ qtyOnHand: 0, expiredQty: 50 });
    expect(getExpiryReport(db, todayLocal()).rows[0]!.bucket).toBe('expired');

    const result = writeOffExpired(db);
    expect(result).toMatchObject({ batchCount: 1 });
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(0);
    expect(writeOffExpired(db)).toBeNull();
  });
});
