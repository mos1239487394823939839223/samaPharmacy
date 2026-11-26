/**
 * The audit log (spec M10's audit trail).
 *
 * The app serves one pharmacy with no user accounts (decision D18). Every
 * write is recorded under the single built-in operator, user 1 (migration
 * 0002), with the record before and after and the machine it came from.
 */

import os from 'node:os';
import type { Db } from '../connection';
import { NOW } from '../time';

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditEntry {
  userId: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: unknown;
  after?: unknown;
  note?: string | null;
}

/** Keys never written to the audit log. */
const SECRET_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'approval']);

function redact(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value, (key, v) => (SECRET_KEYS.has(key) ? '***' : v));
}

export function recordAudit(db: Db, entry: AuditEntry): void {
  db.prepare(
    `INSERT INTO audit_log (user_id, at, machine, action, entity, entity_id, before_json, after_json, note)
     VALUES (?, ${NOW}, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.userId,
    os.hostname(),
    entry.action,
    entry.entity,
    entry.entityId ?? null,
    redact(entry.before),
    redact(entry.after),
    entry.note ?? null
  );
}

export interface AuditRow {
  id: number;
  at: string;
  userId: number | null;
  userName: string | null;
  machine: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  beforeJson: string | null;
  afterJson: string | null;
  note: string | null;
}

export function listAudit(
  db: Db,
  filter: { from?: string; to?: string; userId?: number; entity?: string; limit?: number } = {}
): AuditRow[] {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.from) {
    where.push('a.at >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    where.push("a.at < datetime(?, '+1 day')");
    params.push(filter.to);
  }
  if (filter.userId) {
    where.push('a.user_id = ?');
    params.push(filter.userId);
  }
  if (filter.entity) {
    where.push('a.entity = ?');
    params.push(filter.entity);
  }
  params.push(filter.limit ?? 300);
  const rows = db
    .prepare(
      `SELECT a.id, a.at, a.user_id AS userId, u.display_name AS userName, a.machine, a.action, a.entity,
              a.entity_id AS entityId, a.before_json AS beforeJson, a.after_json AS afterJson, a.note
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.id DESC LIMIT ?`
    )
    .all(...params) as Omit<AuditRow, 'subject'>[];
  return rows.map((r) => ({ ...r, subject: auditSubject(db, r) }));
}

/** Lookups that name the record an audit row is about. Ids are internal; names are what staff recognise. */
const SUBJECTS: Record<string, string> = {
  items: 'SELECT name_ar AS s FROM items WHERE id = ?',
  shortages: 'SELECT i.name_ar AS s FROM shortages x JOIN items i ON i.id = x.item_id WHERE x.id = ?',
  suppliers: 'SELECT name_ar AS s FROM suppliers WHERE id = ?',
  customers: 'SELECT name AS s FROM customers WHERE id = ?',
  warehouses: 'SELECT name_ar AS s FROM warehouses WHERE id = ?',
  insurance: 'SELECT name_ar AS s FROM insurance_companies WHERE id = ?',
  sales: "SELECT '#' || serial AS s FROM sales_invoices WHERE id = ?",
  purchases: "SELECT '#' || serial || ' — ' || supplier_invoice_no AS s FROM purchase_invoices WHERE id = ?",
  salesReturns: "SELECT '#' || serial AS s FROM sales_returns WHERE id = ?",
  purchaseReturns: "SELECT '#' || serial AS s FROM purchase_returns WHERE id = ?",
  shifts: "SELECT '#' || id || ' — ' || substr(opened_at, 1, 16) AS s FROM shifts WHERE id = ?",
};

function auditSubject(db: Db, r: { entity: string; entityId: number | null; afterJson: string | null }): string | null {
  const id = r.entityId;
  // shortages.add records the item, not the new row id.
  if (r.entity === 'shortages' && r.afterJson) {
    try {
      const after = JSON.parse(r.afterJson) as { itemId?: number };
      if (after.itemId) return (db.prepare('SELECT name_ar AS s FROM items WHERE id = ?').get(after.itemId) as { s: string } | undefined)?.s ?? null;
    } catch {
      /* not JSON — fall through */
    }
  }
  const sql = SUBJECTS[r.entity];
  if (!sql || id == null) return null;
  try {
    return (db.prepare(sql).get(id) as { s: string } | undefined)?.s ?? null;
  } catch {
    return null; // a column this database does not have — the id alone still shows
  }
}
