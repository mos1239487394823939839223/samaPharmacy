import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier, getSupplierBalance } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice, confirmSalesInvoice } from './sales';
import { getItemBatches, getBatchMoves } from './stock';
import {
  createPurchaseReturn,
  getPurchaseReturn,
  getReturnablePurchaseLines,
} from './purchase-returns';

let db: Db;
let supplierId: number;
let warehouseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  supplierId = createSupplier(db, { nameAr: 'مورد لمرتجع شراء' });
  warehouseId = getDefaultWarehouse(db).id;
});

function makeItem(nameAr: string) {
  const itemId = createItem(db, { nameAr });
  const unitId = Number(
    db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
      .run(itemId, 'قرص').lastInsertRowid
  );
  return { itemId, unitId };
}

function purchase(itemId: number, unitId: number, qtyBase: number, unitCost: number) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `SUP-${Math.random()}`,
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: qtyBase, qtyBase, unitPurchasePrice: unitCost }],
  });
  confirmPurchaseInvoice(db, id);
  return id;
}

describe('createPurchaseReturn — against an invoice', () => {
  it('decrements the batch and records a purchase_return stock move', () => {
    const { itemId, unitId } = makeItem('صنف مرتجع شراء');
    const purchaseId = purchase(itemId, unitId, 100, 50);
    const [batch] = getItemBatches(db, itemId);
    expect(batch!.qtyOnHand).toBe(100);

    const returnId = createPurchaseReturn(db, {
      sourceInvoiceId: purchaseId,
      supplierId,
      warehouseId,
      lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 10, qtyBase: 10 }],
    });

    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(90);
    expect(getPurchaseReturn(db, returnId)!.total).toBe(500); // 10 * 50
    const moves = getBatchMoves(db, batch!.id);
    expect(moves.find((m) => m.moveType === 'purchase_return')?.qtyDelta).toBe(-10);
  });

  it('reduces the supplier balance (debit against the credit a purchase posts)', () => {
    const { itemId, unitId } = makeItem('صنف رصيد مورد');
    const purchaseId = purchase(itemId, unitId, 100, 50);
    const balanceAfterPurchase = getSupplierBalance(db, supplierId);
    expect(balanceAfterPurchase).toBe(5000); // 100 * 50

    const [batch] = getItemBatches(db, itemId);
    createPurchaseReturn(db, {
      sourceInvoiceId: purchaseId,
      supplierId,
      warehouseId,
      lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 20, qtyBase: 20 }],
    });

    expect(getSupplierBalance(db, supplierId)).toBe(4000); // 5000 - (20*50)
  });

  it('refuses to return more than is currently on hand', () => {
    const { itemId, unitId } = makeItem('صنف كمية غير كافية');
    purchase(itemId, unitId, 10, 50);
    const [batch] = getItemBatches(db, itemId);
    expect(() =>
      createPurchaseReturn(db, {
        sourceInvoiceId: null,
        supplierId,
        warehouseId,
        lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 20, qtyBase: 20 }],
      })
    ).toThrow(/only 10 remain/);
  });

  it('accounts for stock already sold when checking availability', () => {
    const { itemId, unitId } = makeItem('صنف تم بيع جزء منه');
    purchase(itemId, unitId, 20, 50);
    // Sell 15 of the 20, leaving only 5 available to return.
    const saleId = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 100000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 15, unitPrice: 100 }],
    });
    confirmSalesInvoice(db, saleId);

    const [batch] = getItemBatches(db, itemId);
    expect(batch!.qtyOnHand).toBe(5);

    expect(() =>
      createPurchaseReturn(db, {
        sourceInvoiceId: null,
        supplierId,
        warehouseId,
        lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 10, qtyBase: 10 }],
      })
    ).toThrow(/only 5 remain/);

    // But returning exactly what remains succeeds.
    expect(() =>
      createPurchaseReturn(db, {
        sourceInvoiceId: null,
        supplierId,
        warehouseId,
        lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 5, qtyBase: 5 }],
      })
    ).not.toThrow();
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(0);
  });

  it('getReturnablePurchaseLines reports how much has already been returned', () => {
    const { itemId, unitId } = makeItem('صنف تتبع مرتجع شراء');
    const purchaseId = purchase(itemId, unitId, 100, 50);
    const [batch] = getItemBatches(db, itemId);

    createPurchaseReturn(db, {
      sourceInvoiceId: purchaseId,
      supplierId,
      warehouseId,
      lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 15, qtyBase: 15 }],
    });

    const returnable = getReturnablePurchaseLines(db, purchaseId) as Array<{ alreadyReturnedQtyBase: number }>;
    expect(returnable[0]!.alreadyReturnedQtyBase).toBe(15);
  });
});

describe('createPurchaseReturn — general (مرتجعات شراء عام)', () => {
  it('does not require a source invoice', () => {
    const { itemId, unitId } = makeItem('صنف مرتجع عام شراء');
    purchase(itemId, unitId, 50, 50);
    const [batch] = getItemBatches(db, itemId);
    expect(() =>
      createPurchaseReturn(db, {
        supplierId,
        warehouseId,
        lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 5, qtyBase: 5 }],
      })
    ).not.toThrow();
  });
});

describe('rollback', () => {
  it('rolls back every line if one fails partway (multi-line, second line insufficient)', () => {
    const { itemId, unitId } = makeItem('صنف أول لتراجع شراء');
    const { itemId: itemId2, unitId: unitId2 } = makeItem('صنف ثانٍ لتراجع شراء');
    purchase(itemId, unitId, 100, 50);
    purchase(itemId2, unitId2, 5, 50); // only 5 units — line 2 will fail

    const [batch1] = getItemBatches(db, itemId);
    const [batch2] = getItemBatches(db, itemId2);
    const before1 = batch1!.qtyOnHand;

    expect(() =>
      createPurchaseReturn(db, {
        supplierId,
        warehouseId,
        lines: [
          { itemId, batchId: batch1!.id, unitId, qtyInUnit: 10, qtyBase: 10 },
          { itemId: itemId2, batchId: batch2!.id, unitId: unitId2, qtyInUnit: 10, qtyBase: 10 }, // exceeds the 5 on hand
        ],
      })
    ).toThrow();

    // Line 1 alone would have succeeded -- confirm it did NOT partially apply.
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(before1);
    expect(getSupplierBalance(db, supplierId)).toBe(100 * 50 + 5 * 50); // only the two purchases, no return posted
  });
});
