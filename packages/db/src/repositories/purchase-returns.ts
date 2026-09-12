/**
 * Purchase returns. مرتجعات فواتير الشراء (against an invoice) and مرتجعات
 * شراء عام (general, no source invoice) — build order screens 14. Both share
 * this repository, differing only in whether source_invoice_id is set.
 *
 * Unlike a sales return, stock here moves the other direction: it leaves the
 * pharmacy (going back to the supplier), so the one check that matters is
 * whether the batch actually has enough qty_on_hand to give back — you cannot
 * return more than physically remains, regardless of what was originally
 * received.
 */

import type { Db } from '../connection';
import { nextSequence } from './items';

export interface PurchaseReturnLineInput {
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
}

export interface PurchaseReturnInput {
  sourceInvoiceId?: number | null;
  supplierId: number;
  warehouseId: number;
  reason?: string | null;
  lines: PurchaseReturnLineInput[];
}

export interface PurchaseReturnRow {
  id: number;
  serial: number;
  sourceInvoiceId: number | null;
  supplierId: number;
  warehouseId: number;
  status: string;
  total: number;
  reason: string | null;
  createdAt: string;
}

export interface PurchaseReturnLineRow {
  id: number;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitCost: number;
  lineTotal: number;
}

const SELECT = `
  SELECT id, serial, source_invoice_id AS sourceInvoiceId, supplier_id AS supplierId,
         warehouse_id AS warehouseId, status, total, reason, created_at AS createdAt
  FROM purchase_returns
`;

export function getPurchaseReturn(db: Db, id: number): PurchaseReturnRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as PurchaseReturnRow | undefined;
}

export function listPurchaseReturns(db: Db, limit = 100, offset = 0): PurchaseReturnRow[] {
  return db
    .prepare(`${SELECT} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as PurchaseReturnRow[];
}

export function getPurchaseReturnLines(db: Db, returnId: number): PurchaseReturnLineRow[] {
  return db
    .prepare(
      `SELECT id, item_id AS itemId, batch_id AS batchId, unit_id AS unitId,
              qty_in_unit AS qtyInUnit, qty_base AS qtyBase, unit_cost AS unitCost, line_total AS lineTotal
       FROM purchase_return_lines WHERE return_id = ? ORDER BY id`
    )
    .all(returnId) as PurchaseReturnLineRow[];
}

/** Batches received on a given purchase invoice, for the "against an invoice" return screen. */
export function getReturnablePurchaseLines(db: Db, invoiceId: number) {
  return db
    .prepare(
      `SELECT l.id AS sourceLineId, l.item_id AS itemId, i.name_ar AS itemNameAr,
              l.batch_id AS batchId, l.unit_id AS unitId, l.qty_base AS receivedQtyBase,
              l.qty_in_unit AS receivedQtyInUnit, l.landed_unit_cost AS unitCost,
              b.qty_on_hand AS batchQtyOnHand,
              COALESCE((
                SELECT SUM(rl.qty_base) FROM purchase_return_lines rl
                JOIN purchase_returns r ON r.id = rl.return_id
                WHERE rl.batch_id = l.batch_id AND r.source_invoice_id = ? AND r.status = 'confirmed'
              ), 0) AS alreadyReturnedQtyBase
       FROM purchase_invoice_lines l
       JOIN items i ON i.id = l.item_id
       LEFT JOIN batches b ON b.id = l.batch_id
       WHERE l.invoice_id = ?
       ORDER BY l.line_no`
    )
    .all(invoiceId, invoiceId);
}

/**
 * Create and confirm a purchase return in one step, same rationale as a
 * sales return: there is no useful draft state for reversing an
 * already-settled transaction.
 *
 * Every line is checked against live qty_on_hand before anything is
 * written — a return cannot take a batch negative. This is stricter than
 * "don't oversell": a purchase return can be for less than what was
 * originally bought (some may have already sold), but never for more than
 * what is left.
 */
export function createPurchaseReturn(db: Db, input: PurchaseReturnInput): number {
  const run = db.transaction((data: PurchaseReturnInput) => {
    if (data.lines.length === 0) throw new Error('Cannot create a return with no lines');

    const serial = nextSequence(db, 'purchase_return');
    let total = 0;

    const getBatch = db.prepare(
      'SELECT qty_on_hand AS qtyOnHand, unit_cost AS unitCost FROM batches WHERE id = ?'
    );
    const decrementBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand - ? WHERE id = ?');
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id)
       VALUES (?, ?, ?, ?, ?, 'purchase_return', 'purchase_return_lines', ?, 1)`
    );

    const computedLines = data.lines.map((line) => {
      const batch = getBatch.get(line.batchId) as { qtyOnHand: number; unitCost: number } | undefined;
      if (!batch) throw new Error(`Batch ${line.batchId} not found`);
      if (batch.qtyOnHand < line.qtyBase) {
        throw new Error(
          `Cannot return ${line.qtyBase} units from batch ${line.batchId}: only ${batch.qtyOnHand} remain on hand ` +
            `(some may have already been sold or returned)`
        );
      }
      const lineTotal = line.qtyBase * batch.unitCost;
      total += lineTotal;
      return { line, unitCost: batch.unitCost, lineTotal };
    });

    const result = db
      .prepare(
        `INSERT INTO purchase_returns (serial, source_invoice_id, supplier_id, warehouse_id, user_id, status, total, reason)
         VALUES (?, ?, ?, ?, 1, 'confirmed', ?, ?)`
      )
      .run(serial, data.sourceInvoiceId ?? null, data.supplierId, data.warehouseId, total, data.reason ?? null);
    const returnId = Number(result.lastInsertRowid);

    const insertLine = db.prepare(
      `INSERT INTO purchase_return_lines (return_id, item_id, batch_id, unit_id, qty_in_unit, qty_base, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const { line, unitCost, lineTotal } of computedLines) {
      decrementBatch.run(line.qtyBase, line.batchId);
      insertMove.run(line.batchId, line.itemId, data.warehouseId, -line.qtyBase, unitCost, returnId);
      insertLine.run(returnId, line.itemId, line.batchId, line.unitId, line.qtyInUnit, line.qtyBase, unitCost, lineTotal);
    }

    // Returning stock to the supplier reduces what the pharmacy owes them —
    // a credit entry, mirroring how a sales return credits the customer.
    const balanceBefore = db
      .prepare('SELECT balance_after AS b FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1')
      .get(data.supplierId) as { b: number } | undefined;
    const currentBalance = balanceBefore?.b ?? 0;
    db.prepare(
      `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, ref_table, ref_id)
       VALUES (?, 'return', ?, 0, ?, 'purchase_returns', ?)`
    ).run(data.supplierId, total, currentBalance - total, returnId);

    return returnId;
  });

  return run(input);
}
