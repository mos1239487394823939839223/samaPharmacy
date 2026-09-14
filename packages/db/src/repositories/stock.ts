/**
 * Stock view by item and batch. Build order screen 7 — read-only reporting
 * over the batches and views M4 populates. No writes happen here; every
 * stock change goes through a purchase, sale, return, or adjustment
 * transaction that writes its own stock_moves row (rule 8).
 */

import { normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { getExpiryBucketDays, type ExpiryBucketDays } from './settings';

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

export type ExpiryBucket = 'expired' | 'd30' | 'd60' | 'd90' | 'd180' | 'over180';

export interface ExpiryBatchRow {
  batchId: number;
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number;
  batchNumber: string | null;
  expiryDate: string;
  qtyOnHand: number;
  unitCost: number;
  value: number;
  bucket: ExpiryBucket;
}

export interface ExpiryBucketSummary {
  bucket: ExpiryBucket;
  batchCount: number;
  qtyOnHand: number;
  value: number;
}

/**
 * Spec's expiry dashboard (docs/pharmacy-system-spec.md line 110): every
 * non-quarantined batch with stock on hand and a known expiry date, bucketed
 * by days remaining as of `asOf`, valued at cost (unit_cost * qty_on_hand --
 * the same valuation basis as searchItemStock/getLowStockItems). Batches
 * with a NULL expiry_date are open stock (raw materials, non-expiring goods)
 * and are deliberately excluded -- they have nothing to bucket into, and
 * silently dropping them into "over180" would misstate that bucket's value.
 *
 * Bucket cutoffs come from settings (Settings screen → expiry thresholds),
 * not a literal 30/60/90/180 — a pharmacist may want a wider or narrower
 * near-expiry warning window than the shipped default.
 */
export function getExpiryReport(
  db: Db,
  asOf: string,
  bucketDays: ExpiryBucketDays = getExpiryBucketDays(db)
): { rows: ExpiryBatchRow[]; summary: ExpiryBucketSummary[]; bucketDays: ExpiryBucketDays } {
  const raw = db
    .prepare(
      `SELECT b.id AS batchId, b.item_id AS itemId, i.code, i.name_ar AS nameAr,
              b.warehouse_id AS warehouseId, b.batch_number AS batchNumber,
              b.expiry_date AS expiryDate, b.qty_on_hand AS qtyOnHand, b.unit_cost AS unitCost,
              CAST(julianday(b.expiry_date) - julianday(?) AS INTEGER) AS daysLeft
       FROM batches b
       JOIN items i ON i.id = b.item_id
       WHERE b.is_quarantined = 0 AND b.qty_on_hand > 0 AND b.expiry_date IS NOT NULL
       ORDER BY b.expiry_date ASC, b.id ASC`
    )
    .all(asOf) as Array<{
      batchId: number;
      itemId: number;
      code: number;
      nameAr: string;
      warehouseId: number;
      batchNumber: string | null;
      expiryDate: string;
      qtyOnHand: number;
      unitCost: number;
      daysLeft: number;
    }>;

  function bucketOf(daysLeft: number): ExpiryBucket {
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= bucketDays.d30) return 'd30';
    if (daysLeft <= bucketDays.d60) return 'd60';
    if (daysLeft <= bucketDays.d90) return 'd90';
    if (daysLeft <= bucketDays.d180) return 'd180';
    return 'over180';
  }

  const rows: ExpiryBatchRow[] = raw.map((r) => ({
    batchId: r.batchId,
    itemId: r.itemId,
    code: r.code,
    nameAr: r.nameAr,
    warehouseId: r.warehouseId,
    batchNumber: r.batchNumber,
    expiryDate: r.expiryDate,
    qtyOnHand: r.qtyOnHand,
    unitCost: r.unitCost,
    value: r.qtyOnHand * r.unitCost,
    bucket: bucketOf(r.daysLeft),
  }));

  const order: ExpiryBucket[] = ['expired', 'd30', 'd60', 'd90', 'd180', 'over180'];
  const summary: ExpiryBucketSummary[] = order.map((bucket) => {
    const inBucket = rows.filter((r) => r.bucket === bucket);
    return {
      bucket,
      batchCount: inBucket.length,
      qtyOnHand: inBucket.reduce((s, r) => s + r.qtyOnHand, 0),
      value: inBucket.reduce((s, r) => s + r.value, 0),
    };
  });

  return { rows, summary, bucketDays };
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
