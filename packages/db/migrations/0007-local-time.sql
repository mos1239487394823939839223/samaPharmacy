-- ============================================================
-- Migration 0007 — store timestamps in local (Cairo) time
--
-- Every DEFAULT (datetime('now')) and every datetime('now') in the
-- repositories wrote UTC. Egypt is UTC+2/+3, so a sale at 00:30 local was
-- stored as the previous day and counted in the previous day's report, the
-- shift's open/close times read three hours early, and the return window
-- was measured from the wrong instant.
--
-- From this migration on, the repositories write datetime('now','localtime')
-- explicitly (packages/db/src/time.ts). This converts the rows written
-- before that. SQLite's 'localtime' modifier applies the OS time zone rules
-- for each row's own date, so rows from before and after a DST change are
-- each shifted by the offset that was in force at the time.
--
-- Column DEFAULTs in the original CREATE TABLEs still say datetime('now');
-- changing them would mean rebuilding every table. No insert path relies on
-- them any more — a test (time.test.ts) guards that.
-- ============================================================

UPDATE settings           SET updated_at   = datetime(updated_at, 'localtime');
UPDATE audit_log          SET at           = datetime(at, 'localtime');
UPDATE items              SET created_at   = datetime(created_at, 'localtime'),
                              updated_at   = datetime(updated_at, 'localtime');
UPDATE price_history      SET changed_at   = datetime(changed_at, 'localtime');
UPDATE customers          SET created_at   = datetime(created_at, 'localtime');
UPDATE batches            SET received_at  = datetime(received_at, 'localtime');
UPDATE stock_moves        SET at           = datetime(at, 'localtime');
UPDATE stock_adjustments  SET at           = datetime(at, 'localtime');
UPDATE sales_invoices     SET created_at   = datetime(created_at, 'localtime'),
                              confirmed_at = datetime(confirmed_at, 'localtime');
UPDATE sales_returns      SET created_at   = datetime(created_at, 'localtime');
UPDATE purchase_invoices  SET created_at   = datetime(created_at, 'localtime'),
                              confirmed_at = datetime(confirmed_at, 'localtime');
UPDATE purchase_returns   SET created_at   = datetime(created_at, 'localtime');
UPDATE customer_ledger    SET at           = datetime(at, 'localtime');
UPDATE supplier_ledger    SET at           = datetime(at, 'localtime');
UPDATE shifts             SET opened_at    = datetime(opened_at, 'localtime'),
                              closed_at    = datetime(closed_at, 'localtime');
UPDATE cash_transactions  SET at           = datetime(at, 'localtime');
UPDATE narcotics_register SET at           = datetime(at, 'localtime');
