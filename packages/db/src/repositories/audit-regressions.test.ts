/**
 * Regression tests for the October 2026 audit (R1–R15). Each one reproduced
 * a real defect; each now asserts the corrected behaviour. They use a
 * realistic unit set — box of 20 tablets — because every earlier test used a
 * single factor-1 unit, which is exactly why these defects went unnoticed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, deactivateItem, findByBarcode, getItem, getItemUnits, updateItem } from './items';
import { createSupplier, getSupplierBalance } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import {
  checkoutSalesInvoice,
  confirmSalesInvoice,
  createSalesInvoice,
  getSalesInvoice,
  getSalesLines,
} from './sales';
import { createSalesReturn, getReturnableLines, getSalesReturn } from './sales-returns';
import { createPurchaseReturn } from './purchase-returns';
import { closeShift, computeExpectedCash, getShift, openShift } from './shifts';
import { createCustomer, getCustomerBalance, getCustomerLedger, recordCustomerPayment } from './customers';
import { getItemBatches, verifyBatchLedger } from './stock';
import { FUTURE_EXPIRY } from '../test-helpers';

let db: Db;
let supplierId: number;
let wh: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  supplierId = createSupplier(db, { nameAr: 'مورد' });
  wh = getDefaultWarehouse(db).id;
});

/** A box of 20 tablets at 100.00, a strip of 10 at 50.00, a tablet at 5.00; public price 100.00 per box. */
function boxItem(opts: { storage?: 'room' | 'fridge'; boxPrice?: number } = {}) {
  const boxPrice = opts.boxPrice ?? 10000;
  const itemId = createItem(db, {
    nameAr: `صنف ${Math.random()}`,
    storageCondition: opts.storage ?? 'room',
    publicPrice: boxPrice,
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: Math.ceil(boxPrice / 20), isBase: true },
      { nameAr: 'شريط', factor: 10, salePrice: Math.ceil(boxPrice / 2), isBase: false },
      { nameAr: 'علبة', factor: 20, salePrice: boxPrice, isBase: false, isDefaultSale: true },
    ],
  });
  const units = getItemUnits(db, itemId) as Array<{ id: number; factor: number }>;
  const unit = (f: number) => units.find((u) => u.factor === f)!.id;
  return { itemId, tablet: unit(1), strip: unit(10), box: unit(20) };
}

function stock(itemId: number, unitId: number, qty: number, cost = 300, batchNumber: string | null = 'LOT-1') {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `S${Math.random()}`,
    supplierId,
    warehouseId: wh,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: qty, unitPurchasePrice: cost, batchNumber, expiryDate: FUTURE_EXPIRY }],
  });
  confirmPurchaseInvoice(db, id);
  return id;
}

const onHand = (itemId: number) => getItemBatches(db, itemId).reduce((s, b) => s + b.qtyOnHand, 0);

describe('R1 — returns are refunded at what was paid, in the unit chosen', () => {
  it('returning a whole box sold at 100.00 refunds 100.00 and restocks 20 tablets', () => {
    const { itemId, tablet, box } = boxItem();
    stock(itemId, tablet, 100);
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 1 }] });
    const [line] = getReturnableLines(db, inv);
    const rid = createSalesReturn(db, {
      sourceInvoiceId: inv,
      warehouseId: wh,
      lines: [{ sourceLineId: line!.sourceLineId, unitId: box, qtyInUnit: 1 }],
    });
    expect(getSalesReturn(db, rid)!.total).toBe(10000);
    expect(onHand(itemId)).toBe(100);
  });

  it('returning one strip of a box refunds half, and the rest of the box is still returnable', () => {
    const { itemId, tablet, strip, box } = boxItem();
    stock(itemId, tablet, 100);
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 1 }] });
    const [line] = getReturnableLines(db, inv);
    const r1 = createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: strip, qtyInUnit: 1 }] });
    expect(getSalesReturn(db, r1)!.total).toBe(5000);
    const r2 = createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 10 }] });
    expect(getSalesReturn(db, r2)!.total).toBe(5000);
    expect(() =>
      createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] })
    ).toThrow(/only 0 remain/);
  });
});

describe('R2 — no returns against an invoice that was never sold', () => {
  it('rejects a return against a draft invoice', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const inv = createSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const [line] = getReturnableLines(db, inv);
    expect(() =>
      createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] })
    ).toThrow(/not confirmed/);
    expect(onHand(itemId)).toBe(10);
  });
});

describe('R3 — refunds net out line and invoice discounts', () => {
  it('a line sold at 5.00 with 1.00 discount refunds 4.00', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1, discountAmt: 100 }],
    });
    const [line] = getReturnableLines(db, inv);
    const rid = createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] });
    expect(getSalesReturn(db, rid)!.total).toBe(400);
  });

  it('the invoice-level extra discount is shared across lines and never refunded', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      extraDiscountAmt: 100,
      lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 2 }],
    });
    expect(getSalesInvoice(db, inv)!.total).toBe(900);
    const [line] = getReturnableLines(db, inv);
    const rid = createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 2 }] });
    expect(getSalesReturn(db, rid)!.total).toBe(900);
  });
});

describe('R4 — the drawer expects what was kept, not what was handed over', () => {
  it('a 5.00 sale paid with a 200.00 note adds 5.00 to expected cash', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const shift = openShift(db, wh, 0);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      cashTendered: 20000,
      lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }],
    });
    expect(computeExpectedCash(db, shift)).toBe(500);
    expect(getSalesInvoice(db, inv)!.cashTendered).toBe(20000);
  });

  it('rejects tendered cash below the total', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    expect(() =>
      checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', cashTendered: 100, lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] })
    ).toThrow(/less than the total/);
  });

  it('a customer paying their debt in cash is expected in the drawer', () => {
    const shift = openShift(db, wh, 0);
    const c = createCustomer(db, { name: 'عميل', mobile1: '01000000000', openingBalance: 5000 });
    recordCustomerPayment(db, c, 3000);
    expect(computeExpectedCash(db, shift)).toBe(3000);
    expect(getCustomerBalance(db, c)).toBe(2000);
  });
});

describe('R5 — refrigerated returns with a batch number reach quarantine', () => {
  it('no UNIQUE conflict: the quarantine twin coexists with the original batch', () => {
    const { itemId, tablet } = boxItem({ storage: 'fridge' });
    stock(itemId, tablet, 10, 300, 'LOT-F');
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const [line] = getReturnableLines(db, inv);
    createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] });
    const batches = getItemBatches(db, itemId);
    expect(batches).toHaveLength(2);
    expect(batches.find((b) => b.isQuarantined)!.qtyOnHand).toBe(1);
    for (const b of batches) expect(verifyBatchLedger(db, b.id).matches).toBe(true);
  });

  it('a later purchase of the same lot never merges into the quarantine twin', () => {
    const { itemId, tablet } = boxItem({ storage: 'fridge' });
    stock(itemId, tablet, 10, 300, 'LOT-F');
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const [line] = getReturnableLines(db, inv);
    createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] });
    stock(itemId, tablet, 5, 300, 'LOT-F');
    const sellable = getItemBatches(db, itemId).find((b) => !b.isQuarantined)!;
    expect(sellable.qtyOnHand).toBe(14);
  });
});

describe('R6/R7 — the server owns prices, factors and integer money', () => {
  it('half a box at 10.01 is stored as a whole number of piastres', () => {
    const { itemId, tablet, box } = boxItem({ boxPrice: 1001 });
    stock(itemId, tablet, 100);
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 0.5 }] });
    const row = db.prepare('SELECT total, typeof(total) AS t FROM sales_invoices WHERE id = ?').get(inv) as { total: number; t: string };
    expect(row.t).toBe('integer');
    expect(row.total).toBe(501);
  });

  it('ignores a forged unitFactor and refuses a price above the list price', () => {
    const { itemId, tablet, box } = boxItem();
    stock(itemId, tablet, 100);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      lines: [{ lineNo: 1, itemId, unitId: box, unitFactor: 1, qtyInUnit: 1 }],
    });
    expect(getSalesLines(db, inv)[0]!.qtyBase).toBe(20);
    expect(() =>
      checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 1, unitPrice: 999999 }] })
    ).toThrow(/above the unit's list price/);
  });

  it('refuses a fractional tablet', () => {
    const { itemId, tablet, box } = boxItem();
    stock(itemId, tablet, 100);
    expect(() =>
      checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 1.33 }] })
    ).toThrow(/not a whole number/);
  });

  it('a split across two batches adds up to the line exactly', () => {
    const { itemId, tablet, box } = boxItem({ boxPrice: 1001 });
    stock(itemId, tablet, 7, 300, 'A');
    stock(itemId, tablet, 100, 310, 'B');
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: box, qtyInUnit: 1 }] });
    const lines = getSalesLines(db, inv);
    expect(lines).toHaveLength(2);
    expect(lines.reduce((s, l) => s + l.valueAfterDiscount, 0)).toBe(getSalesInvoice(db, inv)!.total);
  });

  it('a failed checkout leaves nothing behind', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 1);
    const before = (db.prepare('SELECT COUNT(*) AS c FROM sales_invoices').get() as { c: number }).c;
    expect(() =>
      checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 5 }] })
    ).toThrow();
    expect((db.prepare('SELECT COUNT(*) AS c FROM sales_invoices').get() as { c: number }).c).toBe(before);
  });
});

describe('R8 — cash purchases are paid on the spot', () => {
  it('leaves the supplier balance unchanged and marks the invoice paid', () => {
    const { itemId, tablet } = boxItem();
    const id = createPurchaseInvoice(db, {
      supplierInvoiceNo: 'C1',
      supplierId,
      warehouseId: wh,
      purchaseType: 'cash',
      invoiceDate: '2026-01-01',
      lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 10, unitPurchasePrice: 300, expiryDate: FUTURE_EXPIRY }],
    });
    confirmPurchaseInvoice(db, id);
    expect(getSupplierBalance(db, supplierId)).toBe(0);
    expect((db.prepare('SELECT paid FROM purchase_invoices WHERE id = ?').get(id) as { paid: number }).paid).toBe(3000);
  });

  it('expenses are owed to the supplier (decision D12)', () => {
    const { itemId, tablet } = boxItem();
    const id = createPurchaseInvoice(db, {
      supplierInvoiceNo: 'E1',
      supplierId,
      warehouseId: wh,
      purchaseType: 'credit',
      invoiceDate: '2026-01-01',
      expenses: 500,
      lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 10, unitPurchasePrice: 300, expiryDate: FUTURE_EXPIRY }],
    });
    confirmPurchaseInvoice(db, id);
    expect(getSupplierBalance(db, supplierId)).toBe(3500);
  });
});

describe('R9 — purchase input is validated before it is stored', () => {
  const line = (over: Record<string, unknown> = {}) => ({ lineNo: 1, unitPurchasePrice: 300, qtyInUnit: 10, expiryDate: FUTURE_EXPIRY, ...over });
  it.each([
    ['a discount over 100%', { discountPct: 150 }, /between 0 and 100/],
    ['an expired expiry date', { expiryDate: '2020-01-01' }, /not in the future/],
    ['a blank expiry date', { expiryDate: null }, /Expiry date required/],
    ['an impossible date', { expiryDate: '2099-02-30' }, /not a valid date/],
  ])('rejects %s', (_label, over, msg) => {
    const { itemId, tablet } = boxItem();
    expect(() =>
      createPurchaseInvoice(db, {
        supplierInvoiceNo: 'X',
        supplierId,
        warehouseId: wh,
        purchaseType: 'credit',
        invoiceDate: '2026-01-01',
        lines: [{ ...line(over), itemId, unitId: tablet }],
      })
    ).toThrow(msg);
  });

  it('rejects an invalid invoice date and a duplicate supplier invoice number', () => {
    const { itemId, tablet } = boxItem();
    const base = { supplierInvoiceNo: 'DUP', supplierId, warehouseId: wh, purchaseType: 'credit' as const, lines: [{ ...line(), itemId, unitId: tablet }] };
    expect(() => createPurchaseInvoice(db, { ...base, invoiceDate: 'not-a-date' })).toThrow(/not a valid date/);
    createPurchaseInvoice(db, { ...base, invoiceDate: '2026-01-01' });
    expect(() => createPurchaseInvoice(db, { ...base, invoiceDate: '2026-01-01' })).toThrow(/already entered/);
  });
});

describe('R10/R11 — items', () => {
  it('editing an item keeps fields the form never sent', () => {
    db.prepare("INSERT INTO manufacturers (id, name_ar) VALUES (7, 'شركة')").run();
    const id = createItem(db, { nameAr: 'أ', manufacturerId: 7 });
    expect(getItem(db, id)!.manufacturerId).toBe(7);
    updateItem(db, id, { nameAr: 'أ معدل' });
    expect(getItem(db, id)!.manufacturerId).toBe(7);
  });

  it('a deactivated item no longer resolves by barcode', () => {
    const id = createItem(db, { nameAr: 'ب', barcodes: ['6221234567890'] });
    deactivateItem(db, id);
    expect(findByBarcode(db, '6221234567890')).toBeUndefined();
  });

  it('BR-4: a strip priced above its share of the box public price is refused', () => {
    expect(() =>
      createItem(db, {
        nameAr: 'ج',
        publicPrice: 10000,
        units: [
          { nameAr: 'قرص', factor: 1, salePrice: 500, isBase: true },
          { nameAr: 'شريط', factor: 10, salePrice: 6000, isBase: false },
          { nameAr: 'علبة', factor: 20, salePrice: 10000, isBase: false },
        ],
      })
    ).toThrow(/exceeds its share of the public price/);
  });

  it('a duplicate barcode is a clear error, not a SQL constraint failure', () => {
    createItem(db, { nameAr: 'د', barcodes: ['111'] });
    expect(() => createItem(db, { nameAr: 'هـ', barcodes: ['111'] })).toThrow(/already belongs/);
  });
});

describe('R12 — a draft confirmed after its shift closed lands in the open shift', () => {
  it('moves to the currently open shift', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const s1 = openShift(db, wh, 0);
    const inv = createSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    closeShift(db, s1, { countedCash: 0 });
    const s2 = openShift(db, wh, 0);
    confirmSalesInvoice(db, inv);
    expect(computeExpectedCash(db, s2)).toBe(500);
    expect(getShift(db, s1)!.expectedCash).toBe(0);
  });
});

describe('R13/R14 — returns must match what was actually bought or sold', () => {
  it('purchase return refuses a batch of another item', () => {
    const a = boxItem();
    const b = boxItem();
    stock(a.itemId, a.tablet, 10);
    const batchA = getItemBatches(db, a.itemId)[0]!.id;
    expect(() =>
      createPurchaseReturn(db, { supplierId, warehouseId: wh, lines: [{ itemId: b.itemId, batchId: batchA, unitId: b.tablet, qtyInUnit: 1 }] })
    ).toThrow(/not a batch of item/);
  });

  it('sales return refuses a line from another invoice', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const inv1 = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const inv2 = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const [line2] = getReturnableLines(db, inv2);
    expect(() =>
      createSalesReturn(db, { sourceInvoiceId: inv1, warehouseId: wh, lines: [{ sourceLineId: line2!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] })
    ).toThrow(/is not on invoice/);
  });

  it('a credit invoice is refunded on account, never in cash (decision D11)', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const c = createCustomer(db, { name: 'آجل', mobile1: '01000000001', paymentMethod: 'credit' });
    const shift = openShift(db, wh, 0);
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'credit', customerId: c, lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 2 }] });
    const [line] = getReturnableLines(db, inv);
    expect(() =>
      createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, refundMethod: 'cash', lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] })
    ).toThrow(/refund must be "account"/);
    createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: tablet, qtyInUnit: 1 }] });
    expect(getCustomerBalance(db, c)).toBe(500);
    expect(getCustomerLedger(db, c)[0]).toMatchObject({ entryType: 'return', refTable: 'sales_returns' });
    expect(computeExpectedCash(db, shift)).toBe(0);
  });
});

describe('R15 — timestamps are local wall-clock time', () => {
  it('confirmed_at matches the local clock, not UTC', () => {
    const { itemId, tablet } = boxItem();
    stock(itemId, tablet, 10);
    const inv = checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId, unitId: tablet, qtyInUnit: 1 }] });
    const { diff } = db
      .prepare("SELECT ABS(julianday(confirmed_at) - julianday('now','localtime')) * 86400 AS diff FROM sales_invoices WHERE id = ?")
      .get(inv) as { diff: number };
    expect(diff).toBeLessThan(5);
  });
});
