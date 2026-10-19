-- ============================================================
-- Migration 0005 — composite indexes for the active-name list screens
--
-- Restored: this migration was applied to existing databases on
-- 2026-09-15 (schema_migrations records version 5 under this name), but
-- the file itself was later lost from the repository. Without it, version
-- 5 was free to be reused by a different migration, which those databases
-- would then silently skip. The runner now refuses a name mismatch
-- (migrate.ts), and this file is restored so fresh and existing databases
-- agree. IF NOT EXISTS keeps it safe on databases that already have them.
--
-- listItems / listCustomers / listSuppliers filter is_active = 1 and order
-- by name; these indexes serve both the filter and the sort.
-- ============================================================

CREATE INDEX IF NOT EXISTS ix_items_active_name     ON items(is_active, name_ar);
CREATE INDEX IF NOT EXISTS ix_customers_active_name ON customers(is_active, name);
CREATE INDEX IF NOT EXISTS ix_suppliers_active_name ON suppliers(is_active, name_ar);
