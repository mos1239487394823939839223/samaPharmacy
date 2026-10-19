-- ============================================================
-- Migration 0008 — enforce "nothing is deleted, posted is never edited"
--
-- CLAUDE.md rules 8 and 9 were enforced only by the repositories being
-- careful. These triggers make the database refuse the write itself, so a
-- future bug or a hand-run SQL statement cannot quietly rewrite history:
--
--   * stock_moves, customer_ledger, supplier_ledger, narcotics_register,
--     cash_transactions, stock_adjustments: append-only.
--   * A confirmed sales/purchase invoice, and its lines, cannot be updated
--     or deleted. Returns are created already confirmed and never change.
--   * Master data (items, customers, suppliers, warehouses, batches) is
--     deactivated, never deleted.
--
-- Corrections are reversing entries (a return, an adjustment, a payment).
-- ============================================================

CREATE TRIGGER trg_stock_moves_no_update BEFORE UPDATE ON stock_moves
BEGIN SELECT RAISE(ABORT, 'immutable: stock_moves is append-only'); END;
CREATE TRIGGER trg_stock_moves_no_delete BEFORE DELETE ON stock_moves
BEGIN SELECT RAISE(ABORT, 'immutable: stock_moves is append-only'); END;

CREATE TRIGGER trg_customer_ledger_no_update BEFORE UPDATE ON customer_ledger
BEGIN SELECT RAISE(ABORT, 'immutable: customer_ledger is append-only'); END;
CREATE TRIGGER trg_customer_ledger_no_delete BEFORE DELETE ON customer_ledger
BEGIN SELECT RAISE(ABORT, 'immutable: customer_ledger is append-only'); END;

CREATE TRIGGER trg_supplier_ledger_no_update BEFORE UPDATE ON supplier_ledger
BEGIN SELECT RAISE(ABORT, 'immutable: supplier_ledger is append-only'); END;
CREATE TRIGGER trg_supplier_ledger_no_delete BEFORE DELETE ON supplier_ledger
BEGIN SELECT RAISE(ABORT, 'immutable: supplier_ledger is append-only'); END;

CREATE TRIGGER trg_narcotics_no_update BEFORE UPDATE ON narcotics_register
BEGIN SELECT RAISE(ABORT, 'immutable: narcotics_register is append-only'); END;
CREATE TRIGGER trg_narcotics_no_delete BEFORE DELETE ON narcotics_register
BEGIN SELECT RAISE(ABORT, 'immutable: narcotics_register is append-only'); END;

CREATE TRIGGER trg_cash_tx_no_update BEFORE UPDATE ON cash_transactions
BEGIN SELECT RAISE(ABORT, 'immutable: cash_transactions is append-only'); END;
CREATE TRIGGER trg_cash_tx_no_delete BEFORE DELETE ON cash_transactions
BEGIN SELECT RAISE(ABORT, 'immutable: cash_transactions is append-only'); END;

CREATE TRIGGER trg_adjustments_no_update BEFORE UPDATE ON stock_adjustments
BEGIN SELECT RAISE(ABORT, 'immutable: stock_adjustments is append-only'); END;
CREATE TRIGGER trg_adjustments_no_delete BEFORE DELETE ON stock_adjustments
BEGIN SELECT RAISE(ABORT, 'immutable: stock_adjustments is append-only'); END;

CREATE TRIGGER trg_sales_inv_no_edit_posted BEFORE UPDATE ON sales_invoices
WHEN OLD.status = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'immutable: a confirmed sales invoice cannot be edited'); END;
CREATE TRIGGER trg_sales_inv_no_delete BEFORE DELETE ON sales_invoices
BEGIN SELECT RAISE(ABORT, 'immutable: sales invoices are never deleted'); END;
CREATE TRIGGER trg_sales_lines_no_edit_posted BEFORE UPDATE ON sales_invoice_lines
WHEN (SELECT status FROM sales_invoices WHERE id = OLD.invoice_id) = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'immutable: lines of a confirmed sales invoice cannot be edited'); END;
CREATE TRIGGER trg_sales_lines_no_delete BEFORE DELETE ON sales_invoice_lines
BEGIN SELECT RAISE(ABORT, 'immutable: sales invoice lines are never deleted'); END;

CREATE TRIGGER trg_purch_inv_no_edit_posted BEFORE UPDATE ON purchase_invoices
WHEN OLD.status = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'immutable: a confirmed purchase invoice cannot be edited'); END;
CREATE TRIGGER trg_purch_inv_no_delete BEFORE DELETE ON purchase_invoices
BEGIN SELECT RAISE(ABORT, 'immutable: purchase invoices are never deleted'); END;
CREATE TRIGGER trg_purch_lines_no_edit_posted BEFORE UPDATE ON purchase_invoice_lines
WHEN (SELECT status FROM purchase_invoices WHERE id = OLD.invoice_id) = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'immutable: lines of a confirmed purchase invoice cannot be edited'); END;
CREATE TRIGGER trg_purch_lines_no_delete BEFORE DELETE ON purchase_invoice_lines
BEGIN SELECT RAISE(ABORT, 'immutable: purchase invoice lines are never deleted'); END;

CREATE TRIGGER trg_sales_returns_no_update BEFORE UPDATE ON sales_returns
BEGIN SELECT RAISE(ABORT, 'immutable: sales returns cannot be edited'); END;
CREATE TRIGGER trg_sales_returns_no_delete BEFORE DELETE ON sales_returns
BEGIN SELECT RAISE(ABORT, 'immutable: sales returns are never deleted'); END;
CREATE TRIGGER trg_sales_return_lines_no_update BEFORE UPDATE ON sales_return_lines
BEGIN SELECT RAISE(ABORT, 'immutable: sales return lines cannot be edited'); END;
CREATE TRIGGER trg_sales_return_lines_no_delete BEFORE DELETE ON sales_return_lines
BEGIN SELECT RAISE(ABORT, 'immutable: sales return lines are never deleted'); END;

CREATE TRIGGER trg_purch_returns_no_update BEFORE UPDATE ON purchase_returns
BEGIN SELECT RAISE(ABORT, 'immutable: purchase returns cannot be edited'); END;
CREATE TRIGGER trg_purch_returns_no_delete BEFORE DELETE ON purchase_returns
BEGIN SELECT RAISE(ABORT, 'immutable: purchase returns are never deleted'); END;
CREATE TRIGGER trg_purch_return_lines_no_update BEFORE UPDATE ON purchase_return_lines
BEGIN SELECT RAISE(ABORT, 'immutable: purchase return lines cannot be edited'); END;
CREATE TRIGGER trg_purch_return_lines_no_delete BEFORE DELETE ON purchase_return_lines
BEGIN SELECT RAISE(ABORT, 'immutable: purchase return lines are never deleted'); END;

CREATE TRIGGER trg_items_no_delete BEFORE DELETE ON items
BEGIN SELECT RAISE(ABORT, 'immutable: items are deactivated, never deleted'); END;
CREATE TRIGGER trg_customers_no_delete BEFORE DELETE ON customers
BEGIN SELECT RAISE(ABORT, 'immutable: customers are deactivated, never deleted'); END;
CREATE TRIGGER trg_suppliers_no_delete BEFORE DELETE ON suppliers
BEGIN SELECT RAISE(ABORT, 'immutable: suppliers are deactivated, never deleted'); END;
CREATE TRIGGER trg_warehouses_no_delete BEFORE DELETE ON warehouses
BEGIN SELECT RAISE(ABORT, 'immutable: warehouses are deactivated, never deleted'); END;
CREATE TRIGGER trg_batches_no_delete BEFORE DELETE ON batches
BEGIN SELECT RAISE(ABORT, 'immutable: batches are never deleted'); END;
