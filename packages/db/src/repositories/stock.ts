/**
 * Stock view by item and batch. Build order screen 7 — read-only reporting
 * over the batches and views M4 populates. No writes happen here; every
 * stock change goes through a purchase, sale, return, or adjustment
 * transaction that writes its own stock_moves row (rule 8).
 */

import { normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { TODAY } from '../time';
import { getExpiryBucketDays, type ExpiryBucketDays } from './settings';

/**
 * "Available" means exactly what the POS can sell (v_sellable_batches): not
 * quarantined, and not expired as of today's LOCAL date — a batch expiring
 * today is already unsellable (decision D10). Stock screen, low-stock list,
 * purchase form and POS all use this one definition; expired and quarantined
 * stock is reported separately instead of being folded into "on hand".
 */
const SELLABLE = `(b.is_quarantined = 0 AND (i.no_expiry = 1 OR b.expiry_date IS NULL OR b.expiry_date > ${TODAY}))`;
const EXPIRED = `(b.is_quarantined = 0 AND i.no_expiry = 0 AND b.expiry_date IS NOT NULL AND b.expiry_date <= ${TODAY})`;

export interface ItemStockRow {
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number | null;
  /** Sellable base units (see SELLABLE). */
  qtyOnHand: number;
  /** Base units past expiry, still on the shelf until written off. */
  expiredQty: number;
  /** Base units in quarantine (fridge/damaged returns). */
  quarantinedQty: number;
  nearestExpiry: string | null;
  /** Value of the sellable quantity at cost. */
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

const STOCK_COLUMNS = `
  COALESCE(SUM(CASE WHEN ${SELLABLE} THEN b.qty_on_hand END), 0) AS qtyOnHand,
  COALESCE(SUM(CASE WHEN ${EXPIRED} THEN b.qty_on_hand END), 0) AS expiredQty,
  COALESCE(SUM(CASE WHEN b.is_quarantined = 1 THEN b.qty_on_hand END), 0) AS quarantinedQty,
  MIN(CASE WHEN ${SELLABLE} AND b.qty_on_hand > 0 THEN b.expiry_date END) AS nearestExpiry,
  COALESCE(SUM(CASE WHEN ${SELLABLE} THEN b.qty_on_hand * b.unit_cost END), 0) AS stockValue`;

/** Aggregate stock across all warehouses for a search box (items list style). */
/**
 * With no warehouseId, qtyOnHand is summed across every warehouse — a
 * pharmacy with more than one store (main + front counter, say) would
 * otherwise see one merged number with no way to tell how much sits in
 * which warehouse. Passing warehouseId scopes both the batch join and the
 * returned row's warehouseId to that one store, matching what the batch
 * drill-down (getItemBatches) already exposes per row.
 */
export function searchItemStock(db: Db, query: string, limit = 100, warehouseId?: number): ItemStockRow[] {
  const norm = normalizeName(query);
  const conditions = [norm ? '(i.name_ar_norm LIKE @like OR i.name_en_norm LIKE @like)' : null, 'i.is_active = 1'].filter(
    Boolean
  );
  const where = `WHERE ${conditions.join(' AND ')}`;
  const batchJoin = warehouseId
    ? 'LEFT JOIN batches b ON b.item_id = i.id AND b.warehouse_id = @warehouseId'
    : 'LEFT JOIN batches b ON b.item_id = i.id';

  return db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr,
              ${warehouseId ? '@warehouseId' : 'NULL'} AS warehouseId,
              ${STOCK_COLUMNS}
       FROM items i
       ${batchJoin}
       ${where}
       GROUP BY i.id
       ORDER BY i.name_ar
       LIMIT @limit`
    )
    .all({ like: `%${norm}%`, limit, warehouseId: warehouseId ?? null }) as ItemStockRow[];
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

  // Expiring today counts as expired: the POS stops selling it today (D10).
  function bucketOf(daysLeft: number): ExpiryBucket {
    if (daysLeft <= 0) return 'expired';
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
              ${STOCK_COLUMNS}
       FROM items i
       LEFT JOIN batches b ON b.item_id = i.id
       WHERE i.is_active = 1
       GROUP BY i.id
       -- min_stock = 0 means the item is not stock-tracked (the schema
       -- default), not that any quantity above zero is acceptable. Without
       -- excluding it, every never-purchased item trips 0 <= 0 and the
       -- reorder list fills with items nobody meant to track.
       HAVING i.min_stock > 0 AND qtyOnHand <= i.min_stock
       ORDER BY i.name_ar
       LIMIT ?`
    )
    .all(limit) as ItemStockRow[];
}
