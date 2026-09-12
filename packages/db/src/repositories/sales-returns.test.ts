import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { createCustomer, getCustomerBalance } from './customers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice, confirmSalesInvoice, getSalesLines } from './sales';
import { getItemBatches, getBatchMoves } from './stock';
import { createSalesReturn, getSalesReturn, getSalesReturnLines, getReturnableLines } from './sales-returns';

let db: Db;
let unitId: number;
let supplierId: number;
let warehouseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  supplierId = createSupplier(db, { nameAr: 'مورد للمرتجع' });
  warehouseId = getDefaultWarehouse(db).id;
});

function makeItem(nameAr: string, storageCondition: 'room' | 'fridge' | 'freezer' = 'room', publicPrice: number | null = null) {
  const itemId = createItem(db, { nameAr, storageCondition, publicPrice });
  const uId = Number(
    db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
      .run(itemId, 'قرص').lastInsertRowid
  );
  return { itemId, unitId: uId };
}

function stockUp(itemId: number, uId: number, qtyBase: number, unitCost: number) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `SUP-${Math.random()}`,
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId: uId, qtyInUnit: qtyBase, qtyBase, unitPurchasePrice: unitCost }],
  });
  confirmPurchaseInvoice(db, id);
}

function sell(itemId: number, uId: number, qty: number, unitPrice: number, customerId?: number, invoiceType: 'cash' | 'credit' = 'cash') {
  const id = createSalesInvoice(db, {
    warehouseId,
    customerId: customerId ?? null,
    invoiceType,
    paidCash: invoiceType === 'cash' ? qty * unitPrice : 0,
    lines: [{ lineNo: 1, itemId, unitId: uId, unitFactor: 1, qtyInUnit: qty, unitPrice }],
  });
  confirmSalesInvoice(db, id);
  return id;
}

describe('createSalesReturn — against an invoice (مرتجع فواتير البيع)', () => {
  it('returns stock to the original batch and records a sale_return move', () => {
    const { itemId, unitId: uId } = makeItem('صنف مرتجع فاتورة');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);
    const [batchBefore] = getItemBatches(db, itemId);
    expect(batchBefore!.qtyOnHand).toBe(90);

    const returnId = createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      lines: [
        {
          itemId,
          batchId: saleLine!.batchId,
          unitId: uId,
          qtyInUnit: 3,
          qtyBase: 3,
          unitPrice: 200,
          sourceLineId: saleLine!.id,
        },
      ],
    });

    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(93);
    expect(getSalesReturn(db, returnId)!.total).toBe(600);
    const moves = getBatchMoves(db, saleLine!.batchId);
    expect(moves.find((m) => m.moveType === 'sale_return')?.qtyDelta).toBe(3);
  });

  it('does not require approvedBy when a source invoice is given', () => {
    const { itemId, unitId: uId } = makeItem('صنف بدون موافقة');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);
    expect(() =>
      createSalesReturn(db, {
        sourceInvoiceId: invoiceId,
        warehouseId,
        refundMethod: 'cash',
        lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 200 }],
      })
    ).not.toThrow();
  });

  it('getReturnableLines reports how much of a sold line has already been returned', () => {
    const { itemId, unitId: uId } = makeItem('صنف تتبع مرتجع');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 4, qtyBase: 4, unitPrice: 200, sourceLineId: saleLine!.id }],
    });

    const returnable = getReturnableLines(db, invoiceId) as Array<{ alreadyReturnedQtyBase: number }>;
    expect(returnable[0]!.alreadyReturnedQtyBase).toBe(4);
  });

  it('reverses a credit sale via the account refund method', () => {
    const { itemId, unitId: uId } = makeItem('صنف مرتجع آجل');
    stockUp(itemId, uId, 100, 50);
    const customerId = createCustomer(db, { name: 'عميل مرتجع', mobile1: '0120000001' });
    const invoiceId = sell(itemId, uId, 10, 200, customerId, 'credit');
    expect(getCustomerBalance(db, customerId)).toBe(2000);

    const [saleLine] = getSalesLines(db, invoiceId);
    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      customerId,
      refundMethod: 'account',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 5, qtyBase: 5, unitPrice: 200, sourceLineId: saleLine!.id }],
    });

    expect(getCustomerBalance(db, customerId)).toBe(1000); // 2000 - 1000 refunded
  });
});

describe('createSalesReturn — general return (مرتجع بيع عام)', () => {
  it('requires approvedBy when there is no source invoice', () => {
    const { itemId, unitId: uId } = makeItem('صنف بلا فاتورة', 'room', 5000);
    stockUp(itemId, uId, 10, 50);
    // Return against a batch that exists from the purchase, no invoice at all.
    const [batch] = getItemBatches(db, itemId);
    expect(() =>
      createSalesReturn(db, {
        warehouseId,
        refundMethod: 'cash',
        lines: [{ itemId, batchId: batch!.id, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 4000 }],
      })
    ).toThrow(/requires approvedBy/);
  });

  it('caps the refunded price at public_price with no invoice to check against', () => {
    const { itemId, unitId: uId } = makeItem('صنف بسعر أعلى', 'room', 3000);
    stockUp(itemId, uId, 10, 50);
    const [batch] = getItemBatches(db, itemId);
    expect(() =>
      createSalesReturn(db, {
        warehouseId,
        approvedBy: 1,
        refundMethod: 'cash',
        lines: [{ itemId, batchId: batch!.id, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 4000 }],
      })
    ).toThrow(/exceeds its public price/);
  });

  it('allows a refund exactly at public_price', () => {
    const { itemId, unitId: uId } = makeItem('صنف بسعر مطابق', 'room', 3000);
    stockUp(itemId, uId, 10, 50);
    const [batch] = getItemBatches(db, itemId);
    expect(() =>
      createSalesReturn(db, {
        warehouseId,
        approvedBy: 1,
        refundMethod: 'cash',
        lines: [{ itemId, batchId: batch!.id, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 3000 }],
      })
    ).not.toThrow();
  });

  it('succeeds with approvedBy set', () => {
    const { itemId, unitId: uId } = makeItem('صنف بموافقة', 'room', 5000);
    stockUp(itemId, uId, 10, 50);
    const [batch] = getItemBatches(db, itemId);
    const returnId = createSalesReturn(db, {
      warehouseId,
      approvedBy: 1,
      refundMethod: 'cash',
      lines: [{ itemId, batchId: batch!.id, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 4000 }],
    });
    expect(getSalesReturn(db, returnId)!.approvedBy).toBe(1);
  });
});

describe('BR-12: refrigerated stock quarantine', () => {
  it('routes a refrigerated item to quarantine automatically, never back to sellable stock', () => {
    const { itemId, unitId: uId } = makeItem('دواء مبرد', 'fridge');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);
    const sellableBefore = getItemBatches(db, itemId).find((b) => b.isQuarantined === 0)!.qtyOnHand;

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 3, qtyBase: 3, unitPrice: 200, sourceLineId: saleLine!.id }],
    });

    const batches = getItemBatches(db, itemId);
    const sellable = batches.find((b) => b.isQuarantined === 0)!;
    const quarantined = batches.find((b) => b.isQuarantined === 1)!;
    expect(sellable.qtyOnHand).toBe(sellableBefore); // unchanged -- returned stock did NOT go here
    expect(quarantined.qtyOnHand).toBe(3);
  });

  it('routes damaged goods to quarantine even for a room-temperature item', () => {
    const { itemId, unitId: uId } = makeItem('صنف تالف', 'room');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 2, qtyBase: 2, unitPrice: 200, sourceLineId: saleLine!.id, damaged: true }],
    });

    const quarantined = getItemBatches(db, itemId).find((b) => b.isQuarantined === 1);
    expect(quarantined?.qtyOnHand).toBe(2);
  });

  it('allows overriding refrigerated quarantine back to sellable stock, but only with a note', () => {
    const { itemId, unitId: uId } = makeItem('دواء مبرد بتجاوز', 'fridge');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);
    const sellableBefore = getItemBatches(db, itemId).find((b) => b.isQuarantined === 0)!.qtyOnHand;

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      overrideNote: 'تم فحص السلسلة الباردة من الصيدلي المسؤول',
      lines: [
        {
          itemId,
          batchId: saleLine!.batchId,
          unitId: uId,
          qtyInUnit: 3,
          qtyBase: 3,
          unitPrice: 200,
          sourceLineId: saleLine!.id,
          overrideRefrigeratedQuarantine: true,
        },
      ],
    });

    const sellable = getItemBatches(db, itemId).find((b) => b.isQuarantined === 0)!;
    expect(sellable.qtyOnHand).toBe(sellableBefore + 3);
  });

  it('ignores the override flag if no note is provided — quarantine still applies', () => {
    const { itemId, unitId: uId } = makeItem('دواء مبرد بدون سبب', 'fridge');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);
    const sellableBefore = getItemBatches(db, itemId).find((b) => b.isQuarantined === 0)!.qtyOnHand;

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId,
      warehouseId,
      refundMethod: 'cash',
      // overrideNote deliberately omitted
      lines: [
        {
          itemId,
          batchId: saleLine!.batchId,
          unitId: uId,
          qtyInUnit: 3,
          qtyBase: 3,
          unitPrice: 200,
          sourceLineId: saleLine!.id,
          overrideRefrigeratedQuarantine: true,
        },
      ],
    });

    const sellable = getItemBatches(db, itemId).find((b) => b.isQuarantined === 0)!;
    expect(sellable.qtyOnHand).toBe(sellableBefore); // override without a note did nothing
  });

  it('merges repeated quarantine returns of the same item/batch/cost into one quarantine batch', () => {
    const { itemId, unitId: uId } = makeItem('دواء مبرد متكرر', 'fridge');
    stockUp(itemId, uId, 100, 50);
    const invoiceId = sell(itemId, uId, 10, 200);
    const [saleLine] = getSalesLines(db, invoiceId);

    createSalesReturn(db, {
      sourceInvoiceId: invoiceId, warehouseId, refundMethod: 'cash',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 200, sourceLineId: saleLine!.id }],
    });
    createSalesReturn(db, {
      sourceInvoiceId: invoiceId, warehouseId, refundMethod: 'cash',
      lines: [{ itemId, batchId: saleLine!.batchId, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 200, sourceLineId: saleLine!.id }],
    });

    const quarantineBatches = getItemBatches(db, itemId).filter((b) => b.isQuarantined === 1);
    expect(quarantineBatches).toHaveLength(1);
    expect(quarantineBatches[0]!.qtyOnHand).toBe(2);
  });
});

describe('rollback', () => {
  it('rolls back everything if one line in a multi-line return fails', () => {
    const { itemId, unitId: uId } = makeItem('صنف أول للتراجع');
    const { itemId: itemId2, unitId: uId2 } = makeItem('صنف ثانٍ للتراجع');
    stockUp(itemId, uId, 100, 50);
    stockUp(itemId2, uId2, 100, 50);
    const invoiceId = sell(itemId, uId, 5, 200);
    const lines = getSalesLines(db, invoiceId);

    const before = getItemBatches(db, itemId)[0]!.qtyOnHand;

    expect(() =>
      createSalesReturn(db, {
        sourceInvoiceId: invoiceId,
        warehouseId,
        refundMethod: 'cash',
        lines: [
          { itemId, batchId: lines[0]!.batchId, unitId: uId, qtyInUnit: 1, qtyBase: 1, unitPrice: 200, sourceLineId: lines[0]!.id },
          { itemId: itemId2, batchId: 999999, unitId: uId2, qtyInUnit: 1, qtyBase: 1, unitPrice: 200 },
        ],
      })
    ).toThrow();

    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(before);
  });
});
