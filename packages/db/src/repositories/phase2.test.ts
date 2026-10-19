/**
 * Users & audit, narcotics register & prescriptions, held invoices,
 * alternatives, unit-price fixing, receipt data.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, getItemUnits } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { checkoutSalesInvoice, holdSalesInvoice, listHeldInvoices, resumeHeldInvoice, getSalesInvoice } from './sales';
import { createSalesReturn, getReturnableLines } from './sales-returns';
import { createStockAdjustment } from './stock-adjustments';
import { listAudit, recordAudit } from './users';
import { fixNarcoticsEntry, listNarcoticsRegister, narcoticsReconciliation } from './narcotics';
import { findAlternatives, fixUnitPrices, getReceiptData, unitPriceIssues } from './catalog-tools';
import { getItemBatches } from './stock';
import { FUTURE_EXPIRY } from '../test-helpers';

let db: Db;
let wh: number;
let supplierId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  wh = getDefaultWarehouse(db).id;
  supplierId = createSupplier(db, { nameAr: 'مورد' });
});

const RX = {
  prescriptionNo: 'RX-1',
  doctorName: 'د. أحمد',
  doctorSyndicateNo: '12345',
  patientName: 'محمد علي',
  patientIdNo: '29001011234567',
};

function item(opts: { name?: string; schedule?: 'none' | 'table1'; scientificName?: string; boxPrice?: number } = {}) {
  const boxPrice = opts.boxPrice ?? 10000;
  const itemId = createItem(db, {
    nameAr: opts.name ?? `صنف ${Math.random()}`,
    scheduleClass: opts.schedule ?? 'none',
    scientificName: opts.scientificName ?? null,
    publicPrice: boxPrice,
    units: [
      { nameAr: 'قرص', factor: 1, salePrice: Math.ceil(boxPrice / 10), isBase: true },
      { nameAr: 'علبة', factor: 10, salePrice: boxPrice, isBase: false, isDefaultSale: true },
    ],
  });
  const units = getItemUnits(db, itemId) as Array<{ id: number; factor: number }>;
  return { itemId, tablet: units.find((u) => u.factor === 1)!.id, box: units.find((u) => u.factor === 10)!.id };
}

function stock(itemId: number, unitId: number, qty: number) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `S${Math.random()}`,
    supplierId,
    warehouseId: wh,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: qty, unitPurchasePrice: 500, expiryDate: FUTURE_EXPIRY }],
  });
  confirmPurchaseInvoice(db, id, 1);
}

describe('audit log', () => {
  it('redacts secrets and cannot be edited or deleted', () => {
    recordAudit(db, { userId: 1, action: 'settings.update', entity: 'settings', after: { name: 'a', password: 'p@ss' } });
    const [row] = listAudit(db);
    expect(row!.afterJson).not.toContain('p@ss');
    expect(row!.userName).toBe('الصيدلية');
    expect(() => db.prepare('DELETE FROM audit_log').run()).toThrow(/immutable/);
  });
});

describe('narcotics register (BR-7)', () => {
  it('purchases, sales, returns and adjustments of a scheduled item each write a register row with a running balance', () => {
    const t = item({ schedule: 'table1' });
    stock(t.itemId, t.box, 2); // +20
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      prescription: RX,
      lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.tablet, qtyInUnit: 5 }],
    });
    const [line] = getReturnableLines(db, inv);
    createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: t.tablet, qtyInUnit: 1 }] });
    const batch = getItemBatches(db, t.itemId).find((b) => !b.isQuarantined)!;
    createStockAdjustment(db, { reasonCode: 'damage', approvedBy: 1, lines: [{ batchId: batch.id, qtyDelta: -2 }] });

    const reg = listNarcoticsRegister(db, { itemId: t.itemId });
    expect(reg.map((r) => [r.direction, r.qtyBase, r.balanceAfter])).toEqual([
      ['in', 20, 20],
      ['out', 5, 15],
      ['in', 1, 16],
      ['out', 2, 14],
    ]);
    expect(reg[1]).toMatchObject({ prescriptionNo: 'RX-1', patientIdNo: '29001011234567' });
    expect(reg.map((r) => r.serial)).toEqual([1, 2, 3, 4]);
    expect(narcoticsReconciliation(db).find((r) => r.itemId === t.itemId)).toMatchObject({ registerBalance: 14, physicalQty: 14, difference: 0 });
  });

  it('a scheduled item cannot be sold without a complete prescription', () => {
    const t = item({ schedule: 'table1' });
    stock(t.itemId, t.box, 1);
    const sale = (prescription?: typeof RX) => () =>
      checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', prescription, lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.tablet, qtyInUnit: 1 }] });
    expect(sale()).toThrow(/prescription record/);
    expect(sale({ ...RX, patientIdNo: '123' })).toThrow(/14 digits/);
    // The failed sales consumed no register serials (gapless).
    expect(sale(RX)).not.toThrow();
    expect(listNarcoticsRegister(db).map((r) => r.serial)).toEqual([1, 2]);
  });

  it('unscheduled items never touch the register', () => {
    const t = item();
    stock(t.itemId, t.box, 1);
    checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.tablet, qtyInUnit: 1 }] });
    expect(listNarcoticsRegister(db)).toEqual([]);
  });

  it('a wrong entry is corrected by reversal + re-entry, balance unchanged, never edited', () => {
    const t = item({ schedule: 'table1' });
    stock(t.itemId, t.box, 1);
    checkoutSalesInvoice(db, { warehouseId: wh, invoiceType: 'cash', prescription: RX, lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.tablet, qtyInUnit: 3 }] });
    const out = listNarcoticsRegister(db).find((r) => r.direction === 'out')!;
    fixNarcoticsEntry(db, out.id, { ...RX, patientName: 'محمد علي حسن' }, 'اسم المريض ناقص', 1, 1);
    const reg = listNarcoticsRegister(db);
    expect(reg.map((r) => r.direction)).toEqual(['in', 'out', 'reversal', 'out']);
    expect(reg.at(-1)).toMatchObject({ balanceAfter: 7, patientName: 'محمد علي حسن' });
    expect(() => fixNarcoticsEntry(db, out.id, RX, 'again', 1, 1)).toThrow(/already reversed/);
    expect(() => db.prepare('UPDATE narcotics_register SET qty_base = 1').run()).toThrow(/immutable/);
  });
});

describe('held invoices', () => {
  it('a held invoice reserves nothing and resumes with its lines, customer and prescription', () => {
    const t = item({ schedule: 'table1' });
    stock(t.itemId, t.box, 1);
    const id = holdSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      prescription: RX,
      lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.tablet, qtyInUnit: 4, discountAmt: 100 }],
    });
    expect(listHeldInvoices(db, wh)).toHaveLength(1);
    expect(getItemBatches(db, t.itemId)[0]!.qtyOnHand).toBe(10);
    const resumed = resumeHeldInvoice(db, id);
    expect(resumed.lines).toEqual([{ itemId: t.itemId, unitId: t.tablet, qtyInUnit: 4, discountAmt: 100 }]);
    expect(resumed.prescription).toMatchObject({ prescriptionNo: 'RX-1' });
    expect(getSalesInvoice(db, id)!.status).toBe('voided');
    expect(listHeldInvoices(db, wh)).toHaveLength(0);
  });
});

describe('alternatives and unit prices', () => {
  it('lists items with the same active ingredient, in-stock first then cheapest', () => {
    const a = item({ name: 'بنادول', scientificName: 'Paracetamol 500', boxPrice: 3000 });
    const b = item({ name: 'أبيمول', scientificName: 'paracetamol  500', boxPrice: 2000 });
    const c = item({ name: 'سيتال', scientificName: 'Paracetamol 500', boxPrice: 1500 });
    item({ name: 'آخر', scientificName: 'Ibuprofen' });
    stock(b.itemId, b.box, 1);
    const alts = findAlternatives(db, a.itemId, wh);
    expect(alts.map((x) => x.nameAr)).toEqual(['أبيمول', 'سيتال']);
    void c;
  });

  it('finds a tablet priced like a box and fixes it to its share', () => {
    const t = item();
    db.prepare('UPDATE item_units SET sale_price = 10000 WHERE id = ?').run(t.tablet);
    const issues = unitPriceIssues(db);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.units[0]).toMatchObject({ salePrice: 10000, suggested: 1000 });
    expect(fixUnitPrices(db, [t.itemId], 1)).toBe(1);
    expect(unitPriceIssues(db)).toEqual([]);
  });
});

describe('receipt data', () => {
  it('merges batch-split lines back into what the customer bought, with change', () => {
    const t = item();
    stock(t.itemId, t.box, 1);
    stock(t.itemId, t.box, 1);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      cashTendered: 20000,
      lines: [{ lineNo: 1, itemId: t.itemId, unitId: t.box, qtyInUnit: 1.5 }],
    });
    const r = getReceiptData(db, inv);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ qty: 1.5, unitName: 'علبة', total: 15000 });
    expect(r.change).toBe(5000);
  });
});
