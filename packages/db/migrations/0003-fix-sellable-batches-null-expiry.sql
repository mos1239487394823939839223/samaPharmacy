-- ============================================================
-- Migration 0003 — fix v_sellable_batches for NULL expiry_date
--
-- v_sellable_batches (0001) only exempted a batch from the expiry check
-- when the item's no_expiry flag was 1. A batch with a NULL expiry_date
-- on an item that was NOT flagged no_expiry -- e.g. a purchase line where
-- the pharmacist left the expiry field blank -- silently failed
-- `NULL > date('now')` (which is NULL, i.e. falsy in a WHERE clause) and
-- the batch became permanently invisible to FEFO. No error anywhere:
-- the stock is real, paid for, and sitting in the warehouse, but the POS
-- would never offer it.
--
-- A missing expiry date is a data-entry gap, not evidence the stock has
-- expired. The safer default is to show it and let a human notice the
-- missing date, not to hide real stock. SQLite has no DROP VIEW IF NOT
-- EXISTS complication here -- views can be replaced outright.
-- ============================================================

DROP VIEW v_sellable_batches;

CREATE VIEW v_sellable_batches AS
SELECT b.*
FROM batches b
JOIN items i ON i.id = b.item_id
WHERE b.qty_on_hand > 0
  AND b.is_quarantined = 0
  AND (i.no_expiry = 1 OR b.expiry_date IS NULL OR b.expiry_date > date('now'))
ORDER BY b.expiry_date ASC, b.id ASC;
