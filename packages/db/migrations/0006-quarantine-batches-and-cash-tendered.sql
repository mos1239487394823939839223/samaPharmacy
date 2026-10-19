-- migrate:foreign-keys-off
-- ============================================================
-- Migration 0006 — quarantine batches, tendered cash, missing indexes
--
-- 1. batches UNIQUE now includes is_quarantined.
--    A refrigerated or damaged sales return goes into a quarantine twin of
--    the original batch (same item/warehouse/batch_number/expiry/cost,
--    is_quarantined = 1). The old key did not include is_quarantined, so the
--    twin collided with the original and every such return failed with
--    "UNIQUE constraint failed" whenever the batch had a batch number and an
--    expiry — i.e. almost always. SQLite cannot alter a constraint, so the
--    table is rebuilt (foreign keys off for the duration, re-checked by the
--    migration runner before COMMIT). Row ids are preserved, so every
--    stock_moves / invoice-line reference stays valid.
--
-- 2. v_sellable_batches compares expiry against the LOCAL date. date('now')
--    is UTC, so in Cairo a batch expiring today stayed sellable until 02:00
--    or 03:00. A batch expiring today is not sellable (decision D10).
--
-- 3. sales_invoices.cash_tendered — the note the customer handed over.
--    paid_cash used to hold that figure, and shift close summed it as
--    "cash in the drawer", so every sale with change produced a phantom
--    shortage equal to the change. paid_cash is now the amount kept (the
--    total, for a cash invoice); cash_tendered is kept for the receipt.
--
-- 4. Indexes for lookups that were full scans (audit DB-06).
-- ============================================================

DROP VIEW v_item_stock;
DROP VIEW v_sellable_batches;

CREATE TABLE batches_new (
  id             INTEGER PRIMARY KEY,
  item_id        INTEGER NOT NULL REFERENCES items(id),
  warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
  batch_number   TEXT,
  expiry_date    TEXT,
  qty_on_hand    INTEGER NOT NULL DEFAULT 0,
  unit_cost      INTEGER NOT NULL,
  received_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  source_line_id INTEGER,
  is_quarantined INTEGER NOT NULL DEFAULT 0,
  UNIQUE (item_id, warehouse_id, batch_number, expiry_date, unit_cost, is_quarantined)
);

INSERT INTO batches_new (id, item_id, warehouse_id, batch_number, expiry_date, qty_on_hand,
                         unit_cost, received_at, source_line_id, is_quarantined)
SELECT id, item_id, warehouse_id, batch_number, expiry_date, qty_on_hand,
       unit_cost, received_at, source_line_id, is_quarantined
FROM batches;

DROP TABLE batches;
ALTER TABLE batches_new RENAME TO batches;

CREATE INDEX ix_batches_item_expiry ON batches(item_id, expiry_date);
CREATE INDEX ix_batches_expiry      ON batches(expiry_date) WHERE qty_on_hand > 0;

CREATE VIEW v_item_stock AS
SELECT
  i.id            AS item_id,
  i.code,
  i.name_ar,
  b.warehouse_id,
  SUM(b.qty_on_hand)                                   AS qty_on_hand,
  MIN(CASE WHEN b.qty_on_hand > 0 THEN b.expiry_date END) AS nearest_expiry,
  SUM(b.qty_on_hand * b.unit_cost)                     AS stock_value
FROM items i
LEFT JOIN batches b
       ON b.item_id = i.id
      AND b.is_quarantined = 0
WHERE i.is_active = 1
GROUP BY i.id, b.warehouse_id;

CREATE VIEW v_sellable_batches AS
SELECT b.*
FROM batches b
JOIN items i ON i.id = b.item_id
WHERE b.qty_on_hand > 0
  AND b.is_quarantined = 0
  AND (i.no_expiry = 1 OR b.expiry_date IS NULL OR b.expiry_date > date('now','localtime'))
ORDER BY b.expiry_date ASC, b.id ASC;

ALTER TABLE sales_invoices ADD COLUMN cash_tendered INTEGER;

UPDATE sales_invoices
   SET cash_tendered = paid_cash,
       paid_cash     = total
 WHERE invoice_type = 'cash';

CREATE INDEX ix_sale_lines_batch        ON sales_invoice_lines(batch_id);
CREATE INDEX ix_sale_return_lines_src   ON sales_return_lines(source_line_id);
CREATE INDEX ix_purch_lines_batch       ON purchase_invoice_lines(batch_id);
CREATE INDEX ix_moves_batch             ON stock_moves(batch_id, id);
CREATE INDEX ix_cust_ledger_id          ON customer_ledger(customer_id, id);
CREATE INDEX ix_supp_ledger_id          ON supplier_ledger(supplier_id, id);
CREATE INDEX ix_sales_returns_source    ON sales_returns(source_invoice_id);
CREATE INDEX ix_purchase_returns_source ON purchase_returns(source_invoice_id);
