/**
 * End-to-end business-flow test: purchase -> sale -> sales return ->
 * purchase return, chained through one batch, verifying stock_moves stays
 * reconcilable with qty_on_hand at every step (rule 8) and that a full
 * lifecycle of the four move types this app produces (purchase, sale,
 * sale_return, purchase_return) never drifts.
 *
 * Every other repository test file exercises one transaction type against a
 * freshly stocked batch; this is the one place the full chain runs against
 * the SAME batch end to end, the way a real pharmacist's day actually
 * unfolds: receive stock, sell some of it, take some back from a customer,
 * send some back to the supplier.
 */
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
import { createSalesInvoice, confirmSalesInvoice } from './sales';
import { createSalesReturn, getReturnableLines } from './sales-returns';
import { createPurchaseReturn } from './purchase-returns';
import { getItemBatches, verifyBatchLedger } from './stock';

let db: Db;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
});

describe('full business cycle: purchase -> sale -> sales return -> purchase return', () => {
  it('keeps qty_on_hand reconciled against stock_moves at every step, cash and credit both correct', () => {
    const itemId = createItem(db, { nameAr: 'صنف دورة كاملة' });
    const unitId = Number(
      db
        .prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 1000, 1)')
        .run(itemId, 'قرص').lastInsertRowid
    );
    const supplierId = createSupplier(db, { nameAr: 'مورد دورة كاملة' });
    const customerId = createCustomer(db, { name: 'عميل دورة كاملة', mobile1: '0111111199' });
    const warehouseId = getDefaultWarehouse(db).id;

    // 1. Purchase 100 units at 500 piastres cost each.
    const purchaseId = createPurchaseInvoice(db, {
      supplierInvoiceNo: 'SUP-CYCLE-1',
      supplierId,
      warehouseId,
      purchaseType: 'credit',
      invoiceDate: '2026-01-01',
      lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: 100, qtyBase: 100, unitPurchasePrice: 500 }],
    });
    confirmPurchaseInvoice(db, purchaseId);

    const [batch] = getItemBatches(db, itemId);
    expect(batch!.qtyOnHand).toBe(100);
    expect(verifyBatchLedger(db, batch!.id).matches).toBe(true);

    // 2. Sell 40 units on credit to a customer — no cash changes hands, the
    // full amount is owed on the account (the exact invariant the paidCash
    // guard in sales.ts now enforces at the data layer).
    const saleId = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'credit',
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 40, unitPrice: 1000 }],
    });
    confirmSalesInvoice(db, saleId);

    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(60);
    expect(verifyBatchLedger(db, batch!.id).matches).toBe(true);
    expect(getCustomerBalance(db, customerId)).toBe(40000); // 40 * 1000, owed in full

    // 3. Customer returns 10 of the 40 units; refund goes to their account,
    // reducing what they owe rather than a cash transaction.
    const [returnable] = getReturnableLines(db, saleId) as Array<{
      sourceLineId: number;
      batchId: number;
    }>;
    const salesReturnId = createSalesReturn(db, {
      sourceInvoiceId: saleId,
      warehouseId,
      customerId,
      refundMethod: 'account',
      lines: [
        {
          itemId,
          batchId: returnable!.batchId,
          unitId,
          qtyInUnit: 10,
          qtyBase: 10,
          unitPrice: 1000,
          sourceLineId: returnable!.sourceLineId,
        },
      ],
    });
    expect(salesReturnId).toBeGreaterThan(0);

    expect(getItemBatches(db, itemId)[0]!.qtyOnHand).toBe(70); // 60 sold-out + 10 returned
    expect(verifyBatchLedger(db, batch!.id).matches).toBe(true);
    expect(getCustomerBalance(db, customerId)).toBe(30000); // 40000 - 10000 credited back

    // 4. Send 20 units back to the supplier — stock leaves again, this time
    // toward the purchase side of the ledger.
    createPurchaseReturn(db, {
      sourceInvoiceId: purchaseId,
      supplierId,
      warehouseId,
      lines: [{ itemId, batchId: batch!.id, unitId, qtyInUnit: 20, qtyBase: 20 }],
    });

    // Final reconciliation: 100 received - 40 sold + 10 returned-from-customer - 20 returned-to-supplier = 50.
    const finalBatch = getItemBatches(db, itemId)[0]!;
    expect(finalBatch.qtyOnHand).toBe(50);
    const finalCheck = verifyBatchLedger(db, batch!.id);
    expect(finalCheck.matches).toBe(true);
    expect(finalCheck.ledgerSum).toBe(50);

    // Every stock_moves row for this batch must sum to the same figure
    // (rule 8: stock is always rebuildable from the ledger), independent of
    // verifyBatchLedger's own computation.
    const moves = db
      .prepare('SELECT move_type AS moveType, qty_delta AS qtyDelta FROM stock_moves WHERE batch_id = ? ORDER BY id')
      .all(batch!.id) as Array<{ moveType: string; qtyDelta: number }>;
    expect(moves.map((m) => m.moveType)).toEqual(['purchase', 'sale', 'sale_return', 'purchase_return']);
    expect(moves.reduce((s, m) => s + m.qtyDelta, 0)).toBe(50);
  });
});
