/**
 * Audit log rows (spec M10's audit trail).
 *
 * The app serves a single pharmacy with no user accounts (decision D18), so
 * there are no roles or logins — but every write is still recorded.
 */

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
