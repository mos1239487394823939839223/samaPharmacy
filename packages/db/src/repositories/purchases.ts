/**
 * Purchase invoice repository. فاتورة شراء — build order screen 6.
 *
 * Confirming an invoice is the single most consequential transaction in the
 * system: it creates batches, decides their landed cost via
 * packages/core/landed-cost.ts, and is the only place stock enters the
 * pharmacy. Everything happens inside one db.transaction() so a failure
 * partway leaves no partial batches, no orphaned stock_moves, and no ledger
 * entry with nothing behind it.
 *
 * Every input is validated here, not just in the form: percentages 0–100,
 * real ISO dates, no already-expired stock, the unit belongs to the item, and
 * base quantities are derived from item_units (never trusted from the
 * request).
 *
 * Decisions (docs/DECISIONS.md):
 *   D12 — header expenses are owed to the supplier: invoice total =
 *         lines − extra discount + expenses.
 *   D13 — a cash purchase is paid on the spot from the safe, NOT the shift
 *         drawer: confirm posts the purchase and an equal payment to the
 *         supplier ledger, leaving the balance unchanged.
 */

import { DomainError, isIsoDate, landedCost, lineValue, toBaseUnits, type LandedCostLine } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW, TODAY } from '../time';
import { nextSequence } from './items';
import { getSupplierBalance } from './suppliers';
import { recordNarcoticMove } from './narcotics';

export interface PurchaseLineInput {
  lineNo: number;
  itemId: number;
  unitId: number;
  qtyInUnit: number;
  /** Ignored — derived from unitId's factor. Accepted so older callers still type-check. */
  qtyBase?: number;
  bonusInUnit?: number;
  /** Ignored — derived from unitId's factor. */
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

export interface PurchaseLineRow {
  id: number;
  lineNo: number;
  itemId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  bonusInUnit: number;
  bonusBase: number;
  batchNumber: string | null;
  expiryDate: string | null;
  unitPurchasePrice: number;
  discountPct: number;
  discountAmt: number;
  taxPct: number;
  taxAmt: number;
  valueBeforeDiscount: number;
  valueAfterDiscount: number;
  valueAfterTax: number;
  landedUnitCost: number;
  batchId: number | null;
}

function pct(value: number | undefined, code: string, label: string): number {
  const v = value ?? 0;
  if (!Number.isFinite(v) || v < 0 || v > 100) {
    throw new DomainError(code, `${label} must be between 0 and 100, got ${v}`);
  }
  return v;
}

/** Line arithmetic: ق.خ -> discount -> ب.خ -> tax -> ب.ض (grid convention). Integer piastres throughout. */
function computeLineValues(line: PurchaseLineInput) {
  const valueBeforeDiscount = lineValue(line.qtyInUnit, line.unitPurchasePrice);
  const discountPct = pct(line.discountPct, 'purchase.discountInvalid', 'discountPct');
  const discountAmt = line.discountAmt ?? Math.round((valueBeforeDiscount * discountPct) / 100);
  if (!Number.isInteger(discountAmt) || discountAmt < 0 || discountAmt > valueBeforeDiscount) {
    throw new DomainError('purchase.discountInvalid', `discountAmt must be between 0 and ${valueBeforeDiscount}`);
  }
  const valueAfterDiscount = valueBeforeDiscount - discountAmt;
  const taxPct = pct(line.taxPct, 'purchase.taxInvalid', 'taxPct');
  const taxAmt = line.taxAmt ?? Math.round((valueAfterDiscount * taxPct) / 100);
  if (!Number.isInteger(taxAmt) || taxAmt < 0) throw new DomainError('purchase.taxInvalid', `taxAmt must be >= 0`);
  const valueAfterTax = valueAfterDiscount + taxAmt;
  return { valueBeforeDiscount, discountPct, discountAmt, valueAfterDiscount, taxPct, taxAmt, valueAfterTax };
}

interface ItemUnitFacts {
  factor: number;
  unitName: string;
  itemName: string;
  noExpiry: number;
  isActive: number;
}

function toBase(qty: number, facts: ItemUnitFacts, code: string): number {
  try {
    return toBaseUnits(qty, facts.factor);
  } catch {
    throw new DomainError(code, `${qty} ${facts.unitName} is not a whole number of base units`, {
      item: facts.itemName,
      qty,
      unit: facts.unitName,
    });
  }
}

/**
 * Create a purchase invoice in draft status. No stock moves yet — those only
 * happen on confirm, so a draft can be abandoned (voided) freely.
 */
export function createPurchaseInvoice(db: Db, input: PurchaseInvoiceInput, userId = 1): number {
  const run = db.transaction((data: PurchaseInvoiceInput) => {
    if (data.lines.length === 0) throw new DomainError('purchase.noLines', 'A purchase invoice needs at least one line');
    if (!isIsoDate(data.invoiceDate)) {
      throw new DomainError('purchase.dateInvalid', `Invoice date "${data.invoiceDate}" is not a valid date`);
    }
    if (data.dueDate != null && data.dueDate !== '' && !isIsoDate(data.dueDate)) {
      throw new DomainError('purchase.dateInvalid', `Due date "${data.dueDate}" is not a valid date`);
    }

    const supplier = db.prepare('SELECT is_active AS a FROM suppliers WHERE id = ?').get(data.supplierId) as
      | { a: number }
      | undefined;
    if (!supplier?.a) throw new DomainError('purchase.supplierInvalid', `Supplier ${data.supplierId} not found or inactive`);

    const supplierInvoiceNo = data.supplierInvoiceNo.trim();
    const dup = db
      .prepare('SELECT serial FROM purchase_invoices WHERE supplier_id = ? AND supplier_invoice_no = ?')
      .get(data.supplierId, supplierInvoiceNo) as { serial: number } | undefined;
    if (dup) {
      throw new DomainError(
        'purchase.duplicateSupplierInvoice',
        `Supplier invoice ${supplierInvoiceNo} already entered as #${dup.serial}`,
        { number: supplierInvoiceNo, serial: dup.serial }
      );
    }

    const factsOf = db.prepare(
      `SELECT u.factor, u.name_ar AS unitName, i.name_ar AS itemName, i.no_expiry AS noExpiry, i.is_active AS isActive
       FROM item_units u JOIN items i ON i.id = u.item_id WHERE u.id = ? AND u.item_id = ?`
    );
    const today = (db.prepare(`SELECT ${TODAY} AS d`).get() as { d: string }).d;

    let subtotal = 0;
    let taxTotal = 0;
    let linesTotal = 0;
    const computed = data.lines.map((line) => {
      const facts = factsOf.get(line.unitId, line.itemId) as ItemUnitFacts | undefined;
      if (!facts) throw new DomainError('purchase.unitInvalid', `Unit ${line.unitId} does not belong to item ${line.itemId}`);
      if (!facts.isActive) throw new DomainError('purchase.itemInactive', `Item ${line.itemId} is deactivated`, { item: facts.itemName });
      if (!(line.qtyInUnit > 0)) throw new DomainError('purchase.qtyInvalid', `Quantity must be positive`, { item: facts.itemName });

      const qtyBase = toBase(line.qtyInUnit, facts, 'purchase.qtyNotWhole');
      const bonusBase = line.bonusInUnit ? toBase(line.bonusInUnit, facts, 'purchase.qtyNotWhole') : 0;

      // Expiry: required (and not already past) for anything that expires;
      // dropped for a no_expiry item so FEFO and the expiry report stay
      // consistent with the item flag.
      let expiryDate: string | null = null;
      if (!facts.noExpiry) {
        if (!line.expiryDate) throw new DomainError('purchase.expiryRequired', 'Expiry date required', { item: facts.itemName });
        if (!isIsoDate(line.expiryDate)) {
          throw new DomainError('purchase.dateInvalid', `Expiry "${line.expiryDate}" is not a valid date`);
        }
        if (line.expiryDate <= today) {
          throw new DomainError('purchase.expiryPast', `Expiry ${line.expiryDate} is not in the future`, {
            item: facts.itemName,
            date: line.expiryDate,
          });
        }
        expiryDate = line.expiryDate;
      }

      const v = computeLineValues(line);
      subtotal += v.valueBeforeDiscount;
      taxTotal += v.taxAmt;
      linesTotal += v.valueAfterTax;
      return { line, v, qtyBase, bonusBase, expiryDate };
    });

    const extraDiscountPct = pct(data.extraDiscountPct, 'purchase.extraDiscountInvalid', 'extraDiscountPct');
    const extraDiscountAmt = data.extraDiscountAmt ?? Math.round((linesTotal * extraDiscountPct) / 100);
    if (!Number.isInteger(extraDiscountAmt) || extraDiscountAmt < 0 || extraDiscountAmt > linesTotal) {
      throw new DomainError('purchase.extraDiscountInvalid', `Extra discount must be between 0 and ${linesTotal}`);
    }
    const expenses = data.expenses ?? 0;
    if (!Number.isInteger(expenses) || expenses < 0) throw new DomainError('purchase.expensesInvalid', 'Expenses must be >= 0');

    // D12: the supplier is owed the lines after discount plus the expenses.
    const total = linesTotal - extraDiscountAmt + expenses;

    const result = db
      .prepare(
        `INSERT INTO purchase_invoices (
           serial, supplier_invoice_no, supplier_id, warehouse_id, user_id,
           purchase_type, invoice_date, due_date, expenses,
           extra_discount_amt, extra_discount_pct, subtotal, tax_total, total, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NOW})`
      )
      .run(
        nextSequence(db, 'purchase_invoice'),
        supplierInvoiceNo,
        data.supplierId,
        data.warehouseId,
        userId,
        data.purchaseType,
        data.invoiceDate,
        data.dueDate || null,
        expenses,
        extraDiscountAmt,
        extraDiscountPct,
        subtotal,
        taxTotal,
        total,
        data.notes?.trim() || null
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

    for (const { line, v, qtyBase, bonusBase, expiryDate } of computed) {
      insertLine.run(
        invoiceId,
        line.lineNo,
        line.itemId,
        line.unitId,
        line.qtyInUnit,
        qtyBase,
        line.bonusInUnit ?? 0,
        bonusBase,
        line.batchNumber?.trim() || null,
        expiryDate,
        line.unitPurchasePrice,
        v.valueBeforeDiscount,
        v.discountPct,
        v.discountAmt,
        v.valueAfterDiscount,
        v.taxPct,
        v.taxAmt,
        v.valueAfterTax
      );
    }

    return invoiceId;
  });

  return run(input);
}

const SELECT_INVOICE = `
  SELECT id, serial, supplier_invoice_no AS supplierInvoiceNo, supplier_id AS supplierId,
         warehouse_id AS warehouseId, purchase_type AS purchaseType,
         invoice_date AS invoiceDate, status, expenses,
         extra_discount_amt AS extraDiscountAmt, subtotal, tax_total AS taxTotal,
         total, paid, notes, created_at AS createdAt, confirmed_at AS confirmedAt
  FROM purchase_invoices
`;

export function getPurchaseInvoice(db: Db, id: number): PurchaseInvoiceRow | undefined {
  return db.prepare(`${SELECT_INVOICE} WHERE id = ?`).get(id) as PurchaseInvoiceRow | undefined;
}

/** Index-backed lookup by serial (UNIQUE). */
export function getPurchaseInvoiceBySerial(db: Db, serial: number): PurchaseInvoiceRow | undefined {
  return db.prepare(`${SELECT_INVOICE} WHERE serial = ?`).get(serial) as PurchaseInvoiceRow | undefined;
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
    .prepare(`${SELECT_INVOICE} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
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
    if (!invoice) throw new DomainError('purchase.notFound', `Purchase invoice ${invoiceId} not found`);
    if (invoice.status !== 'draft' && invoice.status !== 'held') {
      throw new DomainError('purchase.badStatus', `Cannot confirm invoice in status "${invoice.status}"`, {
        status: invoice.status,
      });
    }

    const lines = getPurchaseLines(db, invoiceId);
    if (lines.length === 0) throw new DomainError('purchase.noLines', 'Cannot confirm an invoice with no lines');

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

    // Never merge into a quarantine twin (is_quarantined = 1): stock bought
    // to sell must land in a sellable batch.
    const findExistingBatch = db.prepare(
      `SELECT id FROM batches
       WHERE item_id = ? AND warehouse_id = ? AND batch_number IS ?
         AND expiry_date IS ? AND unit_cost = ? AND is_quarantined = 0`
    );

    const insertBatch = db.prepare(
      `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, source_line_id, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ${NOW})`
    );

    const growBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');

    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id, at)
       VALUES (?, ?, ?, ?, ?, 'purchase', 'purchase_invoice_lines', ?, ?, ${NOW})`
    );

    for (const line of lines) {
      const cost = costByLineNo.get(line.lineNo);
      if (!cost) throw new Error(`No landed cost computed for line ${line.lineNo}`);

      const totalQty = line.qtyBase + (line.bonusBase ?? 0);

      // BR-11: batch number + expiry + product (+ cost, per the schema's own
      // uniqueness constraint) match an existing batch -> add to it.
      const existing = findExistingBatch.get(
        line.itemId,
        invoice.warehouseId,
        line.batchNumber ?? null,
        line.expiryDate ?? null,
        cost.landedUnitCost
      ) as { id: number } | undefined;

      let batchId: number;
      if (existing) {
        growBatch.run(totalQty, existing.id);
        batchId = existing.id;
      } else {
        batchId = Number(
          insertBatch.run(
            line.itemId,
            invoice.warehouseId,
            line.batchNumber ?? null,
            line.expiryDate ?? null,
            totalQty,
            cost.landedUnitCost,
            line.id
          ).lastInsertRowid
        );
      }

      // Rule 8: every stock change writes a matching stock_moves row.
      insertMove.run(batchId, line.itemId, invoice.warehouseId, totalQty, cost.landedUnitCost, line.id, userId);
      updateLine.run(cost.landedUnitCost, batchId, line.id);
      recordNarcoticMove(db, { itemId: line.itemId, batchId, qtyDelta: totalQty, refTable: 'purchase_invoice_lines', refId: line.id, userId });
    }

    const postLedger = db.prepare(
      `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, ref_table, ref_id, note, at)
       VALUES (?, ?, ?, ?, ?, 'purchase_invoices', ?, ?, ${NOW})`
    );
    const afterPurchase = getSupplierBalance(db, invoice.supplierId) + invoice.total;
    postLedger.run(invoice.supplierId, 'purchase', 0, invoice.total, afterPurchase, invoiceId, null);

    // D13: a cash purchase is settled on the spot (from the safe, not the
    // shift drawer) — the supplier is owed nothing for it.
    let paid = 0;
    if (invoice.purchaseType === 'cash' && invoice.total > 0) {
      postLedger.run(invoice.supplierId, 'payment', invoice.total, 0, afterPurchase - invoice.total, invoiceId, 'سداد نقدي');
      paid = invoice.total;
    }

    db.prepare(`UPDATE purchase_invoices SET status = 'confirmed', confirmed_at = ${NOW}, paid = ? WHERE id = ?`).run(
      paid,
      invoiceId
    );
  });

  run();
}

export function voidPurchaseInvoice(db: Db, invoiceId: number): void {
  const invoice = getPurchaseInvoice(db, invoiceId);
  if (!invoice) throw new DomainError('purchase.notFound', `Purchase invoice ${invoiceId} not found`);
  if (invoice.status === 'confirmed') {
    throw new DomainError('purchase.voidConfirmed', 'Confirmed invoices cannot be voided directly — use a purchase return');
  }
  db.prepare("UPDATE purchase_invoices SET status = 'voided' WHERE id = ?").run(invoiceId);
}
