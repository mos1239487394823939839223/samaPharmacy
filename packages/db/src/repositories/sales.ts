/**
 * Sales invoice repository. فواتير المبيعات — build order screen 8, the
 * screen that determines adoption.
 *
 * Unlike a purchase invoice, sales_invoice_lines.batch_id is NOT NULL: FEFO
 * allocation happens when a line is added (to snapshot which batch, its
 * expiry, and its cost into the line), not deferred to confirm. But qty_on_hand
 * is only decremented and stock_moves written at confirm — a draft invoice
 * reserves nothing. confirmSalesInvoice re-checks every allocated batch
 * (still there, still enough, not expired, not quarantined) inside the same
 * transaction, so a batch that changed under a stale draft is caught then
 * rather than producing negative stock or an expired sale.
 *
 * The POS uses checkoutSalesInvoice — create and confirm in ONE transaction —
 * so a failed sale leaves nothing behind. Previously the two were separate
 * IPC calls and every failed confirm left an orphan draft.
 *
 * The renderer is untrusted for prices: the unit's factor and list price are
 * read from item_units here, never taken from the request.
 */

import {
  allocate,
  allocateFefo,
  DomainError,
  lineValue,
  toBaseUnits,
  type FefoBatch,
} from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW, TODAY } from '../time';
import { nextSequence } from './items';
import { getSellableBatches } from './stock';
import { getOpenShift } from './shifts';
import { getCustomer, postCreditSale } from './customers';
import { getInvoicePrescription, isScheduled, recordNarcoticMove, savePrescription, type PrescriptionInput } from './narcotics';
import { computeInsuranceShare, type InsuranceSaleInput } from './insurance';

export interface SalesLineInput {
  lineNo: number;
  itemId: number;
  unitId: number;
  /** Ignored — the factor is read from item_units. Kept so older callers still type-check. */
  unitFactor?: number;
  qtyInUnit: number;
  /** Optional price override, downward only (spec M4). Defaults to the unit's sale price. */
  unitPrice?: number;
  discountPct?: number;
  discountAmt?: number;
  /** Pharmacist override past FEFO order or a near-expiry warning; logged, not silently allowed. */
  overrideReason?: string | null;
}

export interface SalesInvoiceInput {
  warehouseId: number;
  customerId?: number | null;
  invoiceType: 'cash' | 'credit';
  isHomeDelivery?: boolean;
  deliveryAddress?: string | null;
  extraDiscountPct?: number;
  extraDiscountAmt?: number;
  extraCharge?: number;
  /** The note(s) the customer handed over, for change and the receipt. Cash only; must cover the total. */
  cashTendered?: number | null;
  /** Legacy alias of cashTendered. */
  paidCash?: number;
  notes?: string | null;
  /** Required (by confirm) when any line is a scheduled item — BR-7. */
  prescription?: PrescriptionInput | null;
  /** An insured sale (cash invoice): the company pays its share, the patient the rest. */
  insurance?: InsuranceSaleInput | null;
  lines: SalesLineInput[];
}

export interface SalesInvoiceRow {
  id: number;
  serial: number;
  warehouseId: number;
  customerId: number | null;
  invoiceType: string;
  status: string;
  subtotal: number;
  lineDiscountTotal: number;
  extraDiscountAmt: number;
  extraCharge: number;
  total: number;
  /** Cash kept in the drawer for this invoice: the total for cash, 0 for credit. */
  paidCash: number;
  cashTendered: number | null;
  /** Insured sale: the company's share of the total (0 otherwise). */
  insuranceShare: number;
  insuranceCompanyId: number | null;
  costTotal: number;
  notes: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface SalesLineRow {
  id: number;
  lineNo: number;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitPrice: number;
  valueBeforeDiscount: number;
  discountPct: number;
  discountAmt: number;
  valueAfterDiscount: number;
  unitCost: number;
  expiryDate: string | null;
}

interface UnitRow {
  factor: number;
  salePrice: number;
  allowSale: number;
  nameAr: string;
  itemActive: number;
  itemName: string;
}

/** The unit as stored — the only trusted source of factor and list price. */
function resolveUnit(db: Db, itemId: number, unitId: number): UnitRow {
  const unit = db
    .prepare(
      `SELECT u.factor, u.sale_price AS salePrice, u.allow_sale AS allowSale, u.name_ar AS nameAr,
              i.is_active AS itemActive, i.name_ar AS itemName
       FROM item_units u JOIN items i ON i.id = u.item_id
       WHERE u.id = ? AND u.item_id = ?`
    )
    .get(unitId, itemId) as UnitRow | undefined;
  if (!unit) throw new DomainError('sale.unitInvalid', `Unit ${unitId} does not belong to item ${itemId}`);
  if (!unit.itemActive) {
    throw new DomainError('sale.itemInactive', `Item ${itemId} is deactivated`, { item: unit.itemName });
  }
  if (!unit.allowSale) {
    throw new DomainError('sale.unitNotForSale', `Unit ${unitId} is not for sale`, {
      item: unit.itemName,
      unit: unit.nameAr,
    });
  }
  return unit;
}

/** BR-1/BR-2 in effect: only sellable (non-expired, non-quarantined) batches are ever offered. */
function allocateLine(db: Db, itemId: number, warehouseId: number, qtyBase: number) {
  const candidates = getSellableBatches(db, itemId, warehouseId);
  const fefoInput: FefoBatch[] = candidates.map((b) => ({
    batchId: b.id,
    qtyOnHand: b.qtyOnHand,
    expiryDate: b.expiryDate,
    unitCost: b.unitCost,
  }));
  return allocateFefo(fefoInput, qtyBase);
}

function computeLineValues(line: SalesLineInput, listPrice: number) {
  const unitPrice = line.unitPrice ?? listPrice;
  if (unitPrice > listPrice) {
    throw new DomainError('sale.priceAboveList', `Price ${unitPrice} is above the unit's list price ${listPrice}`, {
      price: unitPrice,
      list: listPrice,
    });
  }
  const valueBeforeDiscount = lineValue(line.qtyInUnit, unitPrice);

  // A discount subtracts from the line, never adds to it (QA-003), and can
  // never exceed it.
  if (line.discountPct !== undefined && (line.discountPct < 0 || line.discountPct > 100)) {
    throw new DomainError('sale.discountInvalid', `discountPct must be between 0 and 100, got ${line.discountPct}`);
  }
  const discountAmt =
    line.discountAmt ?? Math.round((valueBeforeDiscount * (line.discountPct ?? 0)) / 100);
  if (!Number.isInteger(discountAmt) || discountAmt < 0 || discountAmt > valueBeforeDiscount) {
    throw new DomainError(
      'sale.discountInvalid',
      `discountAmt must be between 0 and the line's value before discount (${valueBeforeDiscount}), got ${discountAmt}`
    );
  }

  return { unitPrice, valueBeforeDiscount, discountAmt, valueAfterDiscount: valueBeforeDiscount - discountAmt };
}

function toQtyBase(qtyInUnit: number, factor: number, unitName: string): number {
  try {
    return toBaseUnits(qtyInUnit, factor);
  } catch {
    throw new DomainError('sale.qtyNotWhole', `${qtyInUnit} × ${factor} is not a whole number of base units`, {
      qty: qtyInUnit,
      unit: unitName,
    });
  }
}

function assertCustomerCanBuy(db: Db, customerId: number | null | undefined, invoiceType: 'cash' | 'credit') {
  if (invoiceType === 'credit' && !customerId) {
    throw new DomainError('sale.creditNeedsCustomer', 'A credit invoice must have a customer');
  }
  if (!customerId) return;
  const customer = getCustomer(db, customerId);
  if (!customer || !customer.isActive) {
    throw new DomainError('customer.notFound', `Customer ${customerId} not found`);
  }
  if (invoiceType === 'credit' && customer.isSuspended) {
    throw new DomainError('customer.suspended', `Customer ${customer.name} is suspended`, { name: customer.name });
  }
}

/**
 * Create a draft invoice. FEFO is run now to pick the batch and snapshot its
 * cost/expiry for display, but no stock is reserved or decremented — this is
 * purely informational until confirm.
 */
export function createSalesInvoice(db: Db, input: SalesInvoiceInput, userId = 1): number {
  const run = db.transaction((data: SalesInvoiceInput) => {
    if (data.lines.length === 0) throw new DomainError('sale.noLines', 'Cannot create an invoice with no lines');
    assertCustomerCanBuy(db, data.customerId, data.invoiceType);

    const tendered = data.cashTendered ?? (data.paidCash || null);
    if (data.invoiceType === 'credit' && tendered) {
      // The full total of a credit invoice posts to the customer ledger at
      // confirm — there is no deposit-on-credit concept, so any cash here
      // would double-count the money.
      throw new DomainError(
        'sale.creditPaidCash',
        `paidCash must be 0 for a credit invoice, got ${tendered} — the full total posts to the customer ledger on confirm regardless, so any paidCash here would double-count the money`
      );
    }

    const serial = nextSequence(db, 'sales_invoice');

    let subtotal = 0;
    let lineDiscountTotal = 0;
    let total = 0;

    // FEFO is run exactly once per line and the allocation reused below.
    const computed = data.lines.map((line) => {
      const unit = resolveUnit(db, line.itemId, line.unitId);
      const v = computeLineValues(line, unit.salePrice);
      const qtyBase = toQtyBase(line.qtyInUnit, unit.factor, unit.nameAr);
      if (qtyBase <= 0) throw new DomainError('sale.qtyInvalid', `Quantity must be positive, got ${line.qtyInUnit}`);
      const allocation = allocateLine(db, line.itemId, data.warehouseId, qtyBase);

      subtotal += v.valueBeforeDiscount;
      lineDiscountTotal += v.discountAmt;
      total += v.valueAfterDiscount;
      return { line, v, qtyBase, allocation };
    });

    if (data.extraDiscountPct !== undefined && (data.extraDiscountPct < 0 || data.extraDiscountPct > 100)) {
      throw new DomainError('sale.extraDiscountInvalid', `extraDiscountPct must be between 0 and 100, got ${data.extraDiscountPct}`);
    }
    const extraDiscountAmt =
      data.extraDiscountAmt ?? Math.round((total * (data.extraDiscountPct ?? 0)) / 100);
    if (extraDiscountAmt < 0 || extraDiscountAmt > total) {
      throw new DomainError(
        'sale.extraDiscountInvalid',
        `extraDiscountAmt must be between 0 and the invoice subtotal after line discounts (${total}), got ${extraDiscountAmt}`
      );
    }
    const extraCharge = data.extraCharge ?? 0;
    if (!Number.isInteger(extraCharge) || extraCharge < 0) {
      throw new DomainError('sale.extraChargeInvalid', `extraCharge must be a non-negative integer, got ${extraCharge}`);
    }
    total += extraCharge - extraDiscountAmt;

    let insuranceShare = 0;
    if (data.insurance) {
      if (data.invoiceType !== 'cash') {
        throw new DomainError('insurance.cashOnly', 'An insured sale is a cash invoice for the patient share');
      }
      insuranceShare = computeInsuranceShare(
        db,
        data.insurance,
        computed.map((c) => ({ itemId: c.line.itemId, value: c.v.valueAfterDiscount })),
        total
      );
    }
    // What the customer pays at the counter.
    const patientPays = total - insuranceShare;

    if (data.invoiceType === 'cash' && tendered !== null && tendered < patientPays) {
      throw new DomainError('sale.insufficientPaid', `Tendered ${tendered} is less than the total ${patientPays}`, {
        tendered,
        total: patientPays,
      });
    }

    const costTotal = computed.reduce(
      (s, c) => s + c.allocation.reduce((t, a) => t + a.qtyTaken * a.unitCost, 0),
      0
    );

    const result = db
      .prepare(
        `INSERT INTO sales_invoices (
           serial, warehouse_id, customer_id, shift_id, user_id, invoice_type,
           is_home_delivery, delivery_address, subtotal, line_discount_total,
           extra_discount_amt, extra_discount_pct, extra_charge, total,
           paid_cash, cash_tendered, cost_total, notes, created_at,
           insurance_company_id, insurance_member_no, insurance_approval_no, insurance_share
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NOW}, ?, ?, ?, ?)`
      )
      .run(
        serial,
        data.warehouseId,
        data.customerId ?? null,
        getOpenShift(db, data.warehouseId)?.id ?? null,
        userId,
        data.invoiceType,
        data.isHomeDelivery ? 1 : 0,
        data.deliveryAddress ?? null,
        subtotal,
        lineDiscountTotal,
        extraDiscountAmt,
        data.extraDiscountPct ?? 0,
        extraCharge,
        total,
        // paid_cash is what stays in the drawer — never the tendered note,
        // or every sale with change shows up as a shortage at shift close.
        data.invoiceType === 'cash' ? patientPays : 0,
        data.invoiceType === 'cash' ? tendered : null,
        costTotal,
        data.notes ?? null,
        data.insurance?.companyId ?? null,
        data.insurance?.memberNo?.trim() || null,
        data.insurance?.approvalNo?.trim() || null,
        insuranceShare
      );

    const invoiceId = Number(result.lastInsertRowid);

    if (data.prescription) savePrescription(db, invoiceId, data.prescription, userId);

    // A line covering a FEFO allocation split across several batches becomes
    // several physical rows. Values are split with allocate() so the rows add
    // back to the line exactly — Math.round per row could drift a piastre.
    const insertLine = db.prepare(
      `INSERT INTO sales_invoice_lines (
         invoice_id, line_no, item_id, batch_id, unit_id, qty_in_unit, qty_base,
         unit_price, value_before_discount, discount_pct, discount_amt,
         value_after_discount, unit_cost, expiry_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let lineNo = 1;
    for (const { line, v, qtyBase, allocation } of computed) {
      const weights = allocation.map((a) => a.qtyTaken);
      const before = allocate(v.valueBeforeDiscount, weights);
      const discount = allocate(v.discountAmt, weights);
      allocation.forEach((part, i) => {
        insertLine.run(
          invoiceId,
          lineNo++,
          line.itemId,
          part.batchId,
          line.unitId,
          (line.qtyInUnit * part.qtyTaken) / qtyBase,
          part.qtyTaken,
          v.unitPrice,
          before[i]!,
          line.discountPct ?? 0,
          discount[i]!,
          before[i]! - discount[i]!,
          part.unitCost,
          part.expiryDate
        );
      });
    }

    return invoiceId;
  });

  return run(input);
}

const SELECT_INVOICE = `
  SELECT id, serial, warehouse_id AS warehouseId, customer_id AS customerId,
         invoice_type AS invoiceType, status, subtotal,
         line_discount_total AS lineDiscountTotal, extra_discount_amt AS extraDiscountAmt,
         extra_charge AS extraCharge, total, paid_cash AS paidCash, cash_tendered AS cashTendered,
         insurance_share AS insuranceShare, insurance_company_id AS insuranceCompanyId,
         cost_total AS costTotal, notes, created_at AS createdAt, confirmed_at AS confirmedAt
  FROM sales_invoices
`;

export function getSalesInvoice(db: Db, id: number): SalesInvoiceRow | undefined {
  return db.prepare(`${SELECT_INVOICE} WHERE id = ?`).get(id) as SalesInvoiceRow | undefined;
}

/** Index-backed lookup by the human-facing serial (UNIQUE). */
export function getSalesInvoiceBySerial(db: Db, serial: number): SalesInvoiceRow | undefined {
  return db.prepare(`${SELECT_INVOICE} WHERE serial = ?`).get(serial) as SalesInvoiceRow | undefined;
}

export function getSalesLines(db: Db, invoiceId: number): SalesLineRow[] {
  return db
    .prepare(
      `SELECT id, line_no AS lineNo, item_id AS itemId, batch_id AS batchId, unit_id AS unitId,
              qty_in_unit AS qtyInUnit, qty_base AS qtyBase, unit_price AS unitPrice,
              value_before_discount AS valueBeforeDiscount, discount_pct AS discountPct,
              discount_amt AS discountAmt, value_after_discount AS valueAfterDiscount,
              unit_cost AS unitCost, expiry_date AS expiryDate
       FROM sales_invoice_lines WHERE invoice_id = ? ORDER BY line_no`
    )
    .all(invoiceId) as SalesLineRow[];
}

export function listSalesInvoices(db: Db, limit = 100, offset = 0): SalesInvoiceRow[] {
  return db
    .prepare(`${SELECT_INVOICE} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as SalesInvoiceRow[];
}

/**
 * Confirm: re-validate every line's batch (a draft reserves nothing, so time
 * may have passed), decrement qty_on_hand, write a matching stock_moves row
 * per line (rule 8), post credit to the customer, and mark confirmed. All in
 * one transaction.
 */
export function confirmSalesInvoice(db: Db, invoiceId: number, userId = 1): void {
  const run = db.transaction(() => {
    const invoice = getSalesInvoice(db, invoiceId);
    if (!invoice) throw new DomainError('sale.notFound', `Sales invoice ${invoiceId} not found`);
    if (invoice.status !== 'draft' && invoice.status !== 'held') {
      throw new DomainError('sale.badStatus', `Cannot confirm invoice in status "${invoice.status}"`, {
        status: invoice.status,
      });
    }
    assertCustomerCanBuy(db, invoice.customerId, invoice.invoiceType as 'cash' | 'credit');

    const lines = getSalesLines(db, invoiceId);
    if (lines.length === 0) throw new DomainError('sale.noLines', 'Cannot confirm an invoice with no lines');

    // BR-7: no scheduled item leaves without a prescription record. No bypass.
    const prescription = lines.some((l) => isScheduled(db, l.itemId)) ? getInvoicePrescription(db, invoiceId) : undefined;
    if (lines.some((l) => isScheduled(db, l.itemId)) && !prescription) {
      throw new DomainError('narcotics.prescriptionRequired', 'A scheduled item needs a prescription record');
    }

    const getBatch = db.prepare(
      `SELECT b.qty_on_hand AS q, b.is_quarantined AS quarantined,
              (i.no_expiry = 0 AND b.expiry_date IS NOT NULL AND b.expiry_date <= ${TODAY}) AS expired
       FROM batches b JOIN items i ON i.id = b.item_id WHERE b.id = ?`
    );
    const decrementBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand - ? WHERE id = ?');
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id, at)
       VALUES (?, ?, ?, ?, ?, 'sale', 'sales_invoice_lines', ?, ?, ${NOW})`
    );

    for (const line of lines) {
      const row = getBatch.get(line.batchId) as { q: number; quarantined: number; expired: number } | undefined;
      if (!row || row.q < line.qtyBase) {
        throw new DomainError(
          'sale.stockChanged',
          `Insufficient stock for line ${line.lineNo}: batch ${line.batchId} has ${row?.q ?? 0}, need ${line.qtyBase}. ` +
            `Stock changed since this invoice was drafted — reopen it to reallocate.`
        );
      }
      // BR-1: a batch that expired (or was quarantined) after the draft was
      // made is not sold just because the draft predates it.
      if (row.expired || row.quarantined) {
        throw new DomainError('sale.batchNotSellable', `Batch ${line.batchId} is expired or quarantined`);
      }

      decrementBatch.run(line.qtyBase, line.batchId);
      insertMove.run(line.batchId, line.itemId, invoice.warehouseId, -line.qtyBase, line.unitCost, line.id, userId);
      recordNarcoticMove(db, {
        itemId: line.itemId,
        batchId: line.batchId,
        qtyDelta: -line.qtyBase,
        refTable: 'sales_invoice_lines',
        refId: line.id,
        userId,
        prescriptionId: prescription?.id ?? null,
      });
    }

    if (invoice.invoiceType === 'credit' && invoice.customerId) {
      postCreditSale(db, invoice.customerId, invoice.total, invoiceId);
    }

    // The cash lands in whichever shift is open NOW. A draft made in a shift
    // that has since been closed must not add money to that closed shift
    // (BR-10) — nor vanish from both.
    const shiftId = getOpenShift(db, invoice.warehouseId)?.id ?? null;
    db.prepare(
      `UPDATE sales_invoices SET status = 'confirmed', confirmed_at = ${NOW}, shift_id = ?, user_id = ?, held_at = NULL WHERE id = ?`
    ).run(shiftId, userId, invoiceId);
  });

  run();
}

/** The POS path: create and confirm atomically. Nothing is written if anything fails. */
export function checkoutSalesInvoice(db: Db, input: SalesInvoiceInput, userId = 1): number {
  return db.transaction(() => {
    const id = createSalesInvoice(db, input, userId);
    confirmSalesInvoice(db, id, userId);
    return id;
  })();
}

/**
 * Park an invoice (تعليق) — the customer went to fetch money. Nothing is
 * reserved; it is re-checked in full when resumed and paid.
 */
export function holdSalesInvoice(db: Db, input: SalesInvoiceInput, userId = 1): number {
  return db.transaction(() => {
    const id = createSalesInvoice(db, input, userId);
    db.prepare(`UPDATE sales_invoices SET status = 'held', held_at = ${NOW} WHERE id = ?`).run(id);
    return id;
  })();
}

export interface HeldInvoiceRow {
  id: number;
  serial: number;
  heldAt: string;
  total: number;
  invoiceType: string;
  customerId: number | null;
  customerName: string | null;
  lineCount: number;
}

export function listHeldInvoices(db: Db, warehouseId: number): HeldInvoiceRow[] {
  return db
    .prepare(
      `SELECT s.id, s.serial, s.held_at AS heldAt, s.total, s.invoice_type AS invoiceType,
              s.customer_id AS customerId, c.name AS customerName,
              (SELECT COUNT(DISTINCT item_id || '-' || unit_id) FROM sales_invoice_lines l WHERE l.invoice_id = s.id) AS lineCount
       FROM sales_invoices s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.status = 'held' AND s.warehouse_id = ?
       ORDER BY s.held_at`
    )
    .all(warehouseId) as HeldInvoiceRow[];
}

/**
 * Take a held invoice back to the till: returns what the cart needs and
 * voids the parked draft (it will be re-created and paid as a new sale, with
 * fresh FEFO allocation and fresh price checks).
 */
export function resumeHeldInvoice(db: Db, invoiceId: number) {
  return db.transaction(() => {
    const invoice = getSalesInvoice(db, invoiceId);
    if (!invoice || invoice.status !== 'held') throw new DomainError('sale.notHeld', `Invoice ${invoiceId} is not held`);
    const lines = db
      .prepare(
        `SELECT item_id AS itemId, unit_id AS unitId, SUM(qty_in_unit) AS qtyInUnit, SUM(discount_amt) AS discountAmt
         FROM sales_invoice_lines WHERE invoice_id = ? GROUP BY item_id, unit_id ORDER BY MIN(line_no)`
      )
      .all(invoiceId) as Array<{ itemId: number; unitId: number; qtyInUnit: number; discountAmt: number }>;
    const prescription = getInvoicePrescription(db, invoiceId) ?? null;
    const ins = db
      .prepare('SELECT insurance_company_id AS companyId, insurance_member_no AS memberNo, insurance_approval_no AS approvalNo FROM sales_invoices WHERE id = ?')
      .get(invoiceId) as { companyId: number | null; memberNo: string | null; approvalNo: string | null };
    db.prepare("UPDATE sales_invoices SET status = 'voided' WHERE id = ?").run(invoiceId);
    return {
      invoiceType: invoice.invoiceType as 'cash' | 'credit',
      customerId: invoice.customerId,
      insurance: ins.companyId ? { companyId: ins.companyId, memberNo: ins.memberNo, approvalNo: ins.approvalNo } : null,
      lines: lines.map((l) => ({ ...l, qtyInUnit: Math.round(l.qtyInUnit * 1e6) / 1e6 })),
      prescription,
    };
  })();
}

/** Recent invoices with the customer name, for the invoice history screen. */
export function searchSalesInvoices(
  db: Db,
  filter: { from?: string; to?: string; serial?: number; status?: string; limit?: number }
) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.serial) {
    where.push('s.serial = ?');
    params.push(filter.serial);
  } else {
    if (filter.from) {
      where.push('s.created_at >= ?');
      params.push(filter.from);
    }
    if (filter.to) {
      where.push("s.created_at < datetime(?, '+1 day')");
      params.push(filter.to);
    }
    if (filter.status) {
      where.push('s.status = ?');
      params.push(filter.status);
    }
  }
  params.push(filter.limit ?? 300);
  return db
    .prepare(
      `SELECT s.id, s.serial, s.status, s.invoice_type AS invoiceType, s.total, s.created_at AS createdAt,
              s.confirmed_at AS confirmedAt, s.customer_id AS customerId, c.name AS customerName,
              u.display_name AS userName
       FROM sales_invoices s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN users u ON u.id = s.user_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY s.id DESC LIMIT ?`
    )
    .all(...params) as Array<{
    id: number;
    serial: number;
    status: string;
    invoiceType: string;
    total: number;
    createdAt: string;
    confirmedAt: string | null;
    customerId: number | null;
    customerName: string | null;
    userName: string | null;
  }>;
}

export function voidSalesInvoice(db: Db, invoiceId: number): void {
  const invoice = getSalesInvoice(db, invoiceId);
  if (!invoice) throw new DomainError('sale.notFound', `Sales invoice ${invoiceId} not found`);
  if (invoice.status === 'confirmed') {
    throw new DomainError('sale.voidConfirmed', 'Confirmed invoices cannot be voided directly — use a sales return');
  }
  db.prepare("UPDATE sales_invoices SET status = 'voided' WHERE id = ?").run(invoiceId);
}

export interface SalesReportRow {
  invoiceCount: number;
  cashTotal: number;
  creditTotal: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  costTotal: number;
  /** Company share of insured sales in the range (a receivable, not cash). */
  insuranceTotal: number;
  /** Confirmed sales returns created in the range (refund value). */
  returnsTotal: number;
  /** Cost of the goods those returns brought back. */
  returnsCost: number;
  /** grandTotal − returnsTotal. */
  netTotal: number;
  /** (grandTotal − returnsTotal) − (costTotal − returnsCost). */
  grossProfit: number;
}

export interface SalesReportInvoiceRow {
  id: number;
  serial: number;
  invoiceType: string;
  total: number;
  costTotal: number;
  confirmedAt: string | null;
  customerId: number | null;
}

/**
 * Date-range sales summary. Only confirmed invoices count, and sales returns
 * in the same range are netted out — a refunded sale is not revenue.
 *
 * from/to are inclusive local dates ('YYYY-MM-DD'); timestamps are local
 * (migration 0007), so `to` is compared against the start of the next day.
 */
export function getSalesReport(db: Db, from: string, to: string): SalesReportRow {
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS invoiceCount,
         COALESCE(SUM(CASE WHEN invoice_type = 'cash' THEN total - insurance_share ELSE 0 END), 0) AS cashTotal,
         COALESCE(SUM(CASE WHEN invoice_type = 'credit' THEN total ELSE 0 END), 0) AS creditTotal,
         COALESCE(SUM(insurance_share), 0) AS insuranceTotal,
         COALESCE(SUM(subtotal), 0) AS subtotal,
         COALESCE(SUM(line_discount_total + extra_discount_amt), 0) AS discountTotal,
         COALESCE(SUM(total), 0) AS grandTotal,
         COALESCE(SUM(cost_total), 0) AS costTotal
       FROM sales_invoices
       WHERE status = 'confirmed'
         AND confirmed_at >= ? AND confirmed_at < datetime(?, '+1 day')`
    )
    .get(from, to) as Omit<SalesReportRow, 'grossProfit' | 'returnsTotal' | 'returnsCost' | 'netTotal'>;

  const returns = db
    .prepare(
      `SELECT COALESCE(SUM(rl.line_total), 0) AS total,  -- gross (patient refund + insurance portion)
              COALESCE(SUM(rl.qty_base * b.unit_cost), 0) AS cost
       FROM sales_returns r
       JOIN sales_return_lines rl ON rl.return_id = r.id
       JOIN batches b ON b.id = rl.batch_id
       WHERE r.status = 'confirmed'
         AND r.created_at >= ? AND r.created_at < datetime(?, '+1 day')`
    )
    .get(from, to) as { total: number; cost: number };

  const netTotal = row.grandTotal - returns.total;
  return {
    ...row,
    returnsTotal: returns.total,
    returnsCost: returns.cost,
    netTotal,
    grossProfit: netTotal - (row.costTotal - returns.cost),
  };
}

export interface SalesTrendPoint {
  /** ISO date (YYYY-MM-DD), local. */
  date: string;
  grandTotal: number;
  invoiceCount: number;
}

/**
 * Daily sales totals across a date range in one query. Same definition as
 * getSalesReport's grandTotal (confirmed invoices, bucketed by confirmed_at).
 * Days with no sales are not returned; the caller fills gaps with zero.
 */
export function getSalesTrend(db: Db, from: string, to: string): SalesTrendPoint[] {
  return db
    .prepare(
      `SELECT date(confirmed_at) AS date,
              COALESCE(SUM(total), 0) AS grandTotal,
              COUNT(*) AS invoiceCount
       FROM sales_invoices
       WHERE status = 'confirmed'
         AND confirmed_at >= ? AND confirmed_at < datetime(?, '+1 day')
       GROUP BY date(confirmed_at)
       ORDER BY date(confirmed_at)`
    )
    .all(from, to) as SalesTrendPoint[];
}

export function getSalesReportInvoices(db: Db, from: string, to: string, limit = 500): SalesReportInvoiceRow[] {
  return db
    .prepare(
      `SELECT id, serial, invoice_type AS invoiceType, total, cost_total AS costTotal,
              confirmed_at AS confirmedAt, customer_id AS customerId
       FROM sales_invoices
       WHERE status = 'confirmed'
         AND confirmed_at >= ? AND confirmed_at < datetime(?, '+1 day')
       ORDER BY confirmed_at DESC, id DESC
       LIMIT ?`
    )
    .all(from, to, limit) as SalesReportInvoiceRow[];
}
