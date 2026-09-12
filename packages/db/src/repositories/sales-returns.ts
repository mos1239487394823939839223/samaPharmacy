/**
 * Sales returns. مرتجع فواتير البيع (against an invoice) and مرتجع بيع عام
 * (general, no source invoice) — blueprint build order screens 12/13. Both
 * share this repository; they differ only in whether source_invoice_id is
 * set and, per the schema, whether approved_by is required.
 *
 * BR-12: refrigerated stock (fridge/freezer) always returns to quarantine,
 * never back to sellable stock, unless the pharmacist-in-charge overrides
 * with a note. Damaged goods follow the same quarantine path via an explicit
 * per-line flag.
 */

import type { Db } from '../connection';
import { nextSequence } from './items';
import { recordCustomerPayment } from './customers';
import { getSalesReturnWindowDays } from './settings';

export interface SalesReturnLineInput {
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitPrice: number;
  sourceLineId?: number | null;
  /** Damaged goods — forced to quarantine regardless of storage condition. */
  damaged?: boolean;
  /** BR-12 override: return refrigerated stock to sellable anyway. Requires a note. */
  overrideRefrigeratedQuarantine?: boolean;
}

export interface SalesReturnInput {
  sourceInvoiceId?: number | null;
  warehouseId: number;
  customerId?: number | null;
  refundMethod: 'cash' | 'credit_note' | 'account';
  reason?: string | null;
  /** Required when sourceInvoiceId is absent (a general return needs authorization). */
  approvedBy?: number | null;
  overrideNote?: string | null;
  lines: SalesReturnLineInput[];
}

export interface SalesReturnRow {
  id: number;
  serial: number;
  sourceInvoiceId: number | null;
  warehouseId: number;
  customerId: number | null;
  approvedBy: number | null;
  status: string;
  total: number;
  refundMethod: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SalesReturnLineRow {
  id: number;
  sourceLineId: number | null;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitPrice: number;
  lineTotal: number;
  toQuarantine: number;
}

const SELECT = `
  SELECT id, serial, source_invoice_id AS sourceInvoiceId, warehouse_id AS warehouseId,
         customer_id AS customerId, approved_by AS approvedBy, status, total,
         refund_method AS refundMethod, reason, created_at AS createdAt
  FROM sales_returns
`;

export function getSalesReturn(db: Db, id: number): SalesReturnRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as SalesReturnRow | undefined;
}

export function listSalesReturns(db: Db, limit = 100, offset = 0): SalesReturnRow[] {
  return db
    .prepare(`${SELECT} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as SalesReturnRow[];
}

export function getSalesReturnLines(db: Db, returnId: number): SalesReturnLineRow[] {
  return db
    .prepare(
      `SELECT id, source_line_id AS sourceLineId, item_id AS itemId, batch_id AS batchId,
              unit_id AS unitId, qty_in_unit AS qtyInUnit, qty_base AS qtyBase,
              unit_price AS unitPrice, line_total AS lineTotal, to_quarantine AS toQuarantine
       FROM sales_return_lines WHERE return_id = ? ORDER BY id`
    )
    .all(returnId) as SalesReturnLineRow[];
}

/** What was sold on a given invoice, for the "against an invoice" return screen. */
export function getReturnableLines(db: Db, invoiceId: number) {
  return db
    .prepare(
      `SELECT l.id AS sourceLineId, l.item_id AS itemId, i.name_ar AS itemNameAr,
              l.batch_id AS batchId, l.unit_id AS unitId, l.qty_base AS soldQtyBase,
              l.qty_in_unit AS soldQtyInUnit, l.unit_price AS unitPrice, l.expiry_date AS expiryDate,
              COALESCE((
                SELECT SUM(rl.qty_base) FROM sales_return_lines rl
                JOIN sales_returns r ON r.id = rl.return_id
                WHERE rl.source_line_id = l.id AND r.status = 'confirmed'
              ), 0) AS alreadyReturnedQtyBase
       FROM sales_invoice_lines l
       JOIN items i ON i.id = l.item_id
       WHERE l.invoice_id = ?
       ORDER BY l.line_no`
    )
    .all(invoiceId);
}

function isRefrigerated(db: Db, itemId: number): boolean {
  const row = db.prepare('SELECT storage_condition AS s FROM items WHERE id = ?').get(itemId) as
    | { s: string }
    | undefined;
  return row?.s === 'fridge' || row?.s === 'freezer';
}

/**
 * Create and confirm a sales return in one step — unlike sales/purchase
 * invoices there is no useful draft state for a return: the whole point is
 * reversing a specific, already-settled transaction, and a return with no
 * economic effect isn't worth holding half-done.
 *
 * Returned stock goes back into its original batch (rule 9 — no new batch
 * fabricated for a return) unless BR-12 or the damaged flag route it to
 * quarantine instead, in which case it lands in a quarantine batch of the
 * same item/warehouse that never contributes to qty_on_hand available for
 * sale (batches.is_quarantined = 1 is excluded by v_sellable_batches).
 */
export function createSalesReturn(db: Db, input: SalesReturnInput): number {
  const run = db.transaction((data: SalesReturnInput) => {
    if (!data.sourceInvoiceId && !data.approvedBy) {
      throw new Error('مرتجع بيع عام requires approvedBy — a general return with no source invoice must be authorized');
    }
    if (data.lines.length === 0) throw new Error('Cannot create a return with no lines');

    // A return against a specific invoice is time-boxed by the configured
    // return window (Settings → return window); a general return has no
    // invoice to measure age against and is left to the approvedBy gate
    // above instead.
    if (data.sourceInvoiceId) {
      const invoice = db
        .prepare(
          `SELECT CAST(julianday('now') - julianday(confirmed_at) AS INTEGER) AS daysSinceConfirmed
           FROM sales_invoices WHERE id = ?`
        )
        .get(data.sourceInvoiceId) as { daysSinceConfirmed: number | null } | undefined;

      if (!invoice) throw new Error(`Sales invoice ${data.sourceInvoiceId} not found`);

      const windowDays = getSalesReturnWindowDays(db);
      if (invoice.daysSinceConfirmed !== null && invoice.daysSinceConfirmed > windowDays) {
        throw new Error(
          `Return window of ${windowDays} day(s) has passed for invoice ${data.sourceInvoiceId} ` +
            `(confirmed ${invoice.daysSinceConfirmed} day(s) ago)`
        );
      }
    }

    const serial = nextSequence(db, 'sales_return');
    let total = 0;

    const getBatch = db.prepare(
      'SELECT item_id AS itemId, warehouse_id AS warehouseId, batch_number AS batchNumber, expiry_date AS expiryDate, unit_cost AS unitCost FROM batches WHERE id = ?'
    );
    const findQuarantineBatch = db.prepare(
      `SELECT id FROM batches WHERE item_id = ? AND warehouse_id = ? AND batch_number IS ? AND expiry_date IS ? AND unit_cost = ? AND is_quarantined = 1`
    );
    const insertQuarantineBatch = db.prepare(
      `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, is_quarantined)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    );
    const growBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id)
       VALUES (?, ?, ?, ?, ?, 'sale_return', 'sales_return_lines', ?, 1)`
    );

    const getPublicPrice = db.prepare('SELECT public_price AS p FROM items WHERE id = ?');

    const computedLines = data.lines.map((line) => {
      // A general return has no source invoice to check the refunded price
      // against, which is exactly the gap someone could use to refund more
      // than a customer ever paid. Cap it at the item's public_price, the
      // same ceiling BR-4 applies to a sale. A return against an invoice is
      // naturally bounded by what that invoice actually charged and skips
      // this check.
      if (!data.sourceInvoiceId) {
        const priceRow = getPublicPrice.get(line.itemId) as { p: number | null } | undefined;
        if (priceRow?.p != null && line.unitPrice > priceRow.p) {
          throw new Error(
            `Return price ${line.unitPrice} for item ${line.itemId} exceeds its public price ${priceRow.p} ` +
              `— a general return cannot refund more than the item's list price`
          );
        }
      }

      const refrigerated = isRefrigerated(db, line.itemId);
      // BR-12: refrigerated always quarantines unless explicitly overridden,
      // and an override with no note is not a real override.
      const forceQuarantine =
        Boolean(line.damaged) ||
        (refrigerated && !(line.overrideRefrigeratedQuarantine && data.overrideNote?.trim()));

      const lineTotal = line.qtyInUnit * line.unitPrice;
      total += lineTotal;
      return { line, forceQuarantine, lineTotal };
    });

    const result = db
      .prepare(
        `INSERT INTO sales_returns (
           serial, source_invoice_id, warehouse_id, customer_id, user_id,
           approved_by, status, total, refund_method, reason
         ) VALUES (?, ?, ?, ?, 1, ?, 'confirmed', ?, ?, ?)`
      )
      .run(
        serial,
        data.sourceInvoiceId ?? null,
        data.warehouseId,
        data.customerId ?? null,
        data.approvedBy ?? null,
        total,
        data.refundMethod,
        data.reason ?? null
      );
    const returnId = Number(result.lastInsertRowid);

    const insertLine = db.prepare(
      `INSERT INTO sales_return_lines (
         return_id, source_line_id, item_id, batch_id, unit_id, qty_in_unit,
         qty_base, unit_price, line_total, to_quarantine
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const { line, forceQuarantine, lineTotal } of computedLines) {
      const batch = getBatch.get(line.batchId) as
        | { itemId: number; warehouseId: number; batchNumber: string | null; expiryDate: string | null; unitCost: number }
        | undefined;
      if (!batch) throw new Error(`Batch ${line.batchId} not found`);

      let targetBatchId = line.batchId;

      if (forceQuarantine) {
        const existing = findQuarantineBatch.get(
          batch.itemId,
          batch.warehouseId,
          batch.batchNumber,
          batch.expiryDate,
          batch.unitCost
        ) as { id: number } | undefined;

        if (existing) {
          targetBatchId = existing.id;
        } else {
          const qResult = insertQuarantineBatch.run(
            batch.itemId,
            batch.warehouseId,
            batch.batchNumber,
            batch.expiryDate,
            0,
            batch.unitCost
          );
          targetBatchId = Number(qResult.lastInsertRowid);
        }
      }

      growBatch.run(line.qtyBase, targetBatchId);
      insertMove.run(targetBatchId, line.itemId, data.warehouseId, line.qtyBase, batch.unitCost, returnId);

      insertLine.run(
        returnId,
        line.sourceLineId ?? null,
        line.itemId,
        targetBatchId,
        line.unitId,
        line.qtyInUnit,
        line.qtyBase,
        line.unitPrice,
        lineTotal,
        forceQuarantine ? 1 : 0
      );
    }

    // A credit refund reduces what the customer owes, same mechanism as a
    // payment — the ledger does not distinguish "paid us back" from "we owe
    // them less", both are a credit entry.
    if (data.refundMethod === 'account' && data.customerId) {
      recordCustomerPayment(db, data.customerId, total, `مرتجع بيع #${serial}`);
    }

    return returnId;
  });

  return run(input);
}
