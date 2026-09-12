/**
 * Shift repository. درج اليومية / تسليم الدرج — build order screen 9.
 *
 * A shift scopes a till session: opened with a declared cash float, closed by
 * comparing counted cash against what the system expects from confirmed cash
 * sales and manual cash movements during the shift. BR-10: a closed shift is
 * immutable — no further sales or cash transactions can attach to it, and
 * this repository never updates a closed shift's totals.
 */

import type { Db } from '../connection';

export interface ShiftRow {
  id: number;
  userId: number;
  warehouseId: number;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  varianceNote: string | null;
  handedTo: number | null;
  status: 'open' | 'closed';
}

export interface CashTransactionRow {
  id: number;
  shiftId: number | null;
  at: string;
  direction: 'in' | 'out';
  amount: number;
  category: string | null;
  note: string | null;
}

const SELECT = `
  SELECT id, user_id AS userId, warehouse_id AS warehouseId,
         opened_at AS openedAt, closed_at AS closedAt, opening_float AS openingFloat,
         expected_cash AS expectedCash, counted_cash AS countedCash,
         variance, variance_note AS varianceNote, handed_to AS handedTo, status
  FROM shifts
`;

/** The one open shift for a warehouse, if any. A warehouse has at most one open shift at a time. */
export function getOpenShift(db: Db, warehouseId: number): ShiftRow | undefined {
  return db
    .prepare(`${SELECT} WHERE warehouse_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`)
    .get(warehouseId) as ShiftRow | undefined;
}

export function getShift(db: Db, id: number): ShiftRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as ShiftRow | undefined;
}

export function listShifts(db: Db, limit = 100): ShiftRow[] {
  // opened_at has second resolution, so shifts opened within the same second
  // (routine in tests, possible in a fast back-to-back open/close in real use)
  // tie on it. id DESC as a secondary key keeps the order deterministic.
  return db.prepare(`${SELECT} ORDER BY opened_at DESC, id DESC LIMIT ?`).all(limit) as ShiftRow[];
}

/** Refuses to open a second shift on a warehouse that already has one open. */
export function openShift(db: Db, warehouseId: number, openingFloat: number, userId = 1): number {
  const existing = getOpenShift(db, warehouseId);
  if (existing) {
    throw new Error(
      `Warehouse ${warehouseId} already has an open shift (#${existing.id}). Close it before opening a new one.`
    );
  }
  const result = db
    .prepare('INSERT INTO shifts (user_id, warehouse_id, opening_float) VALUES (?, ?, ?)')
    .run(userId, warehouseId, openingFloat);
  return Number(result.lastInsertRowid);
}

/**
 * Cash actually expected in the drawer: opening float, plus cash collected
 * from confirmed cash sales during this shift, plus manual cash-in, minus
 * manual cash-out (petty cash expenses, safe transfers). Credit sales never
 * touch the drawer and are excluded regardless of paid_cash.
 */
export function computeExpectedCash(db: Db, shiftId: number): number {
  const shift = getShift(db, shiftId);
  if (!shift) throw new Error(`Shift ${shiftId} not found`);

  const cashSales = db
    .prepare(
      `SELECT COALESCE(SUM(paid_cash), 0) AS s FROM sales_invoices
       WHERE shift_id = ? AND status = 'confirmed' AND invoice_type = 'cash'`
    )
    .get(shiftId) as { s: number };

  const movements = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END), 0) AS cashIn,
         COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END), 0) AS cashOut
       FROM cash_transactions WHERE shift_id = ?`
    )
    .get(shiftId) as { cashIn: number; cashOut: number };

  return shift.openingFloat + cashSales.s + movements.cashIn - movements.cashOut;
}

export interface CloseShiftInput {
  countedCash: number;
  varianceNote?: string | null;
  handedTo?: number | null;
}

/**
 * Close a shift: compute expected cash, record the count and variance, and
 * mark it closed. BR-10 in effect from this point on — nothing here or
 * elsewhere may update a closed shift's totals.
 *
 * A non-zero variance requires a note (spec M8): the count either matches
 * exactly or someone has to say why not, on the record, at close time —
 * not reconstructed later from memory.
 */
export function closeShift(db: Db, shiftId: number, input: CloseShiftInput): void {
  const run = db.transaction(() => {
    const shift = getShift(db, shiftId);
    if (!shift) throw new Error(`Shift ${shiftId} not found`);
    if (shift.status === 'closed') throw new Error(`Shift ${shiftId} is already closed`);

    const expectedCash = computeExpectedCash(db, shiftId);
    const variance = input.countedCash - expectedCash;

    if (variance !== 0 && !input.varianceNote?.trim()) {
      throw new Error(
        `Variance of ${variance} piastres requires a note explaining it before the shift can close.`
      );
    }

    db.prepare(
      `UPDATE shifts SET
         status = 'closed', closed_at = datetime('now'),
         expected_cash = ?, counted_cash = ?, variance = ?,
         variance_note = ?, handed_to = ?
       WHERE id = ?`
    ).run(
      expectedCash,
      input.countedCash,
      variance,
      input.varianceNote ?? null,
      input.handedTo ?? null,
      shiftId
    );
  });

  run();
}

export function recordCashTransaction(
  db: Db,
  shiftId: number,
  direction: 'in' | 'out',
  amount: number,
  category?: string | null,
  note?: string | null,
  userId = 1
): number {
  const shift = getShift(db, shiftId);
  if (!shift) throw new Error(`Shift ${shiftId} not found`);
  if (shift.status === 'closed') {
    throw new Error(`Shift ${shiftId} is closed (rule 9/BR-10) — cannot record a cash movement against it`);
  }
  if (amount <= 0) throw new RangeError(`Cash transaction amount must be positive, got ${amount}`);

  const result = db
    .prepare(
      'INSERT INTO cash_transactions (shift_id, direction, amount, category, note, user_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(shiftId, direction, amount, category ?? null, note ?? null, userId);
  return Number(result.lastInsertRowid);
}

export function getShiftCashTransactions(db: Db, shiftId: number): CashTransactionRow[] {
  return db
    .prepare(
      `SELECT id, shift_id AS shiftId, at, direction, amount, category, note
       FROM cash_transactions WHERE shift_id = ? ORDER BY at, id`
    )
    .all(shiftId) as CashTransactionRow[];
}

/** Sales confirmed during this shift — the Z-report's sales section. */
export function getShiftSalesSummary(
  db: Db,
  shiftId: number
): { count: number; cashTotal: number; creditTotal: number } {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN invoice_type = 'cash' THEN total ELSE 0 END), 0) AS cashTotal,
         COALESCE(SUM(CASE WHEN invoice_type = 'credit' THEN total ELSE 0 END), 0) AS creditTotal
       FROM sales_invoices WHERE shift_id = ? AND status = 'confirmed'`
    )
    .get(shiftId) as { count: number; cashTotal: number; creditTotal: number };
  return row;
}
