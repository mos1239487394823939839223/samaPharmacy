-- ============================================================
-- Migration 0012 — one pharmacy, one operator (decision D18)
--
-- The owner decided the app needs no user accounts: it serves a single
-- pharmacy and opens straight to work. Every write is recorded under the
-- built-in operator (user 1, migration 0002); this gives it a readable
-- name in the audit log, the narcotics register and on receipts.
-- ============================================================

UPDATE users SET display_name = 'الصيدلية' WHERE id = 1;
