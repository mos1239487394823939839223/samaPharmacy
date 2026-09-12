/**
 * Stock view by item and batch. Build order screen 7 — read-only reporting
 * over the batches and views M4 populates. No writes happen here; every
 * stock change goes through a purchase, sale, return, or adjustment
 * transaction that writes its own stock_moves row (rule 8).
 */

import { normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';

export interface ItemStockRow {
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number | null;
  qtyOnHand: number;
  nearestExpiry: string | null;
  stockValue: number;
}

export interface BatchRow {
  id: number;
  itemId: number;
  warehouseId: number;
  batchNumber: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  unitCost: number;
  receivedAt: string;
  isQuarantined: number;
}

export interface StockMoveRow {
  id: number;
  batchId: number;
  qtyDelta: number;
  unitCost: number;
  moveType: string;
  refTable: string | null;
  refId: number | null;
  reason: string | null;
  at: string;
}

/** Aggregate stock across all warehouses for a search box (items list style). */
export function searchItemStock(db: Db, query: string, limit = 100): ItemStockRow[] {
  const norm = normalizeName(query);
  const where = norm
    ? `WHERE (i.name_ar_norm LIKE @like OR i.name_en_norm LIKE @like) AND i.is_active = 1`
    : 'WHERE i.is_active = 1';

  return db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr,
              NULL AS warehouseId,
              COALESCE(SUM(b.qty_on_hand), 0) AS qtyOnHand,
              MIN(CASE WHEN b.qty_on_hand > 0 THEN b.expiry_date END) AS nearestExpiry,
              COALESCE(SUM(b.qty_on_hand * b.unit_cost), 0) AS stockValue
       FROM items i
       LEFT JOIN batches b ON b.item_id = i.id AND b.is_quarantined = 0
       ${where}
       GROUP BY i.id
       ORDER BY i.name_ar
       LIMIT @limit`
    )
    .all({ like: `%${norm}%`, limit }) as ItemStockRow[];
}

/** All batches for one item, across every warehouse, newest expiry-risk first. */
export function getItemBatches(db: Db, itemId: number): BatchRow[] {
  return db
    .prepare(
      `SELECT id, item_id AS itemId, warehouse_id AS warehouseId,
              batch_number AS batchNumber, expiry_date AS expiryDate,
              qty_on_hand AS qtyOnHand, unit_cost AS unitCost,
              received_at AS receivedAt, is_quarantined AS isQuarantined
       FROM batches
       WHERE item_id = ?
       ORDER BY (qty_on_hand > 0) DESC, expiry_date ASC, id ASC`
    )
    .all(itemId) as BatchRow[];
}

/** FEFO-ordered sellable batches for one item — what the POS will allocate from. */
export function getSellableBatches(db: Db, itemId: number, warehouseId?: number): BatchRow[] {
  const where = warehouseId ? 'AND warehouse_id = ?' : '';
  const params = warehouseId ? [itemId, warehouseId] : [itemId];
  return db
    .prepare(
      `SELECT id, item_id AS itemId, warehouse_id AS warehouseId,
              batch_number AS batchNumber, expiry_date AS expiryDate,
              qty_on_hand AS qtyOnHand, unit_cost AS unitCost,
              received_at AS receivedAt, is_quarantined AS isQuarantined
       FROM v_sellable_batches WHERE item_id = ? ${where}`
    )
    .all(...params) as BatchRow[];
}

/** Full movement history for one batch — the audit trail behind qty_on_hand. */
export function getBatchMoves(db: Db, batchId: number): StockMoveRow[] {
  return db
    .prepare(
      `SELECT id, batch_id AS batchId, qty_delta AS qtyDelta, unit_cost AS unitCost,
              move_type AS moveType, ref_table AS refTable, ref_id AS refId,
              reason, at
       FROM stock_moves WHERE batch_id = ? ORDER BY at, id`
    )
    .all(batchId) as StockMoveRow[];
}

/**
 * Verify a batch's qty_on_hand equals the sum of its stock_moves — the
 * rebuildability guarantee rule 8 exists for. Exposed for diagnostics /
 * السجل, not called on every read.
 */
export function verifyBatchLedger(db: Db, batchId: number): { qtyOnHand: number; ledgerSum: number; matches: boolean } {
  const batch = db.prepare('SELECT qty_on_hand AS qtyOnHand FROM batches WHERE id = ?').get(batchId) as
    | { qtyOnHand: number }
    | undefined;
  if (!batch) throw new Error(`Batch ${batchId} not found`);

  const row = db
    .prepare('SELECT COALESCE(SUM(qty_delta), 0) AS s FROM stock_moves WHERE batch_id = ?')
    .get(batchId) as { s: number };

  return { qtyOnHand: batch.qtyOnHand, ledgerSum: row.s, matches: batch.qtyOnHand === row.s };
}

/** Items at or below their configured minimum stock — for a reorder view. */
export function getLowStockItems(db: Db, limit = 200): ItemStockRow[] {
  return db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr,
              NULL AS warehouseId,
              COALESCE(SUM(b.qty_on_hand), 0) AS qtyOnHand,
              MIN(CASE WHEN b.qty_on_hand > 0 THEN b.expiry_date END) AS nearestExpiry,
              COALESCE(SUM(b.qty_on_hand * b.unit_cost), 0) AS stockValue
       FROM items i
       LEFT JOIN batches b ON b.item_id = i.id AND b.is_quarantined = 0
       WHERE i.is_active = 1
       GROUP BY i.id
       -- min_stock = 0 means the item is not stock-tracked (the schema
       -- default), not that any quantity above zero is acceptable. Without
       -- excluding it, every never-purchased item trips 0 <= 0 and the
       -- reorder list fills with items nobody meant to track.
       HAVING i.min_stock > 0 AND COALESCE(SUM(b.qty_on_hand), 0) <= i.min_stock
       ORDER BY i.name_ar
       LIMIT ?`
    )
    .all(limit) as ItemStockRow[];
}
