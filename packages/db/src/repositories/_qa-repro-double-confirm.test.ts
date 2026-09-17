/**
 * QA repro (temporary): checks whether confirming the same sales invoice
 * twice (e.g. a double-click / rapid double-submit on "إتمام البيع") double-
 * deducts stock or double-posts credit. Delete after triage.
 */
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

let db: Db;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
});

function batchQty(itemId: number, warehouseId: number): number {
  const row = db
    .prepare('SELECT COALESCE(SUM(qty_on_hand), 0) AS q FROM batches WHERE item_id = ? AND warehouse_id = ? AND is_quarantined = 0')
    .get(itemId, warehouseId) as { q: number };
  return row.q;
}

describe('QA repro: double-confirm protection', () => {
  it('confirming the same sales invoice twice does not double-deduct stock', () => {
    const itemId = createItem(db, { nameAr: 'TEST_PRODUCT_DBLCONFIRM' });
    const unitId = Number(
      db
        .prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 1000, 1)')
        .run(itemId, 'قرص').lastInsertRowid
    );
    const supplierId = createSupplier(db, { nameAr: 'TEST_SUPPLIER' });
    const warehouseId = getDefaultWarehouse(db).id;

    const purchaseId = createPurchaseInvoice(db, {
      supplierInvoiceNo: 'SUP-1',
      supplierId,
      warehouseId,
      purchaseType: 'cash',
      invoiceDate: '2026-01-01',
      lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 100, qtyBase: 100, unitPurchasePrice: 500 }],
    });
    confirmPurchaseInvoice(db, purchaseId);
    expect(batchQty(itemId, warehouseId)).toBe(100);

    const saleId = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'cash',
      paidCash: 10000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 1000 }],
    });

    confirmSalesInvoice(db, saleId);
    expect(batchQty(itemId, warehouseId)).toBe(90);

    // Rapid double-submit: confirm the SAME invoice ID a second time.
    let secondThrew = false;
    try {
      confirmSalesInvoice(db, saleId);
    } catch {
      secondThrew = true;
    }

    const finalQty = batchQty(itemId, warehouseId);
    console.log('second confirm rejected:', secondThrew, '| stock after double-confirm attempt:', finalQty);

    expect(secondThrew).toBe(true);
    expect(finalQty).toBe(90); // must NOT be 80
  });

  it('double-confirming the same purchase invoice does not double-add stock', () => {
    const itemId = createItem(db, { nameAr: 'TEST_PRODUCT_DBLPURCHASE' });
    const unitId = Number(
      db
        .prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 1000, 1)')
        .run(itemId, 'قرص').lastInsertRowid
    );
    const supplierId = createSupplier(db, { nameAr: 'TEST_SUPPLIER' });
    const warehouseId = getDefaultWarehouse(db).id;

    const purchaseId = createPurchaseInvoice(db, {
      supplierInvoiceNo: 'SUP-DBL',
      supplierId,
      warehouseId,
      purchaseType: 'cash',
      invoiceDate: '2026-01-01',
      lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 100, qtyBase: 100, unitPurchasePrice: 500 }],
    });

    confirmPurchaseInvoice(db, purchaseId);
    expect(batchQty(itemId, warehouseId)).toBe(100);

    let secondThrew = false;
    try {
      confirmPurchaseInvoice(db, purchaseId);
    } catch {
      secondThrew = true;
    }

    const finalQty = batchQty(itemId, warehouseId);
    console.log('second purchase-confirm rejected:', secondThrew, '| stock after double-confirm attempt:', finalQty);

    expect(secondThrew).toBe(true);
    expect(finalQty).toBe(100); // must NOT be 200
  });
});
