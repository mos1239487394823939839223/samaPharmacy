import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse, createWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { getItemBatches, getBatchMoves } from './stock';
import {
  createSalesInvoice,
  confirmSalesInvoice,
  voidSalesInvoice,
  getSalesInvoice,
  getSalesLines,
} from './sales';

let db: Db;
let itemId: number;
let unitId: number;
let supplierId: number;
let warehouseId: number;

function yearsFromNow(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));

  itemId = createItem(db, { nameAr: 'صنف للبيع' });
  unitId = Number(
    db
      .prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
      .run(itemId, 'قرص').lastInsertRowid
  );
  supplierId = createSupplier(db, { nameAr: 'مورد للبيع' });
  warehouseId = getDefaultWarehouse(db).id;
});

/** Purchases and confirms qtyBase units into a batch at unitCost with optional expiry. */
function stockUp(qtyBase: number, unitCost: number, expiryDate?: string) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `SUP-${Math.random()}`,
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
        expiryDate: expiryDate ?? null,
        unitPurchasePrice: unitCost,
      },
    ],
  });
  confirmPurchaseInvoice(db, id);
}

function baseSaleLine(overrides: Partial<Parameters<typeof createSalesInvoice>[1]['lines'][0]> = {}) {
  return {
    lineNo: 1,
    itemId,
    unitId,
    unitFactor: 1,
    qtyInUnit: 5,
    unitPrice: 200,
    ...overrides,
  };
}

describe('createSalesInvoice', () => {
  it('allocates the sole available batch and snapshots its cost and expiry', () => {
    stockUp(100, 80, yearsFromNow(1));
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine()],
    });
    const [line] = getSalesLines(db, id);
    expect(line!.qtyBase).toBe(5);
    expect(line!.unitCost).toBe(80);
    expect(line!.expiryDate).toBe(yearsFromNow(1));
  });

  it('draws from the earliest-expiry batch first (FEFO)', () => {
    stockUp(10, 50, yearsFromNow(2));
    stockUp(10, 60, yearsFromNow(1));
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine({ qtyInUnit: 5 })],
    });
    const [line] = getSalesLines(db, id);
    expect(line!.unitCost).toBe(60); // the nearer-expiry batch
    expect(line!.expiryDate).toBe(yearsFromNow(1));
  });

  it('splits one entered line across batches into multiple physical rows when needed', () => {
    stockUp(3, 50, yearsFromNow(1));
    stockUp(100, 70, yearsFromNow(2));
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine({ qtyInUnit: 10 })],
    });
    const lines = getSalesLines(db, id);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.qtyBase + lines[1]!.qtyBase).toBe(10);
    // qty_in_unit is split proportionally so it reconciles to what was entered.
    expect(lines[0]!.qtyInUnit + lines[1]!.qtyInUnit).toBeCloseTo(10, 6);
  });

  it('does not touch qty_on_hand until confirm — a draft reserves nothing', () => {
    stockUp(100, 80);
    createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    const [batch] = getItemBatches(db, itemId);
    expect(batch!.qtyOnHand).toBe(100);
  });

  it('only allocates from batches in the requested warehouse, never another store', () => {
    const otherWarehouse = createWarehouse(db, { nameAr: 'مخزن آخر للبيع' });

    // Stock exists only in otherWarehouse, none in the default warehouse.
    const purchaseId = createPurchaseInvoice(db, {
      supplierInvoiceNo: `SUP-${Math.random()}`,
      supplierId,
      warehouseId: otherWarehouse,
      purchaseType: 'credit',
      invoiceDate: '2026-01-01',
      lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 100, qtyBase: 100, unitPurchasePrice: 50 }],
    });
    confirmPurchaseInvoice(db, purchaseId);

    // Selling from the default warehouse must fail -- the only stock is
    // physically in a different store and cannot be sold from here.
    expect(() =>
      createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] })
    ).toThrow();
  });

  it('BR-1: refuses a line with no sellable stock at all', () => {
    expect(() =>
      createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] })
    ).toThrow(/only \d+ available/);
  });

  it('BR-1: refuses to sell more than is on hand across all batches', () => {
    stockUp(3, 80);
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        lines: [baseSaleLine({ qtyInUnit: 10 })],
      })
    ).toThrow();
  });

  it('BR-1: an expired batch is never allocated, even if it is the only stock', () => {
    stockUp(50, 80, '2020-01-01'); // already expired
    expect(() =>
      createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] })
    ).toThrow();
  });

  it('computes ق.خ / ب.خ correctly with a line discount', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100, discountPct: 10 })],
    });
    const [line] = getSalesLines(db, id);
    expect(line!.valueBeforeDiscount).toBe(1000);
    expect(line!.discountAmt).toBe(100);
    expect(line!.valueAfterDiscount).toBe(900);
  });

  it('snapshots cost_total on the invoice for margin reporting', () => {
    stockUp(100, 60);
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine({ qtyInUnit: 10 })],
    });
    expect(getSalesInvoice(db, id)!.costTotal).toBe(600); // 10 * 60
  });

  it('attaches the currently open shift to a new sale automatically', () => {
    stockUp(100, 50);
    const shiftId = Number(
      db.prepare('INSERT INTO shifts (user_id, warehouse_id, opening_float) VALUES (1, ?, 0)')
        .run(warehouseId).lastInsertRowid
    );
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    const row = db.prepare('SELECT shift_id AS shiftId FROM sales_invoices WHERE id = ?').get(id) as {
      shiftId: number;
    };
    expect(row.shiftId).toBe(shiftId);
  });

  it('leaves shift_id NULL when no shift is open', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    const row = db.prepare('SELECT shift_id AS shiftId FROM sales_invoices WHERE id = ?').get(id) as {
      shiftId: number | null;
    };
    expect(row.shiftId).toBeNull();
  });

  it('assigns a sequential serial', () => {
    stockUp(100, 50);
    const a = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    stockUp(100, 50);
    const b = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    expect(getSalesInvoice(db, b)!.serial).toBe(getSalesInvoice(db, a)!.serial + 1);
  });
});

describe('confirmSalesInvoice', () => {
  it('decrements qty_on_hand and writes a matching negative stock_moves row (rule 8)', () => {
    stockUp(100, 80);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 10 })] });
    confirmSalesInvoice(db, id);

    const [batch] = getItemBatches(db, itemId);
    expect(batch!.qtyOnHand).toBe(90);

    const moves = getBatchMoves(db, batch!.id);
    const saleMove = moves.find((m) => m.moveType === 'sale');
    expect(saleMove!.qtyDelta).toBe(-10);
  });

  it('marks the invoice confirmed with a timestamp', () => {
    stockUp(100, 80);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);
    const invoice = getSalesInvoice(db, id)!;
    expect(invoice.status).toBe('confirmed');
    expect(invoice.confirmedAt).not.toBeNull();
  });

  it('refuses to confirm the same invoice twice', () => {
    stockUp(100, 80);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);
    expect(() => confirmSalesInvoice(db, id)).toThrow(/status "confirmed"/);
  });

  it('re-validates stock at confirm time and refuses if it fell below the draft snapshot', () => {
    stockUp(10, 80);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 10 })] });

    // Simulate another till selling from the same batch between draft and confirm.
    const [batch] = getItemBatches(db, itemId);
    db.prepare('UPDATE batches SET qty_on_hand = 2 WHERE id = ?').run(batch!.id);

    expect(() => confirmSalesInvoice(db, id)).toThrow(/Insufficient stock/);

    // Nothing committed: batch stays at the simulated 2, no stock_moves added.
    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(2);
    expect(getBatchMoves(db, batch!.id).some((m) => m.moveType === 'sale')).toBe(false);
    expect(getSalesInvoice(db, id)!.status).toBe('draft');
  });

  it('rolls back every line if one line fails partway through confirm', () => {
    stockUp(100, 50);
    const itemId2 = createItem(db, { nameAr: 'صنف ثانٍ للبيع' });
    const unitId2 = Number(
      db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
        .run(itemId2, 'قرص').lastInsertRowid
    );
    // No stock for item 2 at all -> createSalesInvoice itself would refuse,
    // so instead corrupt line 2's batch_id after a valid draft is created.
    stockUp(10, 50); // second batch for item 1 so line 2 can validly allocate first
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [
        baseSaleLine({ lineNo: 1, qtyInUnit: 5 }),
        baseSaleLine({ lineNo: 2, qtyInUnit: 3 }),
      ],
    });

    const lines = getSalesLines(db, id);
    db.pragma('foreign_keys = OFF');
    db.prepare('UPDATE sales_invoice_lines SET batch_id = 999999 WHERE id = ?').run(lines[1]!.id);
    db.pragma('foreign_keys = ON');

    expect(() => confirmSalesInvoice(db, id)).toThrow();

    // Line 1's batch must be untouched even though it would have succeeded alone.
    const totalOnHand = getItemBatches(db, itemId).reduce((s, b) => s + b.qtyOnHand, 0);
    expect(totalOnHand).toBe(110); // 100 + 10, nothing sold
    expect(getSalesInvoice(db, id)!.status).toBe('draft');
  });
});

describe('voidSalesInvoice', () => {
  it('voids a draft', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    voidSalesInvoice(db, id);
    expect(getSalesInvoice(db, id)!.status).toBe('voided');
  });

  it('refuses to void a confirmed invoice directly (rule 9 — use a return)', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);
    expect(() => voidSalesInvoice(db, id)).toThrow(/sales return/);
  });
});
