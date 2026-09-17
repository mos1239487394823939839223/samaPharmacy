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
import { createCustomer } from './customers';
import {
  createSalesInvoice,
  confirmSalesInvoice,
  voidSalesInvoice,
  getSalesInvoice,
  getSalesLines,
  getSalesReport,
  getSalesReportInvoices,
  getSalesTrend,
  getSalesInvoiceBySerial,
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

  it('rejects a negative discountPct instead of inflating the line above its own value', () => {
    stockUp(100, 50);
    // 10 * 100 = 1000 before discount; -100% used to double it to 2000.
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        paidCash: 2000,
        lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100, discountPct: -100 })],
      })
    ).toThrow(/discountPct must be between 0 and 100/);
  });

  it('rejects a discountPct over 100', () => {
    stockUp(100, 50);
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        lines: [baseSaleLine({ discountPct: 150 })],
      })
    ).toThrow(/discountPct must be between 0 and 100/);
  });

  it('rejects a discountAmt larger than the line value before discount', () => {
    stockUp(100, 50);
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        // 5 * 200 = 1000 before discount; 2000 exceeds it.
        lines: [baseSaleLine({ qtyInUnit: 5, unitPrice: 200, discountAmt: 2000 })],
      })
    ).toThrow(/discountAmt must be between 0/);
  });

  it('accepts a valid discountPct and computes the line total correctly', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 900,
      lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100, discountPct: 10 })], // 1000 - 10% = 900
    });
    expect(getSalesInvoice(db, id)!.total).toBe(900);
  });

  it('rejects a negative extraDiscountPct at the invoice header level', () => {
    stockUp(100, 50);
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        extraDiscountPct: -50,
        lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100 })],
      })
    ).toThrow(/extraDiscountPct must be between 0 and 100/);
  });

  it('rejects an extraDiscountAmt larger than the invoice subtotal', () => {
    stockUp(100, 50);
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        invoiceType: 'cash',
        extraDiscountAmt: 5000,
        lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100 })], // subtotal 1000
      })
    ).toThrow(/extraDiscountAmt must be between 0/);
  });

  it('rejects a non-zero paidCash on a credit invoice — the full total posts to the customer ledger on confirm regardless, so any paidCash would double-count the money', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل آجل بمبلغ مدفوع خطأ', mobile1: '0119999999' });
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        customerId,
        invoiceType: 'credit',
        paidCash: 2000, // the exact bug: the whole total sent as "paid cash" on a credit sale
        lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 200 })],
      })
    ).toThrow(/paidCash must be 0 for a credit invoice/);
  });

  it('accepts paidCash: 0 (or omitted) on a credit invoice', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل آجل سليم', mobile1: '0119999998' });
    expect(() =>
      createSalesInvoice(db, {
        warehouseId,
        customerId,
        invoiceType: 'credit',
        lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 200 })],
      })
    ).not.toThrow();
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

describe('getSalesInvoiceBySerial', () => {
  it('finds an invoice by its serial regardless of how many newer invoices exist', () => {
    stockUp(1000, 50);
    const target = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, target);
    const targetSerial = getSalesInvoice(db, target)!.serial;

    // Create enough newer invoices that a "fetch the most recent page and
    // scan it" approach would no longer see the target — the exact
    // scalability gap this lookup replaces.
    for (let i = 0; i < 10; i++) {
      const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
      confirmSalesInvoice(db, id);
    }

    const found = getSalesInvoiceBySerial(db, targetSerial);
    expect(found?.id).toBe(target);
  });

  it('returns undefined for a serial that does not exist', () => {
    expect(getSalesInvoiceBySerial(db, 999999)).toBeUndefined();
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



describe('getSalesReport / getSalesReportInvoices', () => {
  function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  it('sums confirmed cash and credit invoices separately for today', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل تقرير', mobile1: '0130000001' });

    const cashId = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 1000,
      lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100 })], // 1000
    });
    confirmSalesInvoice(db, cashId);

    const creditId = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'credit',
      lines: [baseSaleLine({ qtyInUnit: 5, unitPrice: 100 })], // 500
    });
    confirmSalesInvoice(db, creditId);

    const report = getSalesReport(db, todayStr(), todayStr());
    expect(report.invoiceCount).toBe(2);
    expect(report.cashTotal).toBe(1000);
    expect(report.creditTotal).toBe(500);
    expect(report.grandTotal).toBe(1500);
  });

  it('computes gross profit as grandTotal minus costTotal', () => {
    stockUp(100, 60); // cost 60/unit
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 1000,
      lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100 })], // sells at 100/unit
    });
    confirmSalesInvoice(db, id);

    const report = getSalesReport(db, todayStr(), todayStr());
    expect(report.grandTotal).toBe(1000); // 10 * 100
    expect(report.costTotal).toBe(600); // 10 * 60
    expect(report.grossProfit).toBe(400); // 1000 - 600
  });

  it('excludes a draft invoice — only confirmed sales count', () => {
    stockUp(100, 50);
    createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 1000,
      lines: [baseSaleLine({ qtyInUnit: 10, unitPrice: 100 })],
    });
    // never confirmed

    const report = getSalesReport(db, todayStr(), todayStr());
    expect(report.invoiceCount).toBe(0);
    expect(report.grandTotal).toBe(0);
  });

  it('excludes a voided invoice even if it was drafted today', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      lines: [baseSaleLine()],
    });
    voidSalesInvoice(db, id);

    const report = getSalesReport(db, todayStr(), todayStr());
    expect(report.invoiceCount).toBe(0);
  });

  it('excludes a sale confirmed outside the requested date range', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);
    // Force confirmed_at into the past, outside "today".
    db.prepare("UPDATE sales_invoices SET confirmed_at = '2020-01-01T10:00:00' WHERE id = ?").run(id);

    const report = getSalesReport(db, todayStr(), todayStr());
    expect(report.invoiceCount).toBe(0);
  });

  it('includes a sale confirmed at the very end of the "to" day (date-boundary check)', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);
    const today = todayStr();
    // 23:59:59 on the target day must still be included -- the naive bug this
    // guards against is comparing confirmed_at against a bare date string,
    // which in SQLite text comparison would exclude any time-of-day at all.
    db.prepare("UPDATE sales_invoices SET confirmed_at = ? WHERE id = ?").run(`${today}T23:59:59`, id);

    const report = getSalesReport(db, today, today);
    expect(report.invoiceCount).toBe(1);
  });

  it('getSalesReportInvoices lists the drill-down rows newest first', () => {
    stockUp(100, 50);
    const id1 = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id1);
    const id2 = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id2);

    const rows = getSalesReportInvoices(db, todayStr(), todayStr());
    expect(rows).toHaveLength(2);
    expect(rows[0]!.id).toBe(id2);
  });
});

describe('getSalesTrend', () => {
  function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  it('one grouped query matches calling getSalesReport once per day — same totals, same invoice counts', () => {
    stockUp(1000, 50);

    // Confirm sales on three different days by backdating confirmed_at,
    // same technique the existing boundary test above uses.
    const day2 = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 3, unitPrice: 100 })] });
    confirmSalesInvoice(db, day2);
    db.prepare("UPDATE sales_invoices SET confirmed_at = ? WHERE id = ?").run(`${daysAgo(2)}T10:00:00`, day2);

    const day1a = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 5, unitPrice: 100 })] });
    confirmSalesInvoice(db, day1a);
    db.prepare("UPDATE sales_invoices SET confirmed_at = ? WHERE id = ?").run(`${daysAgo(1)}T09:00:00`, day1a);

    const day1b = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 2, unitPrice: 100 })] });
    confirmSalesInvoice(db, day1b);
    db.prepare("UPDATE sales_invoices SET confirmed_at = ? WHERE id = ?").run(`${daysAgo(1)}T18:00:00`, day1b);

    const today = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine({ qtyInUnit: 1, unitPrice: 100 })] });
    confirmSalesInvoice(db, today);

    const trend = getSalesTrend(db, daysAgo(2), todayStr());

    // Cross-check every point against the existing, already-trusted
    // getSalesReport for that exact single day.
    for (const point of trend) {
      const dayReport = getSalesReport(db, point.date, point.date);
      expect(point.grandTotal).toBe(dayReport.grandTotal);
      expect(point.invoiceCount).toBe(dayReport.invoiceCount);
    }

    const byDate = new Map(trend.map((p) => [p.date, p]));
    expect(byDate.get(daysAgo(2))?.grandTotal).toBe(300); // 3 * 100
    expect(byDate.get(daysAgo(1))?.grandTotal).toBe(700); // (5+2) * 100
    expect(byDate.get(daysAgo(1))?.invoiceCount).toBe(2);
    expect(byDate.get(todayStr())?.grandTotal).toBe(100); // 1 * 100
  });

  it('a day with no confirmed sales is simply absent from the result, not a zero row', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] });
    confirmSalesInvoice(db, id);

    const trend = getSalesTrend(db, daysAgo(5), todayStr());
    expect(trend.find((p) => p.date === daysAgo(3))).toBeUndefined();
  });

  it('excludes draft and voided invoices, matching getSalesReport', () => {
    stockUp(100, 50);
    createSalesInvoice(db, { warehouseId, invoiceType: 'cash', lines: [baseSaleLine()] }); // never confirmed

    const trend = getSalesTrend(db, todayStr(), todayStr());
    expect(trend).toHaveLength(0);
  });
});
