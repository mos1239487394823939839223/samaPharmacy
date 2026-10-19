/**
 * Local-time SQL fragments (migration 0007).
 *
 * Use these in every INSERT/UPDATE that records a moment. Never rely on a
 * column DEFAULT (those still say datetime('now'), i.e. UTC) and never write
 * bare datetime('now') / date('now') — the local-time guard in
 * backup-and-migrations.test.ts fails the build if either
 * appears in a repository.
 */

/** Current local timestamp, 'YYYY-MM-DD HH:MM:SS'. */
export const NOW = "datetime('now','localtime')";

/** Current local calendar date, 'YYYY-MM-DD'. */
export const TODAY = "date('now','localtime')";
