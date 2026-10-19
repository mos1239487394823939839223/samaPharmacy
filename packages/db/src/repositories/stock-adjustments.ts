/**
 * Stock adjustments — تسويات المخزون.
 *
 * The only way stock changes other than a purchase, sale or return: writing
 * off damaged, expired or lost goods, and correcting the system to a physical
 * count. Each adjustment is one stock_adjustments header (who, when, why)
 * plus one stock_moves row per batch touched, all in one transaction (rule 8)
 * — so the ledger still explains every unit of qty_on_hand.
 *
 * Rules:
 *   * damage / expiry / theft can only REMOVE stock;
 *   * count / correction may go either way (a recount can find more);
 *   * no batch may go below zero;
 *   * a theft or correction needs a note — the reason is the record.
 */

import { DomainError } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW, TODAY } from '../time';
import { recordNarcoticMove } from './narcotics';

export type AdjustmentReason = 'damage' | 'expiry' | 'theft' | 'correction' | 'count';

export interface AdjustmentLineInput {
  batchId: number;
  /** The physical count for the batch, in base units. The move is countedQty − qty_on_hand. */
  countedQty?: number;
  /** Or the change itself, in base units (negative removes stock). */
  qtyDelta?: number;
}

export interface StockAdjustmentInput {
  reasonCode: AdjustmentReason;
  note?: string | null;
  /** Supervisor who authorised it (recorded on the adjustment and the narcotics register). */
  approvedBy?: number | null;
  lines: AdjustmentLineInput[];
}

export interface StockAdjustmentRow {
  id: number;
  at: string;
  reasonCode: AdjustmentReason;
  note: string | null;
  lineCount: number;
  /** Net base units added (positive) or removed (negative). */
  qtyDelta: number;
  /** Net value at cost of the change (negative for a write-off). */
  valueDelta: number;
}

export interface AdjustmentMoveRow {
  batchId: number;
  itemId: number;
  nameAr: string;
  batchNumber: string | null;
  expiryDate: string | null;
  qtyDelta: number;
  unitCost: number;
}

const DECREASE_ONLY: AdjustmentReason[] = ['damage', 'expiry', 'theft'];
const NOTE_REQUIRED: AdjustmentReason[] = ['theft', 'correction'];

export function createStockAdjustment(db: Db, input: StockAdjustmentInput, userId = 1): number {
  return db.transaction(() => {
    if (input.lines.length === 0) throw new DomainError('adjust.noLines', 'An adjustment needs at least one batch');
    const note = input.note?.trim() || null;
    if (NOTE_REQUIRED.includes(input.reasonCode) && !note) {
      throw new DomainError('adjust.noteRequired', `Reason "${input.reasonCode}" requires a note`);
    }

    const getBatch = db.prepare(
      `SELECT b.id, b.item_id AS itemId, b.warehouse_id AS warehouseId, b.qty_on_hand AS qtyOnHand,
              b.unit_cost AS unitCost, i.name_ar AS nameAr
       FROM batches b JOIN items i ON i.id = b.item_id WHERE b.id = ?`
    );

    const seen = new Set<number>();
    const planned = input.lines.map((line) => {
      if (seen.has(line.batchId)) throw new DomainError('adjust.duplicateBatch', `Batch ${line.batchId} listed twice`);
      seen.add(line.batchId);
      const batch = getBatch.get(line.batchId) as
        | { id: number; itemId: number; warehouseId: number; qtyOnHand: number; unitCost: number; nameAr: string }
        | undefined;
      if (!batch) throw new DomainError('adjust.batchNotFound', `Batch ${line.batchId} not found`);

      const delta = line.countedQty !== undefined ? line.countedQty - batch.qtyOnHand : line.qtyDelta ?? 0;
      if (!Number.isInteger(delta) || (line.countedQty !== undefined && (!Number.isInteger(line.countedQty) || line.countedQty < 0))) {
        throw new DomainError('adjust.qtyInvalid', 'Quantities must be whole base units', { item: batch.nameAr });
      }
      if (delta > 0 && DECREASE_ONLY.includes(input.reasonCode)) {
        throw new DomainError('adjust.increaseNotAllowed', `"${input.reasonCode}" can only remove stock`, { item: batch.nameAr });
      }
      if (batch.qtyOnHand + delta < 0) {
        throw new DomainError('adjust.belowZero', `Batch ${batch.id} has ${batch.qtyOnHand}, cannot remove ${-delta}`, {
          item: batch.nameAr,
          available: batch.qtyOnHand,
        });
      }
      return { batch, delta };
    });

    const changes = planned.filter((p) => p.delta !== 0);
    if (changes.length === 0) throw new DomainError('adjust.nothingToChange', 'Every counted quantity matches the system');

    const adjustmentId = Number(
      db
        .prepare(`INSERT INTO stock_adjustments (at, user_id, reason_code, note, approved_by) VALUES (${NOW}, ?, ?, ?, ?)`)
        .run(userId, input.reasonCode, note, input.approvedBy ?? null).lastInsertRowid
    );

    const update = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');
    const move = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, reason, user_id, at)
       VALUES (?, ?, ?, ?, ?, ?, 'stock_adjustments', ?, ?, ?, ${NOW})`
    );
    const moveType = input.reasonCode === 'count' ? 'count' : 'adjustment';
    for (const { batch, delta } of changes) {
      update.run(delta, batch.id);
      move.run(batch.id, batch.itemId, batch.warehouseId, delta, batch.unitCost, moveType, adjustmentId, note ?? input.reasonCode, userId);
      recordNarcoticMove(db, {
        itemId: batch.itemId,
        batchId: batch.id,
        qtyDelta: delta,
        refTable: 'stock_adjustments',
        refId: adjustmentId,
        userId,
        reason: note ?? input.reasonCode,
        approvedBy: input.approvedBy ?? null,
      });
    }
    return adjustmentId;
  })();
}

/**
 * Write off every expired, non-quarantined batch still holding stock in one
 * adjustment (reason "expiry"). Returns null when there is nothing to write off.
 */
export function writeOffExpired(db: Db, warehouseId?: number, userId = 1): { adjustmentId: number; batchCount: number } | null {
  const batches = db
    .prepare(
      `SELECT b.id FROM batches b JOIN items i ON i.id = b.item_id
       WHERE b.qty_on_hand > 0 AND b.is_quarantined = 0 AND i.no_expiry = 0
         AND b.expiry_date IS NOT NULL AND b.expiry_date <= ${TODAY}
         ${warehouseId ? 'AND b.warehouse_id = ?' : ''}`
    )
    .all(...(warehouseId ? [warehouseId] : [])) as { id: number }[];
  if (batches.length === 0) return null;
  const adjustmentId = createStockAdjustment(
    db,
    { reasonCode: 'expiry', note: 'شطب الأصناف منتهية الصلاحية', lines: batches.map((b) => ({ batchId: b.id, countedQty: 0 })) },
    userId
  );
  return { adjustmentId, batchCount: batches.length };
}

export function listStockAdjustments(db: Db, limit = 100): StockAdjustmentRow[] {
  return db
    .prepare(
      `SELECT a.id, a.at, a.reason_code AS reasonCode, a.note,
              COUNT(m.id) AS lineCount,
              COALESCE(SUM(m.qty_delta), 0) AS qtyDelta,
              COALESCE(SUM(m.qty_delta * m.unit_cost), 0) AS valueDelta
       FROM stock_adjustments a
       LEFT JOIN stock_moves m ON m.ref_table = 'stock_adjustments' AND m.ref_id = a.id
       GROUP BY a.id
       ORDER BY a.id DESC
       LIMIT ?`
    )
    .all(limit) as StockAdjustmentRow[];
}

export function getStockAdjustmentMoves(db: Db, adjustmentId: number): AdjustmentMoveRow[] {
  return db
    .prepare(
      `SELECT m.batch_id AS batchId, m.item_id AS itemId, i.name_ar AS nameAr,
              b.batch_number AS batchNumber, b.expiry_date AS expiryDate,
              m.qty_delta AS qtyDelta, m.unit_cost AS unitCost
       FROM stock_moves m
       JOIN items i ON i.id = m.item_id
       JOIN batches b ON b.id = m.batch_id
       WHERE m.ref_table = 'stock_adjustments' AND m.ref_id = ?
       ORDER BY m.id`
    )
    .all(adjustmentId) as AdjustmentMoveRow[];
}
