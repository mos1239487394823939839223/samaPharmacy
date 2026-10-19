import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice, confirmSalesInvoice } from './sales';
import { getPrintableDocument } from './printable';
import { FUTURE_EXPIRY } from '../test-helpers';

let db: Db;
let warehouseId: number;
let itemId: number;
let unitId: number;
let purchaseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
  warehouseId = getDefaultWarehouse(db).id;
  itemId = createItem(db, { nameAr: 'بنادول' });
  unitId = Number(
    db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 1000, 1)').run(itemId, 'علبة').lastInsertRowid
  );
  const supplierId = createSupplier(db, { nameAr: 'المورد', phone1: '0223' });
  purchaseId = createPurchaseInvoice(db, {
    supplierInvoiceNo: 'S-77',
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 20, qtyBase: 20, bonusInUnit: 2, batchNumber: 'B1', unitPurchasePrice: 600, expiryDate: FUTURE_EXPIRY }],
  });
  confirmPurchaseInvoice(db, purchaseId);
});

describe('printable documents', () => {
  it('a sale prints its lines and totals', () => {
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 3000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 3, unitPrice: 1000 }],
    });
    confirmSalesInvoice(db, id);
    const doc = getPrintableDocument(db, 'sale', id);
    expect(doc.kind).toBe('sale');
    expect(doc.partyName).toBeNull();
    expect(doc.lines).toEqual([expect.objectContaining({ name: 'بنادول', unitName: 'علبة', qty: 3, unitPrice: 1000, total: 3000 })]);
    expect(doc.total).toBe(3000);
  });

  it('a purchase prints the supplier, its invoice number, bonus and batch', () => {
    const doc = getPrintableDocument(db, 'purchase', purchaseId);
    expect(doc.partyName).toBe('المورد');
    expect(doc.reference).toBe('S-77');
    expect(doc.lines[0]!.note).toContain('+2');
    expect(doc.lines[0]!.note).toContain('B1');
  });

  it('an unknown document is a clear error', () => {
    expect(() => getPrintableDocument(db, 'salesReturn', 999)).toThrow(expect.objectContaining({ code: 'print.documentNotFound' }));
  });
});
