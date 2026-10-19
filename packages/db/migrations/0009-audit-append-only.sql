-- ============================================================
-- Migration 0009 — users and audit log go live (spec M10)
--
-- The audit log is evidence: it records who changed prices, approved
-- returns without an invoice, adjusted stock, voided drafts, restored
-- backups. Like every ledger it is append-only.
--
-- Users are never deleted (their id is on every invoice they rang up);
-- they are deactivated.
-- ============================================================

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'immutable: audit_log is append-only'); END;
CREATE TRIGGER trg_audit_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'immutable: audit_log is append-only'); END;

CREATE TRIGGER trg_users_no_delete BEFORE DELETE ON users
BEGIN SELECT RAISE(ABORT, 'immutable: users are deactivated, never deleted'); END;

CREATE INDEX IF NOT EXISTS ix_audit_user ON audit_log(user_id, id);
