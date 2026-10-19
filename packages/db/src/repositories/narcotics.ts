/**
 * Narcotics register — سجل المخدرات (spec M7, BR-7).
 *
 * A sequential, gapless, append-only log of every movement of a scheduled
 * item (schedule_class != 'none'): purchases in, sales out with the
 * prescription behind them, returns, adjustments. Each row carries the
 * item's running register balance, so the register can be reconciled
 * against physical stock at any time:
 *
 *     opening + in − out (± reversals) = qty on hand
 *
 * Rows are written by the same transaction that moves the stock (via
 * recordNarcoticMove), so the register can never disagree with a committed
 * stock movement. The serial comes from the 'narcotics' sequence inside that
 * transaction — a rolled-back sale rolls back its serial too, so there are no
 * gaps. Corrections are reversal rows approved by a supervisor; nothing is
 * ever updated or deleted (migration 0008 triggers).
 */

import { DomainError } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';

export interface PrescriptionInput {
  prescriptionNo: string;
  prescriptionDate?: string | null;
  doctorName: string;
  doctorSyndicateNo: string;
  patientName: string;
  patientIdNo: string;
  notes?: string | null;
}

export interface NarcoticsRow {
  id: number;
  serial: number;
  at: string;
  itemId: number;
  itemName: string;
  batchId: number | null;
  direction: 'in' | 'out' | 'reversal';
  qtyBase: number;
  balanceAfter: number;
  prescriptionNo: string | null;
  doctorName: string | null;
  doctorSyndicateNo: string | null;
  patientName: string | null;
  patientIdNo: string | null;
  refTable: string | null;
  refId: number | null;
  reversesId: number | null;
  reason: string | null;
  userName: string | null;
  approvedByName: string | null;
}

export function isScheduled(db: Db, itemId: number): boolean {
  const row = db.prepare('SELECT schedule_class AS s FROM items WHERE id = ?').get(itemId) as { s: string } | undefined;
  return Boolean(row && row.s !== 'none');
}

/** Required fields of a prescription, trimmed; throws a coded error naming what is missing. */
export function validatePrescription(p: PrescriptionInput | null | undefined): PrescriptionInput {
  if (!p) throw new DomainError('narcotics.prescriptionRequired', 'A scheduled item needs a prescription record');
  const clean = {
    ...p,
    prescriptionNo: p.prescriptionNo?.trim() ?? '',
    doctorName: p.doctorName?.trim() ?? '',
    doctorSyndicateNo: p.doctorSyndicateNo?.trim() ?? '',
    patientName: p.patientName?.trim() ?? '',
    patientIdNo: p.patientIdNo?.trim() ?? '',
  };
  for (const key of ['prescriptionNo', 'doctorName', 'doctorSyndicateNo', 'patientName', 'patientIdNo'] as const) {
    if (!clean[key]) throw new DomainError('narcotics.prescriptionIncomplete', `Prescription field ${key} is required`, { field: key });
  }
  // Egyptian national ID: 14 digits.
  if (!/^\d{14}$/.test(clean.patientIdNo)) {
    throw new DomainError('narcotics.patientIdInvalid', 'Patient national ID must be 14 digits');
  }
  return clean;
}

export function savePrescription(db: Db, invoiceId: number, p: PrescriptionInput, userId: number): number {
  const v = validatePrescription(p);
  return Number(
    db
      .prepare(
        `INSERT INTO prescriptions (invoice_id, prescription_no, prescription_date, doctor_name, doctor_syndicate_no,
           patient_name, patient_id_no, notes, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${NOW}, ?)`
      )
      .run(
        invoiceId,
        v.prescriptionNo,
        v.prescriptionDate ?? null,
        v.doctorName,
        v.doctorSyndicateNo,
        v.patientName,
        v.patientIdNo,
        v.notes?.trim() || null,
        userId
      ).lastInsertRowid
  );
}

export function getInvoicePrescription(db: Db, invoiceId: number) {
  return db
    .prepare(
      `SELECT id, prescription_no AS prescriptionNo, prescription_date AS prescriptionDate, doctor_name AS doctorName,
              doctor_syndicate_no AS doctorSyndicateNo, patient_name AS patientName, patient_id_no AS patientIdNo, notes
       FROM prescriptions WHERE invoice_id = ?`
    )
    .get(invoiceId) as (PrescriptionInput & { id: number }) | undefined;
}

function lastBalance(db: Db, itemId: number): number | null {
  const row = db
    .prepare('SELECT balance_after AS b FROM narcotics_register WHERE item_id = ? ORDER BY serial DESC LIMIT 1')
    .get(itemId) as { b: number } | undefined;
  return row ? row.b : null;
}

/** Physical stock of an item across every batch (quarantine included — it is still in the pharmacy). */
function physicalQty(db: Db, itemId: number): number {
  return (db.prepare('SELECT COALESCE(SUM(qty_on_hand), 0) AS q FROM batches WHERE item_id = ?').get(itemId) as { q: number }).q;
}

/**
 * Record a stock movement of a scheduled item. Call AFTER the batch has been
 * updated, inside the same transaction. `qtyDelta` is signed (+ in, − out).
 * No-op for an unscheduled item, so callers can call it for every line.
 */
export function recordNarcoticMove(
  db: Db,
  move: {
    itemId: number;
    batchId: number | null;
    qtyDelta: number;
    refTable: string;
    refId: number;
    userId: number;
    prescriptionId?: number | null;
    reason?: string | null;
    approvedBy?: number | null;
  }
): void {
  if (move.qtyDelta === 0 || !isScheduled(db, move.itemId)) return;

  // The first row for an item opens the register at whatever was on hand
  // before this movement (stock that predates the register).
  const before = lastBalance(db, move.itemId) ?? physicalQty(db, move.itemId) - move.qtyDelta;

  type Rx = { no: string; doctor: string; synd: string; patient: string; pid: string };
  const rx: Rx | null = move.prescriptionId
    ? ((db
        .prepare(
          `SELECT prescription_no AS no, doctor_name AS doctor, doctor_syndicate_no AS synd,
                  patient_name AS patient, patient_id_no AS pid FROM prescriptions WHERE id = ?`
        )
        .get(move.prescriptionId) as Rx | undefined) ?? null)
    : null;

  db.prepare(
    `INSERT INTO narcotics_register (
       serial, at, item_id, batch_id, direction, qty_base, balance_after,
       prescription_no, doctor_name, doctor_syndicate_no, patient_name, patient_id_no,
       ref_table, ref_id, user_id, approved_by, reason, prescription_id
     ) VALUES (?, ${NOW}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    nextSequence(db, 'narcotics'),
    move.itemId,
    move.batchId,
    move.qtyDelta > 0 ? 'in' : 'out',
    Math.abs(move.qtyDelta),
    before + move.qtyDelta,
    rx?.no ?? null,
    rx?.doctor ?? null,
    rx?.synd ?? null,
    rx?.patient ?? null,
    rx?.pid ?? null,
    move.refTable,
    move.refId,
    move.userId,
    move.approvedBy ?? null,
    move.reason ?? null,
    move.prescriptionId ?? null
  );
}

/**
 * Reverse a register entry that was recorded wrongly (wrong patient, wrong
 * prescription number). Stock is not touched — this corrects the record, not
 * the shelf. A supervisor's approval and a reason are mandatory. If the entry
 * was right in quantity but wrong in details, follow with a corrected manual
 * entry via `correctEntry`.
 */
export function reverseNarcoticsEntry(db: Db, entryId: number, reason: string, userId: number, approvedBy: number): number {
  return db.transaction(() => {
    if (!reason.trim()) throw new DomainError('narcotics.reasonRequired', 'A reversal needs a reason');
    const e = db
      .prepare('SELECT id, item_id AS itemId, batch_id AS batchId, direction, qty_base AS qty FROM narcotics_register WHERE id = ?')
      .get(entryId) as { id: number; itemId: number; batchId: number | null; direction: string; qty: number } | undefined;
    if (!e) throw new DomainError('narcotics.notFound', `Register entry ${entryId} not found`);
    if (e.direction === 'reversal') throw new DomainError('narcotics.cannotReverseReversal', 'A reversal cannot be reversed');
    const already = db.prepare('SELECT 1 FROM narcotics_register WHERE reverses_id = ?').get(entryId);
    if (already) throw new DomainError('narcotics.alreadyReversed', `Entry ${entryId} is already reversed`);

    const effect = e.direction === 'in' ? -e.qty : e.qty; // undo the original
    const before = lastBalance(db, e.itemId) ?? 0;
    return Number(
      db
        .prepare(
          `INSERT INTO narcotics_register (serial, at, item_id, batch_id, direction, qty_base, balance_after,
             reverses_id, user_id, approved_by, reason, ref_table, ref_id)
           VALUES (?, ${NOW}, ?, ?, 'reversal', ?, ?, ?, ?, ?, ?, 'narcotics_register', ?)`
        )
        .run(nextSequence(db, 'narcotics'), e.itemId, e.batchId, e.qty, before + effect, e.id, userId, approvedBy, reason.trim(), e.id)
        .lastInsertRowid
    );
  })();
}

/**
 * Re-enter a reversed sale with corrected prescription details. Writes a
 * new 'out' (or 'in') row equal in quantity to the reversed one.
 */
export function correctNarcoticsEntry(
  db: Db,
  reversedEntryId: number,
  details: PrescriptionInput,
  reason: string,
  userId: number,
  approvedBy: number
): number {
  return db.transaction(() => {
    const v = validatePrescription(details);
    const e = db
      .prepare(
        `SELECT id, item_id AS itemId, batch_id AS batchId, direction, qty_base AS qty, ref_table AS refTable, ref_id AS refId
         FROM narcotics_register WHERE id = ?`
      )
      .get(reversedEntryId) as
      | { id: number; itemId: number; batchId: number | null; direction: 'in' | 'out'; qty: number; refTable: string | null; refId: number | null }
      | undefined;
    if (!e) throw new DomainError('narcotics.notFound', `Register entry ${reversedEntryId} not found`);
    if (!db.prepare('SELECT 1 FROM narcotics_register WHERE reverses_id = ?').get(reversedEntryId)) {
      throw new DomainError('narcotics.notReversed', 'Reverse the wrong entry before re-entering it');
    }
    const delta = e.direction === 'in' ? e.qty : -e.qty;
    const before = lastBalance(db, e.itemId) ?? 0;
    return Number(
      db
        .prepare(
          `INSERT INTO narcotics_register (serial, at, item_id, batch_id, direction, qty_base, balance_after,
             prescription_no, doctor_name, doctor_syndicate_no, patient_name, patient_id_no,
             ref_table, ref_id, user_id, approved_by, reason)
           VALUES (?, ${NOW}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          nextSequence(db, 'narcotics'),
          e.itemId,
          e.batchId,
          e.direction,
          e.qty,
          before + delta,
          v.prescriptionNo,
          v.doctorName,
          v.doctorSyndicateNo,
          v.patientName,
          v.patientIdNo,
          e.refTable,
          e.refId,
          userId,
          approvedBy,
          `تصحيح: ${reason.trim()}`
        ).lastInsertRowid
    );
  })();
}

/** Reverse a wrongly recorded entry and re-enter it with corrected details, atomically. */
export function fixNarcoticsEntry(
  db: Db,
  entryId: number,
  details: PrescriptionInput,
  reason: string,
  userId: number,
  approvedBy: number
): number {
  return db.transaction(() => {
    reverseNarcoticsEntry(db, entryId, reason, userId, approvedBy);
    return correctNarcoticsEntry(db, entryId, details, reason, userId, approvedBy);
  })();
}

export function listNarcoticsRegister(
  db: Db,
  filter: { itemId?: number; from?: string; to?: string; limit?: number } = {}
): NarcoticsRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.itemId) {
    where.push('n.item_id = ?');
    params.push(filter.itemId);
  }
  if (filter.from) {
    where.push('n.at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push("n.at < datetime(?, '+1 day')");
    params.push(filter.to);
  }
  params.push(filter.limit ?? 1000);
  return db
    .prepare(
      `SELECT n.id, n.serial, n.at, n.item_id AS itemId, i.name_ar AS itemName, n.batch_id AS batchId,
              n.direction, n.qty_base AS qtyBase, n.balance_after AS balanceAfter,
              n.prescription_no AS prescriptionNo, n.doctor_name AS doctorName,
              n.doctor_syndicate_no AS doctorSyndicateNo, n.patient_name AS patientName,
              n.patient_id_no AS patientIdNo, n.ref_table AS refTable, n.ref_id AS refId,
              n.reverses_id AS reversesId, n.reason, u.display_name AS userName, a.display_name AS approvedByName
       FROM narcotics_register n
       JOIN items i ON i.id = n.item_id
       LEFT JOIN users u ON u.id = n.user_id
       LEFT JOIN users a ON a.id = n.approved_by
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY n.serial
       LIMIT ?`
    )
    .all(...params) as NarcoticsRow[];
}

export interface NarcoticsReconciliationRow {
  itemId: number;
  code: number;
  nameAr: string;
  scheduleClass: string;
  registerBalance: number | null;
  physicalQty: number;
  difference: number | null;
}

/** Register balance vs physical stock for every scheduled item. A non-zero difference needs explaining. */
export function narcoticsReconciliation(db: Db): NarcoticsReconciliationRow[] {
  return db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr, i.schedule_class AS scheduleClass,
              (SELECT n.balance_after FROM narcotics_register n WHERE n.item_id = i.id ORDER BY n.serial DESC LIMIT 1) AS registerBalance,
              COALESCE((SELECT SUM(b.qty_on_hand) FROM batches b WHERE b.item_id = i.id), 0) AS physicalQty
       FROM items i
       WHERE i.schedule_class != 'none'
       ORDER BY i.name_ar`
    )
    .all()
    .map((r) => {
      const row = r as Omit<NarcoticsReconciliationRow, 'difference'>;
      return { ...row, difference: row.registerBalance === null ? null : row.physicalQty - row.registerBalance };
    });
}
