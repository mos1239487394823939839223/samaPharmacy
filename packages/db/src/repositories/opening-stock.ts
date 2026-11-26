/**
 * رصيد أول المدة — the stock already on the shelves when the pharmacy starts
 * using the system. No supplier, no invoice, no money owed: each line becomes
 * a batch at a cost derived from the selling price (خصم الصيدلي, default 20%:
 * a box selling at 100 is costed at 80). Posted as one stock adjustment
 * (reason "count") with a stock_moves row per line (rule 8), so it shows in
 * الجرد والتسويات and the stock can be rebuilt from the ledger.
 */

import { DomainError, toBaseUnits } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW, TODAY } from '../time';
import { recordNarcoticMove } from './narcotics';
import { getPurchaseDiscountPct } from './settings';

export interface OpeningStockLine {
  itemId: number;
  unitId: number;
  /** Quantity in the chosen unit (boxes, strips…). */
  qtyInUnit: number;
  expiryDate?: string | null;
  batchNumber?: string | null;
  /** Override: piastres per CHOSEN unit. Omitted → selling price − discount %. */
  unitCost?: number | null;
}

export const OPENING_STOCK_NOTE = 'رصيد أول المدة';

/** Cost of one base unit from the box price and the discount %. */
export function costFromSellingPrice(boxPrice: number, boxFactor: number, discountPct: number): number {
  return Math.round((boxPrice * (100 - discountPct)) / 100 / boxFactor);
}

export function postOpeningStock(db: Db, warehouseId: number, lines: OpeningStockLine[], userId = 1): { adjustmentId: number; lines: number } {
  return db.transaction(() => {
    if (lines.length === 0) throw new DomainError('adjust.noLines', 'Nothing to post');
    const pct = getPurchaseDiscountPct(db);
    const itemStmt = db.prepare('SELECT name_ar AS nameAr, public_price AS publicPrice, no_expiry AS noExpiry, is_active AS active FROM items WHERE id = ?');
    const unitStmt = db.prepare('SELECT factor, sale_price AS salePrice FROM item_units WHERE id = ? AND item_id = ?');
    const boxStmt = db.prepare('SELECT factor, sale_price AS salePrice FROM item_units WHERE item_id = ? AND allow_sale = 1 ORDER BY factor DESC LIMIT 1');
    const today = (db.prepare(`SELECT ${TODAY} AS d`).get() as { d: string }).d;

    const adjustmentId = Number(
      db
        .prepare(`INSERT INTO stock_adjustments (at, user_id, reason_code, note) VALUES (${NOW}, ?, 'count', ?)`)
        .run(userId, OPENING_STOCK_NOTE).lastInsertRowid
    );
    const findBatch = db.prepare(
      `SELECT id FROM batches WHERE item_id = ? AND warehouse_id = ? AND batch_number IS ? AND expiry_date IS ? AND unit_cost = ? AND is_quarantined = 0`
    );
    const newBatch = db.prepare(
      `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, received_at) VALUES (?, ?, ?, ?, 0, ?, ${NOW})`
    );
    const addQty = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');
    const move = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, reason, user_id, at)
       VALUES (?, ?, ?, ?, ?, 'count', 'stock_adjustments', ?, ?, ?, ${NOW})`
    );

    for (const l of lines) {
      const item = itemStmt.get(l.itemId) as { nameAr: string; publicPrice: number | null; noExpiry: number; active: number } | undefined;
      if (!item || !item.active) throw new DomainError('item.notFound', `Item ${l.itemId} not found`, { id: l.itemId });
      const unit = unitStmt.get(l.unitId, l.itemId) as { factor: number; salePrice: number } | undefined;
      if (!unit) throw new DomainError('shortage.unitInvalid', `Unit ${l.unitId} is not a unit of item ${l.itemId}`);
      let qtyBase: number;
      try {
        qtyBase = toBaseUnits(l.qtyInUnit, unit.factor);
      } catch {
        throw new DomainError('adjust.qtyInvalid', 'Quantity must be whole base units', { item: item.nameAr });
      }
      if (!(qtyBase > 0)) throw new DomainError('adjust.qtyInvalid', 'Quantity must be positive', { item: item.nameAr });
      const expiry = item.noExpiry ? null : l.expiryDate || null;
      if (!item.noExpiry && (!expiry || expiry <= today)) {
        throw new DomainError('purchase.expiryPast', 'A future expiry date is required', { item: item.nameAr, date: expiry ?? '—' });
      }

      let unitCost: number;
      if (l.unitCost != null) {
        unitCost = Math.round(l.unitCost / unit.factor);
      } else {
        const box = boxStmt.get(l.itemId) as { factor: number; salePrice: number } | undefined;
        const boxPrice = box && box.salePrice > 0 ? box.salePrice : item.publicPrice ?? 0;
        if (!(boxPrice > 0)) throw new DomainError('opening.noPrice', 'Item has no selling price to derive a cost from', { item: item.nameAr });
        unitCost = costFromSellingPrice(boxPrice, box?.factor ?? 1, pct);
      }

      const batchNo = l.batchNumber?.trim() || null;
      const existing = findBatch.get(l.itemId, warehouseId, batchNo, expiry, unitCost) as { id: number } | undefined;
      const batchId = existing?.id ?? Number(newBatch.run(l.itemId, warehouseId, batchNo, expiry, unitCost).lastInsertRowid);
      addQty.run(qtyBase, batchId);
      move.run(batchId, l.itemId, warehouseId, qtyBase, unitCost, adjustmentId, OPENING_STOCK_NOTE, userId);
      recordNarcoticMove(db, { itemId: l.itemId, batchId, qtyDelta: qtyBase, refTable: 'stock_adjustments', refId: adjustmentId, userId, reason: OPENING_STOCK_NOTE });
    }
    return { adjustmentId, lines: lines.length };
  })();
}
