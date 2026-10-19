import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, getItemUnits } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { checkoutSalesInvoice, getSalesInvoice, getSalesReport } from './sales';
import { createSalesReturn, getReturnableLines, getSalesReturn } from './sales-returns';
import { computeExpectedCash, openShift } from './shifts';
import {
  createClaim,
  createInsuranceCompany,
  getClaimLines,
  insuranceReceivables,
  listClaims,
  setExclusion,
  settleClaim,
  submitClaim,
  unclaimedInvoices,
} from './insurance';
import { getReceiptData } from './catalog-tools';
import { FUTURE_EXPIRY } from '../test-helpers';
import { todayLocal } from '@pharmacy/core';

let db: Db;
let wh: number;
let a: { itemId: number; unit: number };
let b: { itemId: number; unit: number };

function item(price: number) {
  const itemId = createItem(db, { nameAr: `صنف ${Math.random()}`, units: [{ nameAr: 'علبة', factor: 1, salePrice: price, isBase: true }] });
  const unit = (getItemUnits(db, itemId) as Array<{ id: number }>)[0]!.id;
  const supplierId = createSupplier(db, { nameAr: `مورد ${Math.random()}` });
  const p = createPurchaseInvoice(db, {
    supplierInvoiceNo: 'S',
    supplierId,
    warehouseId: wh,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId: unit, qtyInUnit: 50, unitPurchasePrice: 100, expiryDate: FUTURE_EXPIRY }],
  });
  confirmPurchaseInvoice(db, p);
  return { itemId, unit };
}

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  wh = getDefaultWarehouse(db).id;
  a = item(10000);
  b = item(5000);
});

const today = () => todayLocal();

describe('insured sale', () => {
  it('splits the total: company pays coverage % of covered lines, patient the rest — and the drawer expects only the patient share', () => {
    const company = createInsuranceCompany(db, { nameAr: 'مصر للتأمين', coveragePct: 80 });
    setExclusion(db, company, b.itemId, true);
    const shift = openShift(db, wh, 0);
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      insurance: { companyId: company, memberNo: 'M-1' },
      cashTendered: 10000,
      lines: [
        { lineNo: 1, itemId: a.itemId, unitId: a.unit, qtyInUnit: 1 },
        { lineNo: 2, itemId: b.itemId, unitId: b.unit, qtyInUnit: 1 },
      ],
    });
    const row = getSalesInvoice(db, inv)!;
    expect(row.total).toBe(15000);
    expect(row.insuranceShare).toBe(8000); // 80% of A only (B excluded)
    expect(row.paidCash).toBe(7000);
    expect(computeExpectedCash(db, shift)).toBe(7000);
    const receipt = getReceiptData(db, inv);
    expect(receipt).toMatchObject({ insuranceShare: 8000, patientPays: 7000, change: 3000, insuranceCompany: 'مصر للتأمين' });
    const report = getSalesReport(db, today(), today());
    expect(report).toMatchObject({ cashTotal: 7000, insuranceTotal: 8000, grandTotal: 15000 });
  });

  it('applies the per-invoice cap and requires an approval number when the contract says so', () => {
    const company = createInsuranceCompany(db, { nameAr: 'شركة', coveragePct: 100, maxPerInvoice: 3000, requiresApprovalNo: true });
    const sale = (approvalNo?: string) =>
      checkoutSalesInvoice(db, {
        warehouseId: wh,
        invoiceType: 'cash',
        insurance: { companyId: company, approvalNo },
        lines: [{ lineNo: 1, itemId: a.itemId, unitId: a.unit, qtyInUnit: 1 }],
      });
    expect(() => sale()).toThrow(/approval number/);
    expect(getSalesInvoice(db, sale('AP-9'))!.insuranceShare).toBe(3000);
  });

  it('a return refunds only the patient share and reduces the claim by the company portion', () => {
    const company = createInsuranceCompany(db, { nameAr: 'شركة', coveragePct: 50 });
    const inv = checkoutSalesInvoice(db, {
      warehouseId: wh,
      invoiceType: 'cash',
      insurance: { companyId: company },
      lines: [{ lineNo: 1, itemId: a.itemId, unitId: a.unit, qtyInUnit: 2 }],
    });
    const [line] = getReturnableLines(db, inv);
    const rid = createSalesReturn(db, { sourceInvoiceId: inv, warehouseId: wh, lines: [{ sourceLineId: line!.sourceLineId, unitId: a.unit, qtyInUnit: 1 }] });
    expect(getSalesReturn(db, rid)!.total).toBe(5000);
    expect(unclaimedInvoices(db, company, today(), today())[0]!.claimable).toBe(5000);
  });
});

describe('claims', () => {
  it('batches unclaimed invoices, then submit and settle with a rejection; a settled claim is immutable', () => {
    const company = createInsuranceCompany(db, { nameAr: 'شركة', coveragePct: 100 });
    const sale = () =>
      checkoutSalesInvoice(db, {
        warehouseId: wh,
        invoiceType: 'cash',
        insurance: { companyId: company },
        lines: [{ lineNo: 1, itemId: b.itemId, unitId: b.unit, qtyInUnit: 1 }],
      });
    const i1 = sale();
    sale();
    const claim = createClaim(db, company, today(), today(), 1);
    expect(listClaims(db)[0]).toMatchObject({ totalClaimed: 10000, invoiceCount: 2, status: 'draft' });
    expect(unclaimedInvoices(db, company, today(), today())).toEqual([]);
    expect(() => createClaim(db, company, today(), today(), 1)).toThrow(/No unclaimed/);
    expect(() => settleClaim(db, claim, { paid: 5000, rejections: [] })).toThrow(/submitted/);

    submitClaim(db, claim);
    expect(() => settleClaim(db, claim, { paid: 10000, rejections: [{ invoiceId: i1, reason: 'بدون موافقة' }] })).toThrow(/exceeds/);
    settleClaim(db, claim, { paid: 5000, rejections: [{ invoiceId: i1, reason: 'بدون موافقة' }] });
    expect(listClaims(db)[0]).toMatchObject({ status: 'settled', totalPaid: 5000, totalRejected: 5000 });
    expect(getClaimLines(db, claim).find((l) => l.invoiceId === i1)).toMatchObject({ rejected: 1, rejectedReason: 'بدون موافقة' });
    expect(insuranceReceivables(db)[0]).toMatchObject({ unclaimed: 0, pending: 0, shortPaid: 0, rejected: 5000 });
    expect(() => db.prepare('UPDATE insurance_claims SET total_paid = 1').run()).toThrow(/immutable/);
  });
});
