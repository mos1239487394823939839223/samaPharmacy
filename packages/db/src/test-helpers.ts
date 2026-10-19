/**
 * Shared test fixtures. Not exported from the package index — tests only.
 */

import type { Db } from './connection';

/** An expiry date safely in the future for purchase fixtures (purchases now reject past/blank expiry). */
export const FUTURE_EXPIRY = '2099-12-31';

/**
 * Drop the migration-0008 immutability triggers so a test can backdate a
 * confirmed invoice or simulate corruption. Production code never does this.
 */
export function allowHistoryEdits(db: Db): void {
  const triggers = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_%'")
    .all() as { name: string }[];
  for (const t of triggers) db.exec(`DROP TRIGGER ${t.name}`);
}
