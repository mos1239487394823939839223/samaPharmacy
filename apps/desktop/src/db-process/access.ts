/**
 * Audit trail for the db process.
 *
 * The app serves one pharmacy with no user accounts (decision D18): there is
 * no login and no permission check. Every write is still recorded in the
 * audit log — what changed, when, on which machine, the record before and
 * after — under the single built-in operator (user 1).
 */

import { recordAudit, type Db } from '@pharmacy/db';
import type { DbRequest } from '@pharmacy/shared';

/** The single operator every write is recorded under (migration 0002). */
export const OPERATOR_ID = 1;

/** Requests that change nothing — never audited. */
const READ_SUFFIXES = [
  '.list', '.get', '.getBySerial', '.search', '.balance', '.ledger', '.count', '.findByBarcode',
  '.batches', '.sellableBatches', '.batchMoves', '.lowStock', '.expiryReport', '.returnableLines',
  '.report', '.reportInvoices', '.trend', '.getOpen', '.computeExpectedCash', '.cashTransactions',
  '.salesSummary', '.receivablesSummary', '.status', '.held', '.receipt',
  '.prescription', '.alternatives', '.unitPriceIssues', '.register', '.reconciliation', '.moves',
  '.preview', '.companies', '.exclusions', '.unclaimed', '.claims', '.claimLines', '.receivables',
];

export function isMutation(kind: string): boolean {
  if (kind === 'ping') return false;
  return !READ_SUFFIXES.some((s) => kind.endsWith(s));
}

/** One audit row per successful write: what, which record, the payload. */
export function auditRequest(db: Db, req: DbRequest, result: unknown, before?: unknown): void {
  if (!isMutation(req.kind)) return;
  const { kind, ...payload } = req as DbRequest & Record<string, unknown>;
  const entityId =
    typeof result === 'number' ? result : typeof (payload as { id?: unknown }).id === 'number' ? (payload as { id: number }).id : null;
  recordAudit(db, {
    userId: OPERATOR_ID,
    action: kind,
    entity: kind.split('.')[0]!,
    entityId,
    before,
    after: 'input' in payload ? payload.input : payload,
  });
}
