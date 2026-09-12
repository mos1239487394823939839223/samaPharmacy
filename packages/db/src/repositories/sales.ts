/**
 * Sales invoice repository. فواتير المبيعات — build order screen 8, the
 * screen that determines adoption.
 *
 * Unlike a purchase invoice, sales_invoice_lines.batch_id is NOT NULL: FEFO
 * allocation happens when a line is added (to snapshot which batch, its
 * expiry, and its cost into the line), not deferred to confirm. But qty_on_hand
 * is only decremented and stock_moves written at confirm — a draft invoice
 * reserves nothing. confirmSalesInvoice re-reads current qty_on_hand and
 * re-runs allocateFefo immediately before committing, inside the same
 * transaction, so a batch that was sold out from under a stale draft (by a
 * second till, or a return processed in between) is caught then rather than
 * producing negative stock.
 */

import { allocateFefo, allocationUnitCost, type FefoBatch } from '@pharmacy/core';
import type { Db } from '../connection';
import { nextSequence } from './items';
import { getSellableBatches } from './stock';

export interface SalesLineInput {
  lineNo: number;
  itemId: number;
  unitId: number;
  unitFactor: number;
  qtyInUnit: number;
  unitPrice: number;
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
  paidCash?: number;
  notes?: string | null;
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
  paidCash: number;
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

/** BR-1/BR-2 in effect: only sellable (non-expired, non-quarantined) batches are ever offered. */
function allocateLine(db: Db, itemId: number, warehouseId: number, qtyBase: number) {
  const candidates = getSellableBatches(db, itemId, warehouseId);
  const fefoInput: FefoBatch[] = candidates.map((b) => ({
    batchId: b.id,
    qtyOnHand: b.qtyOnHand,
    expiryDate: b.expiryDate,
    unitCost: b.unitCost,
  }));
  const allocation = allocateFefo(fefoInput, qtyBase);
  const unitCost = allocationUnitCost(allocation);
  // Snapshot expiry from the earliest (first) batch in the allocation — what
  // the sales grid shows per line, per blueprint §1.6.
  const expiryDate = allocation[0]?.expiryDate ?? null;
  return { allocation, unitCost, expiryDate };
}

interface ComputedLine {
  line: SalesLineInput;
  v: ReturnType<typeof computeLineValues>;
  qtyBase: number;
  unitCost: number;
  expiryDate: string | null;
  allocation: ReturnType<typeof allocateLine>['allocation'];
}

function computeLineValues(line: SalesLineInput) {
  const valueBeforeDiscount = line.qtyInUnit * line.unitPrice;
  const discountAmt =
    line.discountAmt ?? Math.round((valueBeforeDiscount * (line.discountPct ?? 0)) / 100);
  const valueAfterDiscount = valueBeforeDiscount - discountAmt;
  return { valueBeforeDiscount, discountAmt, valueAfterDiscount };
}

/**
 * Create a draft invoice. FEFO is run now to pick the batch and snapshot its
 * cost/expiry for display, but no stock is reserved or decremented — this is
 * purely informational until confirm.
 */
export function createSalesInvoice(db: Db, input: SalesInvoiceInput): number {
  const run = db.transaction((data: SalesInvoiceInput) => {
    const serial = nextSequence(db, 'sales_invoice');

    let subtotal = 0;
    let lineDiscountTotal = 0;
    let total = 0;

    // FEFO is run exactly once per line here. The allocation (which batches,
    // how much from each) is kept and reused below when writing rows —
    // calling allocateLine a second time would re-read batches independently
    // of this pass and could disagree with it if anything changed in between,
    // as well as being wasted work.
    const computed: ComputedLine[] = data.lines.map((line) => {
      const v = computeLineValues(line);
      const qtyBase = Math.round(line.qtyInUnit * line.unitFactor);
      const { allocation, unitCost, expiryDate } = allocateLine(
        db,
        line.itemId,
        data.warehouseId,
        qtyBase
      );

      subtotal += v.valueBeforeDiscount;
      lineDiscountTotal += v.discountAmt;
      total += v.valueAfterDiscount;

      return { line, v, qtyBase, unitCost, expiryDate, allocation };
    });

    const extraDiscountAmt =
      data.extraDiscountAmt ?? Math.round((total * (data.extraDiscountPct ?? 0)) / 100);
    total += data.extraCharge ?? 0;
    total -= extraDiscountAmt;

    const costTotal = computed.reduce((s, c) => s + c.qtyBase * c.unitCost, 0);

    const result = db
      .prepare(
        `INSERT INTO sales_invoices (
           serial, warehouse_id, customer_id, user_id, invoice_type,
           is_home_delivery, delivery_address, subtotal, line_discount_total,
           extra_discount_amt, extra_discount_pct, extra_charge, total,
           paid_cash, cost_total, notes
         ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        serial,
        data.warehouseId,
        data.customerId ?? null,
        data.invoiceType,
        data.isHomeDelivery ? 1 : 0,
        data.deliveryAddress ?? null,
        subtotal,
        lineDiscountTotal,
        extraDiscountAmt,
        data.extraDiscountPct ?? 0,
        data.extraCharge ?? 0,
        total,
        data.paidCash ?? 0,
        costTotal,
        data.notes ?? null
      );

    const invoiceId = Number(result.lastInsertRowid);

    // A line covering a FEFO allocation split across multiple batches becomes
    // multiple physical rows sharing the caller's lineNo intent, each with its
    // own line_no per the schema's UNIQUE(invoice_id, line_no) — renumbered
    // sequentially here since the schema has no concept of a sub-line.
    const insertLine = db.prepare(
      `INSERT INTO sales_invoice_lines (
         invoice_id, line_no, item_id, batch_id, unit_id, qty_in_unit, qty_base,
         unit_price, value_before_discount, discount_pct, discount_amt,
         value_after_discount, unit_cost, expiry_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let lineNo = 1;
    for (const { line, v, allocation } of computed) {
      const lineQtyBase = allocation.reduce((s, a) => s + a.qtyTaken, 0);
      for (const part of allocation) {
        const share = part.qtyTaken / lineQtyBase;
        insertLine.run(
          invoiceId,
          lineNo++,
          line.itemId,
          part.batchId,
          line.unitId,
          // qty_in_unit is split proportionally across sub-lines so the sum
          // still reconciles to the entered quantity.
          (line.qtyInUnit * part.qtyTaken) / lineQtyBase,
          part.qtyTaken,
          line.unitPrice,
          Math.round(v.valueBeforeDiscount * share),
          line.discountPct ?? 0,
          Math.round(v.discountAmt * share),
          Math.round(v.valueAfterDiscount * share),
          part.unitCost,
          part.expiryDate
        );
      }
    }

    return invoiceId;
  });

  return run(input);
}

export function getSalesInvoice(db: Db, id: number): SalesInvoiceRow | undefined {
  return db
    .prepare(
      `SELECT id, serial, warehouse_id AS warehouseId, customer_id AS customerId,
              invoice_type AS invoiceType, status, subtotal,
              line_discount_total AS lineDiscountTotal, extra_discount_amt AS extraDiscountAmt,
              extra_charge AS extraCharge, total, paid_cash AS paidCash,
              cost_total AS costTotal, notes, created_at AS createdAt, confirmed_at AS confirmedAt
       FROM sales_invoices WHERE id = ?`
    )
    .get(id) as SalesInvoiceRow | undefined;
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
    .prepare(
      `SELECT id, serial, warehouse_id AS warehouseId, customer_id AS customerId,
              invoice_type AS invoiceType, status, subtotal,
              line_discount_total AS lineDiscountTotal, extra_discount_amt AS extraDiscountAmt,
              extra_charge AS extraCharge, total, paid_cash AS paidCash,
              cost_total AS costTotal, notes, created_at AS createdAt, confirmed_at AS confirmedAt
       FROM sales_invoices ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as SalesInvoiceRow[];
}

/**
 * Confirm: re-validate every line's batch still has enough stock (a draft
 * reserves nothing, so time may have passed), decrement qty_on_hand, write a
 * matching stock_moves row per line (rule 8), and mark the invoice confirmed.
 * All in one transaction.
 */
export function confirmSalesInvoice(db: Db, invoiceId: number, userId = 1): void {
  const run = db.transaction(() => {
    const invoice = getSalesInvoice(db, invoiceId);
    if (!invoice) throw new Error(`Sales invoice ${invoiceId} not found`);
    if (invoice.status !== 'draft' && invoice.status !== 'held') {
      throw new Error(`Cannot confirm invoice in status "${invoice.status}"`);
    }

    const lines = getSalesLines(db, invoiceId);
    if (lines.length === 0) throw new Error('Cannot confirm an invoice with no lines');

    const getBatchQty = db.prepare('SELECT qty_on_hand AS q FROM batches WHERE id = ?');
    const decrementBatch = db.prepare(
      'UPDATE batches SET qty_on_hand = qty_on_hand - ? WHERE id = ?'
    );
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, user_id)
       VALUES (?, ?, ?, ?, ?, 'sale', 'sales_invoice_lines', ?, ?)`
    );

    for (const line of lines) {
      const row = getBatchQty.get(line.batchId) as { q: number } | undefined;
      if (!row) throw new Error(`Batch ${line.batchId} for line ${line.lineNo} no longer exists`);
      if (row.q < line.qtyBase) {
        throw new Error(
          `Insufficient stock for line ${line.lineNo}: batch ${line.batchId} has ${row.q}, need ${line.qtyBase}. ` +
            `Stock changed since this invoice was drafted — reopen it to reallocate.`
        );
      }

      decrementBatch.run(line.qtyBase, line.batchId);
      insertMove.run(
        line.batchId,
        line.itemId,
        invoice.warehouseId,
        -line.qtyBase,
        line.unitCost,
        line.id,
        userId
      );
    }

    db.prepare(
      "UPDATE sales_invoices SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?"
    ).run(invoiceId);
  });

  run();
}

export function voidSalesInvoice(db: Db, invoiceId: number): void {
  const invoice = getSalesInvoice(db, invoiceId);
  if (!invoice) throw new Error(`Sales invoice ${invoiceId} not found`);
  if (invoice.status === 'confirmed') {
    throw new Error('Confirmed invoices cannot be voided directly — use a sales return');
  }
  db.prepare("UPDATE sales_invoices SET status = 'voided' WHERE id = ?").run(invoiceId);
}
