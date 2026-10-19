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

import { DomainError, toBaseUnits } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';
import { getSupplierBalance } from './suppliers';
import { recordNarcoticMove } from './narcotics';

export interface PurchaseReturnLineInput {
  itemId: number;
  batchId: number;
  /** Unit the quantity is expressed in — any unit of the item. */
  unitId: number;
  qtyInUnit: number;
  /** Ignored — derived from unitId's factor. Accepted so older callers still type-check. */
  qtyBase?: number;
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
              l.batch_id AS batchId, l.unit_id AS unitId, u.name_ar AS unitNameAr, u.factor AS unitFactor,
              l.qty_base AS receivedQtyBase,
              l.qty_in_unit AS receivedQtyInUnit, l.landed_unit_cost AS unitCost,
              b.qty_on_hand AS batchQtyOnHand,
              COALESCE((
                SELECT SUM(rl.qty_base) FROM purchase_return_lines rl
                JOIN purchase_returns r ON r.id = rl.return_id
                WHERE rl.batch_id = l.batch_id AND r.source_invoice_id = ? AND r.status = 'confirmed'
              ), 0) AS alreadyReturnedQtyBase
       FROM purchase_invoice_lines l
       JOIN items i ON i.id = l.item_id
       JOIN item_units u ON u.id = l.unit_id
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
export function createPurchaseReturn(db: Db, input: PurchaseReturnInput, userId = 1): number {
  const run = db.transaction((data: PurchaseReturnInput) => {
    if (data.lines.length === 0) throw new DomainError('return.noLines', 'Cannot create a return with no lines');

    // Against an invoice: it must be a confirmed purchase from this supplier,
    // and every batch must be one that invoice actually created.
    let invoiceBatches: Set<number> | null = null;
    if (data.sourceInvoiceId) {
      const inv = db
        .prepare('SELECT status, supplier_id AS supplierId, serial FROM purchase_invoices WHERE id = ?')
        .get(data.sourceInvoiceId) as { status: string; supplierId: number; serial: number } | undefined;
      if (!inv) throw new DomainError('return.invoiceNotFound', `Purchase invoice ${data.sourceInvoiceId} not found`);
      if (inv.status !== 'confirmed') {
        throw new DomainError('return.invoiceNotConfirmed', `Purchase invoice ${inv.serial} is not confirmed`, { serial: inv.serial });
      }
      if (inv.supplierId !== data.supplierId) {
        throw new DomainError('return.supplierMismatch', `Purchase invoice ${inv.serial} belongs to another supplier`);
      }
      invoiceBatches = new Set(
        (db.prepare('SELECT batch_id AS b FROM purchase_invoice_lines WHERE invoice_id = ? AND batch_id IS NOT NULL')
          .all(data.sourceInvoiceId) as { b: number }[]).map((r) => r.b)
      );
    }

    const serial = nextSequence(db, 'purchase_return');
    let total = 0;

    const getBatch = db.prepare(
      `SELECT b.qty_on_hand AS qtyOnHand, b.unit_cost AS unitCost, b.item_id AS itemId, b.warehouse_id AS warehouseId,
              i.name_ar AS itemName
       FROM batches b JOIN items i ON i.id = b.item_id WHERE b.id = ?`
    );
    const getUnit = db.prepare('SELECT factor, name_ar AS nameAr FROM item_units WHERE id = ? AND item_id = ?');
    const decrementBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand - ? WHERE id = ?');
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, reason, user_id, at)
       VALUES (?, ?, ?, ?, ?, 'purchase_return', 'purchase_return_lines', ?, ?, ?, ${NOW})`
    );

    const pendingByBatch = new Map<number, number>();
    const computedLines = data.lines.map((line) => {
      const batch = getBatch.get(line.batchId) as
        | { qtyOnHand: number; unitCost: number; itemId: number; warehouseId: number; itemName: string }
        | undefined;
      if (!batch || batch.itemId !== line.itemId || batch.warehouseId !== data.warehouseId) {
        throw new DomainError('return.batchMismatch', `Batch ${line.batchId} is not a batch of item ${line.itemId} in this warehouse`);
      }
      if (invoiceBatches && !invoiceBatches.has(line.batchId)) {
        throw new DomainError('return.lineNotOnInvoice', `Batch ${line.batchId} was not received on this invoice`);
      }
      const unit = getUnit.get(line.unitId, line.itemId) as { factor: number; nameAr: string } | undefined;
      if (!unit) throw new DomainError('return.unitInvalid', `Unit ${line.unitId} does not belong to item ${line.itemId}`);
      let qtyBase: number;
      try {
        qtyBase = toBaseUnits(line.qtyInUnit, unit.factor);
      } catch {
        throw new DomainError('return.qtyNotWhole', `${line.qtyInUnit} ${unit.nameAr} is not whole base units`, {
          qty: line.qtyInUnit,
          unit: unit.nameAr,
        });
      }
      if (qtyBase <= 0) throw new DomainError('return.qtyInvalid', 'Return quantity must be positive');

      const already = pendingByBatch.get(line.batchId) ?? 0;
      if (batch.qtyOnHand - already < qtyBase) {
        throw new DomainError(
          'return.exceedsOnHand',
          `Cannot return ${qtyBase} units from batch ${line.batchId}: only ${batch.qtyOnHand - already} remain on hand ` +
            `(some may have already been sold or returned)`,
          { item: batch.itemName, remaining: batch.qtyOnHand - already }
        );
      }
      pendingByBatch.set(line.batchId, already + qtyBase);
      const lineTotal = qtyBase * batch.unitCost;
      total += lineTotal;
      return { line: { ...line, qtyBase }, unitCost: batch.unitCost, lineTotal };
    });

    const result = db
      .prepare(
        `INSERT INTO purchase_returns (serial, source_invoice_id, supplier_id, warehouse_id, user_id, status, total, reason, created_at)
         VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ${NOW})`
      )
      .run(serial, data.sourceInvoiceId ?? null, data.supplierId, data.warehouseId, userId, total, data.reason?.trim() || null);
    const returnId = Number(result.lastInsertRowid);

    const insertLine = db.prepare(
      `INSERT INTO purchase_return_lines (return_id, item_id, batch_id, unit_id, qty_in_unit, qty_base, unit_cost, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const { line, unitCost, lineTotal } of computedLines) {
      decrementBatch.run(line.qtyBase, line.batchId);
      const lineId = Number(
        insertLine.run(returnId, line.itemId, line.batchId, line.unitId, line.qtyInUnit, line.qtyBase, unitCost, lineTotal)
          .lastInsertRowid
      );
      insertMove.run(line.batchId, line.itemId, data.warehouseId, -line.qtyBase, unitCost, lineId, data.reason?.trim() || null, userId);
      recordNarcoticMove(db, {
        itemId: line.itemId,
        batchId: line.batchId,
        qtyDelta: -line.qtyBase,
        refTable: 'purchase_return_lines',
        refId: lineId,
        userId,
        reason: data.reason?.trim() || null,
      });
    }

    // Returning stock to the supplier reduces what the pharmacy owes them —
    // a debit entry, mirroring how a sales return credits the customer.
    const currentBalance = getSupplierBalance(db, data.supplierId);
    db.prepare(
      `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, ref_table, ref_id, at)
       VALUES (?, 'return', ?, 0, ?, 'purchase_returns', ?, ${NOW})`
    ).run(data.supplierId, total, currentBalance - total, returnId);

    return returnId;
  });

  return run(input);
}
