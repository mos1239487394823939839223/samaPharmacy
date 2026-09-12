-- ============================================================
-- Migration 0002 — seed a system user
--
-- purchase_invoices, sales_invoices, stock_moves, shifts and others all
-- carry a NOT NULL user_id foreign key to users(id), but M10 (real users,
-- roles, authentication) has not been built yet. Every write path that
-- needs a user already takes a userId parameter rather than hardcoding
-- one, so nothing above the seam changes when M10 lands — only the
-- caller starts passing a real logged-in user's id instead of this one.
--
-- password_hash is a placeholder, not a real credential: this row is not
-- a login path, and nothing authenticates against it. M10 replaces it
-- with real accounts.
-- ============================================================

INSERT INTO users (id, username, display_name, password_hash, role)
VALUES (1, 'system', 'System', 'unset', 'owner');
