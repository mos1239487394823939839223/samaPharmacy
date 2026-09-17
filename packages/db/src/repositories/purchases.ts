/**
 * Purchase invoice repository. فاتورة شراء — build order screen 6.
 *
 * Confirming an invoice is the single most consequential transaction in the
 * system: it creates batches, decides their landed cost via
 * packages/core/landed-cost.ts, and is the only place stock enters the
 * pharmacy. Everything happens inside one db.transaction() so a failure
 * partway leaves no partial batches, no orphaned stock_moves, and no ledger
 * entry with nothing behind it.
 */

import { landedCost, type LandedCostLine } from '@pharmacy/core';
import type { Db } from '../connection';
import { nextSequence } from './items';
import { getSupplierBalance } from './suppliers';

export interface PurchaseLineInput {
  lineNo: number;
  itemId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  bonusInUnit?: number;
  bonusBase?: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  unitPurchasePrice: number;
  discountPct?: number;
  discountAmt?: number;
  taxPct?: number;
  taxAmt?: number;
}

export interface PurchaseInvoiceInput {
  supplierInvoiceNo: string;
  supplierId: number;
  warehouseId: number;
  purchaseType: 'cash' | 'credit';
  invoiceDate: string;
  dueDate?: string | null;
  expenses?: number;
  extraDiscountAmt?: number;
  extraDiscountPct?: number;
  notes?: string | null;
  lines: PurchaseLineInput[];
}

export interface PurchaseInvoiceRow {
  id: number;
  serial: number;
  supplierInvoiceNo: string;
  supplierId: number;
  warehouseId: number;
  purchaseType: string;
  invoiceDate: string;
  status: string;
  expenses: number;
  extraDiscountAmt: number;
  subtotal: number;
  taxTotal: number;
  total: number;
  paid: number;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface PurchaseLineRow extends PurchaseLineInput {
  id: number;
  valueBeforeDiscount: number;
  valueAfterDiscount: number;
  valueAfterTax: number;
  landedUnitCost: number;
  batchId: number | null;
}

/** Line arithmetic: ق.خ -> discount -> ب.خ -> tax -> ب.ض (grid convention). */
function computeLineValues(line: PurchaseLineInput) {
  const valueBeforeDiscount = line.qtyInUnit * line.unitPurchasePrice;
  const discountAmt =
    line.discountAmt ?? Math.round((valueBeforeDiscount * (line.discountPct ?? 0)) / 100);
  const valueAfterDiscount = valueBeforeDiscount - discountAmt;
  const taxAmt = line.taxAmt ?? Math.round((valueAfterDiscount * (line.taxPct ?? 0)) / 100);
  const valueAfterTax = valueAfterDiscount + taxAmt;
  return { valueBeforeDiscount, discountAmt, valueAfterDiscount, taxAmt, valueAfterTax };
}

/**
 * Create a purchase invoice in draft status. No stock moves yet — those only
 * happen on confirm, so a draft can be edited or abandoned freely.
 */
export function createPurchaseInvoice(db: Db, input: PurchaseInvoiceInput): number {
  const run = db.transaction((data: PurchaseInvoiceInput) => {
    const serial = nextSequence(db, 'purchase_invoice');

    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;
    const computed = data.lines.map((line) => {
      const v = computeLineValues(line);
      subtotal += v.valueBeforeDiscount;
      taxTotal += v.taxAmt;
      total += v.valueAfterTax;
      return { line, v };
    });

    const extraDiscountAmt =
      data.extraDiscountAmt ?? Math.round((total * (data.extraDiscountPct ?? 0)) / 100);
    total -= extraDiscountAmt;

    const result = db
      .prepare(
        `INSERT INTO purchase_invoices (
           serial, supplier_invoice_no, supplier_id, warehouse_id, user_id,
           purchase_type, invoice_date, due_date, expenses,
           extra_discount_amt, extra_discount_pct, subtotal, tax_total, total, notes
         ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        serial,
        data.supplierInvoiceNo,
        data.supplierId,
        data.warehouseId,
        data.purchaseType,
        data.invoiceDate,
        data.dueDate ?? null,
        data.expenses ?? 0,
        extraDiscountAmt,
        data.extraDiscountPct ?? 0,
        subtotal,
        taxTotal,
        total,
        data.notes ?? null
      );

    const invoiceId = Number(result.lastInsertRowid);

    const insertLine = db.prepare(
      `INSERT INTO purchase_invoice_lines (
         invoice_id, line_no, item_id, unit_id, qty_in_unit, qty_base,
         bonus_in_unit, bonus_base, batch_number, expiry_date,
         unit_purchase_price, value_before_discount, discount_pct, discount_amt,
         value_after_discount, tax_pct, tax_amt, value_after_tax
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const { line, v } of computed) {
      insertLine.run(
        invoiceId,
        line.lineNo,
        line.itemId,
        line.unitId,
        line.qtyInUnit,
        line.qtyBase,
        line.bonusInUnit ?? 0,
        line.bonusBase ?? 0,
        line.batchNumber ?? null,
        line.expiryDate ?? null,
        line.unitPurchasePrice,
        v.valueBeforeDiscount,
        line.discountPct ?? 0,
        v.discountAmt,
        v.valueAfterDiscount,
        line.taxPct ?? 0,
        v.taxAmt,
        v.valueAfterTax
      );
    }

    return invoiceId;
  });

  return run(input);
}

export function getPurchaseInvoice(db: Db, id: number): PurchaseInvoiceRow | undefined {
  return db
    .prepare(
      `SELECT id, serial, supplier_invoice_no AS supplierInvoiceNo, supplier_id AS supplierId,
              warehouse_id AS warehouseId, purchase_type AS purchaseType,
              invoice_date AS invoiceDate, status, expenses,
              extra_discount_amt AS extraDiscountAmt, subtotal, tax_total AS taxTotal,
              total, paid, notes, created_at AS createdAt, confirmed_at AS confirmedAt
       FROM purchase_invoices WHERE id = ?`
    )
    .get(id) as PurchaseInvoiceRow | undefined;
}

/**
 * Look up a purchase invoice by its serial directly rather than fetching a
 * page of recent invoices and scanning it client-side — see
 * getSalesInvoiceBySerial for the same reasoning. serial is UNIQUE, so this
 * is index-backed regardless of history size.
 */
export function getPurchaseInvoiceBySerial(db: Db, serial: number): PurchaseInvoiceRow | undefined {
  return db
    .prepare(
      `SELECT id, serial, supplier_invoice_no AS supplierInvoiceNo, supplier_id AS supplierId,
              warehouse_id AS warehouseId, purchase_type AS purchaseType,
              invoice_date AS invoiceDate, status, expenses,
              extra_discount_amt AS extraDiscountAmt, subtotal, tax_total AS taxTotal,
              total, paid, notes, created_at AS createdAt, confirmed_at AS confirmedAt
       FROM purchase_invoices WHERE serial = ?`
    )
    .get(serial) as PurchaseInvoiceRow | undefined;
}

export function getPurchaseLines(db: Db, invoiceId: number): PurchaseLineRow[] {
  return db
    .prepare(
      `SELECT id, line_no AS lineNo, item_id AS itemId, unit_id AS unitId,
              qty_in_unit AS qtyInUnit, qty_base AS qtyBase,
              bonus_in_unit AS bonusInUnit, bonus_base AS bonusBase,
              batch_number AS batchNumber, expiry_date AS expiryDate,
              unit_purchase_price AS unitPurchasePrice,
              value_before_discount AS valueBeforeDiscount,
              discount_pct AS discountPct, discount_amt AS discountAmt,
              value_after_discount AS valueAfterDiscount,
              tax_pct AS taxPct, tax_amt AS taxAmt, value_after_tax AS valueAfterTax,
              landed_unit_cost AS landedUnitCost, batch_id AS batchId
       FROM purchase_invoice_lines WHERE invoice_id = ? ORDER BY line_no`
    )
    .all(invoiceId) as PurchaseLineRow[];
}

export function listPurchaseInvoices(db: Db, limit = 100, offset = 0): PurchaseInvoiceRow[] {
  return db
    .prepare(
      `SELECT id, serial, supplier_invoice_no AS supplierInvoiceNo, supplier_id AS supplierId,
              warehouse_id AS warehouseId, purchase_type AS purchaseType,
              invoice_date AS invoiceDate, status, expenses,
              extra_discount_amt AS extraDiscountAmt, subtotal, tax_total AS taxTotal,
              total, paid, notes, created_at AS createdAt, confirmed_at AS confirmedAt
       FROM purchase_invoices ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as PurchaseInvoiceRow[];
}

/**
 * Confirm a draft invoice: compute landed cost, create or merge batches
 * (BR-11), write stock_moves, and post to supplier_ledger. All in one
 * transaction — this is the only place stock enters the pharmacy.
 */
export function confirmPurchaseInvoice(db: Db, invoiceId: number, userId = 1): void {
  const run = db.transaction(() => {
    const invoice = getPurchaseInvoice(db, invoiceId);
    if (!invoice) throw new Error(`Purchase invoice ${invoiceId} not found`);
    if (invoice.status !== 'draft' && invoice.status !== 'held') {
      throw new Error(`Cannot confirm invoice in status "${invoice.status}"`);
    }

    const lines = getPurchaseLines(db, invoiceId);
    if (lines.length === 0) throw new Error('Cannot confirm an invoice with no lines');

    const costInputs: LandedCostLine[] = lines.map((l) => ({
      lineNo: l.lineNo,
      lineTotal: l.valueAfterTax,
      qtyBase: l.qtyBase,
      bonusBase: l.bonusBase ?? 0,
    }));

    // The header discount here is the invoice-level extra discount only —
    // line-level discounts are already folded into valueAfterTax above.
    const costs = landedCost(costInputs, invoice.expenses, invoice.extraDiscountAmt);
    const costByLineNo = new Map(costs.map((c) => [c.lineNo, c]));

    const updateLine = db.prepare(
      'UPDATE purchase_invoice_lines SET landed_unit_cost = ?, batch_id = ? WHERE id = ?'
    );

    const findExistingBatch = db.prepare(
      `SELECT id, qty_on_hand AS qtyOnHand FROM batches
       WHERE item_id = ? AND warehouse_id = ? AND batch_number IS ?
         AND expiry_date IS ? AND unit_cost = ?`
    );

    const insertBatch = db.prepare(
      `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, source_line_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const growBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');

    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id)
       VALUES (?, ?, ?, ?, ?, 'purchase', 'purchase_invoice_lines', ?, ?)`
    );

    for (const line of lines) {
      const cost = costByLineNo.get(line.lineNo);
      if (!cost) throw new Error(`No landed cost computed for line ${line.lineNo}`);

      const totalQty = line.qtyBase + (line.bonusBase ?? 0);

      // BR-11: batch number + expiry + product (+ cost, per the schema's own
      // uniqueness constraint) match an existing batch -> add to it rather
      // than creating a duplicate.
      const existing = findExistingBatch.get(
        line.itemId,
        invoice.warehouseId,
        line.batchNumber ?? null,
        line.expiryDate ?? null,
        cost.landedUnitCost
      ) as { id: number; qtyOnHand: number } | undefined;

      let batchId: number;
      if (existing) {
        growBatch.run(totalQty, existing.id);
        batchId = existing.id;
      } else {
        const result = insertBatch.run(
          line.itemId,
          invoice.warehouseId,
          line.batchNumber ?? null,
          line.expiryDate ?? null,
          totalQty,
          cost.landedUnitCost,
          line.id
        );
        batchId = Number(result.lastInsertRowid);
      }

      // Rule 8: every stock change writes a matching stock_moves row in the
      // same transaction.
      insertMove.run(batchId, line.itemId, invoice.warehouseId, totalQty, cost.landedUnitCost, line.id, userId);

      updateLine.run(cost.landedUnitCost, batchId, line.id);
    }

    const balanceBefore = getSupplierBalance(db, invoice.supplierId);
    const balanceAfter = balanceBefore + invoice.total;
    db.prepare(
      `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, ref_table, ref_id)
       VALUES (?, 'purchase', 0, ?, ?, 'purchase_invoices', ?)`
    ).run(invoice.supplierId, invoice.total, balanceAfter, invoiceId);

    db.prepare(
      "UPDATE purchase_invoices SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?"
    ).run(invoiceId);
  });

  run();
}

export function voidPurchaseInvoice(db: Db, invoiceId: number): void {
  const invoice = getPurchaseInvoice(db, invoiceId);
  if (!invoice) throw new Error(`Purchase invoice ${invoiceId} not found`);
  if (invoice.status === 'confirmed') {
    throw new Error('Confirmed invoices cannot be voided directly — use a purchase return');
  }
  db.prepare("UPDATE purchase_invoices SET status = 'voided' WHERE id = ?").run(invoiceId);
}
