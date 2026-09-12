import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { createCustomer } from './customers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice, confirmSalesInvoice } from './sales';
import {
  openShift,
  closeShift,
  getShift,
  getOpenShift,
  computeExpectedCash,
  recordCashTransaction,
  getShiftCashTransactions,
  getShiftSalesSummary,
  listShifts,
} from './shifts';

let db: Db;
let itemId: number;
let unitId: number;
let supplierId: number;
let warehouseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));

  itemId = createItem(db, { nameAr: 'صنف للوردية' });
  unitId = Number(
    db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
      .run(itemId, 'قرص').lastInsertRowid
  );
  supplierId = createSupplier(db, { nameAr: 'مورد للوردية' });
  warehouseId = getDefaultWarehouse(db).id;
});

function stockUp(qtyBase: number, unitCost: number) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `SUP-${Math.random()}`,
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: qtyBase, qtyBase, unitPurchasePrice: unitCost }],
  });
  confirmPurchaseInvoice(db, id);
}

function makeCashSale(shiftAwareWarehouseId: number, qty: number, unitPrice: number) {
  const id = createSalesInvoice(db, {
    warehouseId: shiftAwareWarehouseId,
    invoiceType: 'cash',
    paidCash: qty * unitPrice,
    lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: qty, unitPrice }],
  });
  confirmSalesInvoice(db, id);
  return id;
}

describe('openShift', () => {
  it('opens with the declared float', () => {
    const id = openShift(db, warehouseId, 50000);
    const shift = getShift(db, id)!;
    expect(shift.openingFloat).toBe(50000);
    expect(shift.status).toBe('open');
  });

  it('refuses a second open shift on the same warehouse', () => {
    openShift(db, warehouseId, 50000);
    expect(() => openShift(db, warehouseId, 10000)).toThrow(/already has an open shift/);
  });

  it('allows a new shift once the previous one is closed', () => {
    const id = openShift(db, warehouseId, 50000);
    closeShift(db, id, { countedCash: 50000 });
    expect(() => openShift(db, warehouseId, 20000)).not.toThrow();
  });

  it('getOpenShift finds the currently open shift for a warehouse', () => {
    const id = openShift(db, warehouseId, 50000);
    expect(getOpenShift(db, warehouseId)?.id).toBe(id);
  });
});

describe('computeExpectedCash', () => {
  it('is just the opening float with no sales or movements', () => {
    const id = openShift(db, warehouseId, 30000);
    expect(computeExpectedCash(db, id)).toBe(30000);
  });

  it('adds confirmed cash sales made during the shift', () => {
    stockUp(100, 50);
    const id = openShift(db, warehouseId, 30000);
    makeCashSale(warehouseId, 10, 200); // 2000 piastres
    expect(computeExpectedCash(db, id)).toBe(32000);
  });

  it('excludes a CONFIRMED credit sale from expected cash', () => {
    // Must confirm the credit invoice, not leave it draft -- an unconfirmed
    // invoice is already excluded by status alone, which would let a bug
    // that drops the invoice_type filter (but keeps the status filter) pass
    // unnoticed. This isolates invoice_type as the property under test.
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل آجل للوردية', mobile1: '0100000001' });
    const id = openShift(db, warehouseId, 30000);
    const creditId = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'credit',
      paidCash: 1000, // even with a stray paid_cash value on a credit sale
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 5, unitPrice: 200 }],
    });
    confirmSalesInvoice(db, creditId);
    expect(computeExpectedCash(db, id)).toBe(30000);
  });

  it('excludes a draft cash sale — only confirmed sales count', () => {
    stockUp(100, 50);
    const id = openShift(db, warehouseId, 30000);
    createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 2000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 200 }],
    });
    expect(computeExpectedCash(db, id)).toBe(30000);
  });

  it('adds manual cash-in and subtracts cash-out', () => {
    const id = openShift(db, warehouseId, 30000);
    recordCashTransaction(db, id, 'in', 5000, 'safe_topup');
    recordCashTransaction(db, id, 'out', 1200, 'petty_cash');
    expect(computeExpectedCash(db, id)).toBe(30000 + 5000 - 1200);
  });

  it('only counts sales attached to this shift, not sales from a previous one', () => {
    stockUp(100, 50);
    const shift1 = openShift(db, warehouseId, 10000);
    makeCashSale(warehouseId, 5, 200); // 1000, belongs to shift1
    closeShift(db, shift1, { countedCash: 11000 });

    const shift2 = openShift(db, warehouseId, 20000);
    // No sales yet in shift2.
    expect(computeExpectedCash(db, shift2)).toBe(20000);
  });
});

describe('closeShift', () => {
  it('records a zero variance when the count matches exactly', () => {
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 30000 });
    const shift = getShift(db, id)!;
    expect(shift.variance).toBe(0);
    expect(shift.status).toBe('closed');
    expect(shift.closedAt).not.toBeNull();
  });

  it('requires a note when the variance is non-zero (spec M8)', () => {
    const id = openShift(db, warehouseId, 30000);
    expect(() => closeShift(db, id, { countedCash: 29000 })).toThrow(/requires a note/);
  });

  it('accepts a non-zero variance when a note is given', () => {
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 29000, varianceNote: 'شيك مرتجع' });
    const shift = getShift(db, id)!;
    expect(shift.variance).toBe(-1000);
    expect(shift.varianceNote).toBe('شيك مرتجع');
  });

  it('BR-10: refuses to close an already-closed shift', () => {
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 30000 });
    expect(() => closeShift(db, id, { countedCash: 30000 })).toThrow(/already closed/);
  });

  it('records who the drawer was handed to', () => {
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 30000, handedTo: 1 });
    expect(getShift(db, id)!.handedTo).toBe(1);
  });
});

describe('BR-10: a closed shift is immutable', () => {
  it('refuses a cash transaction against a closed shift', () => {
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 30000 });
    expect(() => recordCashTransaction(db, id, 'in', 500)).toThrow(/closed/);
  });

  it('a sale made after the shift closes does not retroactively attach to it', () => {
    stockUp(100, 50);
    const id = openShift(db, warehouseId, 30000);
    closeShift(db, id, { countedCash: 30000 });

    // No open shift now, so this sale gets shift_id = NULL, not the closed one.
    const saleId = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 2000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 200 }],
    });
    const row = db.prepare('SELECT shift_id AS shiftId FROM sales_invoices WHERE id = ?').get(saleId) as {
      shiftId: number | null;
    };
    expect(row.shiftId).toBeNull();

    // And the closed shift's expected cash must not silently change either.
    expect(getShift(db, id)!.expectedCash).toBe(30000);
  });
});

describe('recordCashTransaction', () => {
  it('rejects a non-positive amount', () => {
    const id = openShift(db, warehouseId, 30000);
    expect(() => recordCashTransaction(db, id, 'in', 0)).toThrow(RangeError);
    expect(() => recordCashTransaction(db, id, 'out', -100)).toThrow(RangeError);
  });

  it('lists transactions for a shift in order', () => {
    const id = openShift(db, warehouseId, 30000);
    recordCashTransaction(db, id, 'out', 100, 'a');
    recordCashTransaction(db, id, 'in', 200, 'b');
    const list = getShiftCashTransactions(db, id);
    expect(list.map((t) => t.category)).toEqual(['a', 'b']);
  });
});

describe('getShiftSalesSummary', () => {
  it('separates cash and credit totals and only counts confirmed sales', () => {
    stockUp(1000, 50);
    const id = openShift(db, warehouseId, 0);
    makeCashSale(warehouseId, 10, 200); // 2000 cash

    const creditCustomerId = createCustomer(db, { name: 'عميل ملخص الوردية', mobile1: '0100000002' });
    const creditId = createSalesInvoice(db, {
      warehouseId,
      customerId: creditCustomerId,
      invoiceType: 'credit',
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 5, unitPrice: 300 }],
    });
    confirmSalesInvoice(db, creditId); // 1500 credit, confirmed

    const summary = getShiftSalesSummary(db, id);
    expect(summary.count).toBe(2);
    expect(summary.cashTotal).toBe(2000);
    expect(summary.creditTotal).toBe(1500);
  });
});

describe('listShifts', () => {
  it('returns shifts newest first', () => {
    const a = openShift(db, warehouseId, 100);
    closeShift(db, a, { countedCash: 100 });
    const b = openShift(db, warehouseId, 200);
    const list = listShifts(db);
    expect(list[0]!.id).toBe(b);
  });
});
