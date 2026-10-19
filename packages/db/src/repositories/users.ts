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
  return db
    .prepare(
      `SELECT a.id, a.at, a.user_id AS userId, u.display_name AS userName, a.machine, a.action, a.entity,
              a.entity_id AS entityId, a.before_json AS beforeJson, a.after_json AS afterJson, a.note
       FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.id DESC LIMIT ?`
    )
    .all(...params) as AuditRow[];
}
