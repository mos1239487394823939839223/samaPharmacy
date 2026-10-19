/**
 * Sales returns. مرتجع فواتير البيع (against an invoice) and مرتجع بيع عام
 * (general, no source invoice) — blueprint build order screens 12/13.
 *
 * The server decides every number that matters. The request names WHAT is
 * coming back (a sold line, a unit, a quantity); this file derives the base
 * quantity from item_units, the batch and item from the sold line, and the
 * refund from what the customer actually paid for that line:
 *
 *   net line value = value_after_discount − the line's share of the
 *                    invoice's extra (header) discount
 *   refund         = net line value × returned base units / sold base units
 *
 * computed cumulatively (proRataShare) so several partial returns of one line
 * add up to exactly what was paid — never more. The previous version took
 * unitPrice and qtyBase from the screen and multiplied base units by the BOX
 * price: returning a 100 EGP box of 20 tablets refunded 2,000 EGP.
 *
 * BR-12: refrigerated stock (fridge/freezer) always returns to quarantine,
 * never back to sellable stock, unless the pharmacist-in-charge overrides
 * with a note. Damaged goods follow the same quarantine path.
 *
 * Refund method follows the invoice (decision D11): a cash invoice refunds
 * cash from the drawer, a credit invoice is credited to the customer's
 * account ("على الحساب") — paying cash back on a sale that was never paid
 * would hand the customer money they still owe.
 */

import { allocate, boxFactorOf, DomainError, lineValue, maxUnitPrice, proRataShare, toBaseUnits } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';
import { getCustomer, postCustomerReturnCredit } from './customers';
import { getSalesReturnWindowDays } from './settings';
import { getOpenShift, recordCashTransaction } from './shifts';
import { recordNarcoticMove } from './narcotics';

export type RefundMethod = 'cash' | 'account';

export interface SalesReturnLineInput {
  /** Against an invoice: the sold line coming back. Required when the return has a source invoice. */
  sourceLineId?: number | null;
  /** General return: the item coming back. Ignored for an invoice return (taken from the sold line). */
  itemId?: number;
  /** General return: batch to restock; the newest batch of the item in the warehouse when omitted. */
  batchId?: number | null;
  /** Unit the quantity is expressed in — any unit of the item (box, strip, tablet). */
  unitId: number;
  qtyInUnit: number;
  /** General return only: refund per unit. Defaults to the unit's sale price; capped by BR-4. */
  unitPrice?: number;
  /** Damaged goods — forced to quarantine regardless of storage condition. */
  damaged?: boolean;
  /** BR-12 override: return refrigerated stock to sellable anyway. Requires a note. */
  overrideRefrigeratedQuarantine?: boolean;
  /** Ignored — derived from unitId and qtyInUnit. Accepted so older callers still type-check. */
  qtyBase?: number;
}

export interface SalesReturnInput {
  sourceInvoiceId?: number | null;
  /** General return: the warehouse receiving the stock. An invoice return uses the invoice's warehouse. */
  warehouseId: number;
  /** General return: who is refunded on account. An invoice return uses the invoice's customer. */
  customerId?: number | null;
  /** Optional for an invoice return (derived from the invoice type); required for a general return. */
  refundMethod?: RefundMethod | 'credit_note';
  reason?: string | null;
  /** Required when sourceInvoiceId is absent (a general return needs authorization). */
  approvedBy?: number | null;
  overrideNote?: string | null;
  lines: SalesReturnLineInput[];
}

export interface SalesReturnRow {
  id: number;
  serial: number;
  sourceInvoiceId: number | null;
  warehouseId: number;
  customerId: number | null;
  approvedBy: number | null;
  status: string;
  total: number;
  refundMethod: string | null;
  reason: string | null;
  createdAt: string;
}

export interface SalesReturnLineRow {
  id: number;
  sourceLineId: number | null;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitPrice: number;
  lineTotal: number;
  toQuarantine: number;
}

const SELECT = `
  SELECT id, serial, source_invoice_id AS sourceInvoiceId, warehouse_id AS warehouseId,
         customer_id AS customerId, approved_by AS approvedBy, status, total,
         refund_method AS refundMethod, reason, created_at AS createdAt
  FROM sales_returns
`;

export function getSalesReturn(db: Db, id: number): SalesReturnRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as SalesReturnRow | undefined;
}

export function listSalesReturns(db: Db, limit = 100, offset = 0): SalesReturnRow[] {
  return db
    .prepare(`${SELECT} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(limit, offset) as SalesReturnRow[];
}

export function getSalesReturnLines(db: Db, returnId: number): SalesReturnLineRow[] {
  return db
    .prepare(
      `SELECT id, source_line_id AS sourceLineId, item_id AS itemId, batch_id AS batchId,
              unit_id AS unitId, qty_in_unit AS qtyInUnit, qty_base AS qtyBase,
              unit_price AS unitPrice, line_total AS lineTotal, to_quarantine AS toQuarantine
       FROM sales_return_lines WHERE return_id = ? ORDER BY id`
    )
    .all(returnId) as SalesReturnLineRow[];
}

interface SoldLine {
  sourceLineId: number;
  invoiceId: number;
  itemId: number;
  itemNameAr: string;
  batchId: number;
  unitId: number;
  unitNameAr: string;
  unitFactor: number;
  soldQtyBase: number;
  soldQtyInUnit: number;
  unitPrice: number;
  valueAfterDiscount: number;
  expiryDate: string | null;
  alreadyReturnedQtyBase: number;
  /** What the customer paid for this line after line AND header discounts. */
  netValue: number;
  /** netValue minus what was already refunded — the most this line can still refund. */
  refundableValue: number;
}

/**
 * Sold lines of an invoice with everything a return needs: the unit they
 * were sold in, what is still returnable, and the net (after every discount)
 * value the customer paid.
 */
export function getReturnableLines(db: Db, invoiceId: number): SoldLine[] {
  const invoice = db
    .prepare('SELECT extra_discount_amt AS extra FROM sales_invoices WHERE id = ?')
    .get(invoiceId) as { extra: number } | undefined;
  if (!invoice) return [];

  const rows = db
    .prepare(
      `SELECT l.id AS sourceLineId, l.invoice_id AS invoiceId, l.item_id AS itemId, i.name_ar AS itemNameAr,
              l.batch_id AS batchId, l.unit_id AS unitId, u.name_ar AS unitNameAr, u.factor AS unitFactor,
              l.qty_base AS soldQtyBase, l.qty_in_unit AS soldQtyInUnit, l.unit_price AS unitPrice,
              l.value_after_discount AS valueAfterDiscount, l.expiry_date AS expiryDate,
              COALESCE((
                SELECT SUM(rl.qty_base) FROM sales_return_lines rl
                JOIN sales_returns r ON r.id = rl.return_id
                WHERE rl.source_line_id = l.id AND r.status = 'confirmed'
              ), 0) AS alreadyReturnedQtyBase
       FROM sales_invoice_lines l
       JOIN items i ON i.id = l.item_id
       JOIN item_units u ON u.id = l.unit_id
       WHERE l.invoice_id = ?
       ORDER BY l.line_no`
    )
    .all(invoiceId) as Array<Omit<SoldLine, 'netValue' | 'refundableValue'>>;

  // The header discount was given on the whole invoice; each line carries
  // its proportional share, split exactly with allocate().
  const headerShares = allocate(
    invoice.extra,
    rows.map((r) => r.valueAfterDiscount)
  );

  return rows.map((r, i) => {
    const netValue = r.valueAfterDiscount - (headerShares[i] ?? 0);
    const refunded = proRataShare(netValue, 0, r.alreadyReturnedQtyBase, r.soldQtyBase);
    return { ...r, netValue, refundableValue: netValue - refunded };
  });
}

function isRefrigerated(db: Db, itemId: number): boolean {
  const row = db.prepare('SELECT storage_condition AS s FROM items WHERE id = ?').get(itemId) as
    | { s: string }
    | undefined;
  return row?.s === 'fridge' || row?.s === 'freezer';
}

interface UnitInfo {
  factor: number;
  salePrice: number;
  nameAr: string;
}

function unitOf(db: Db, itemId: number, unitId: number): UnitInfo {
  const unit = db
    .prepare('SELECT factor, sale_price AS salePrice, name_ar AS nameAr FROM item_units WHERE id = ? AND item_id = ?')
    .get(unitId, itemId) as UnitInfo | undefined;
  if (!unit) throw new DomainError('return.unitInvalid', `Unit ${unitId} does not belong to item ${itemId}`);
  return unit;
}

function baseQty(qtyInUnit: number, unit: UnitInfo): number {
  let q: number;
  try {
    q = toBaseUnits(qtyInUnit, unit.factor);
  } catch {
    throw new DomainError('return.qtyNotWhole', `${qtyInUnit} ${unit.nameAr} is not a whole number of base units`, {
      qty: qtyInUnit,
      unit: unit.nameAr,
    });
  }
  if (q <= 0) throw new DomainError('return.qtyInvalid', `Return quantity must be positive, got ${qtyInUnit}`);
  return q;
}

interface PlannedLine {
  sourceLineId: number | null;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  lineTotal: number;
  damaged: boolean;
  overrideRefrigerated: boolean;
}

function planInvoiceReturn(db: Db, invoiceId: number, lines: SalesReturnLineInput[]) {
  const invoice = db
    .prepare(
      `SELECT id, status, invoice_type AS invoiceType, customer_id AS customerId, warehouse_id AS warehouseId,
              serial, total, insurance_share AS insuranceShare, CAST(julianday(${NOW}) - julianday(confirmed_at) AS INTEGER) AS daysSinceConfirmed
       FROM sales_invoices WHERE id = ?`
    )
    .get(invoiceId) as
    | {
        id: number;
        status: string;
        invoiceType: 'cash' | 'credit';
        customerId: number | null;
        warehouseId: number;
        serial: number;
        total: number;
        insuranceShare: number;
        daysSinceConfirmed: number | null;
      }
    | undefined;
  if (!invoice) throw new DomainError('return.invoiceNotFound', `Sales invoice ${invoiceId} not found`);

  // A draft or voided invoice never sold anything: returning against it
  // would refund cash and add stock that never left.
  if (invoice.status !== 'confirmed') {
    throw new DomainError('return.invoiceNotConfirmed', `Invoice ${invoice.serial} is "${invoice.status}", not confirmed`, {
      serial: invoice.serial,
    });
  }

  const windowDays = getSalesReturnWindowDays(db);
  if (invoice.daysSinceConfirmed !== null && invoice.daysSinceConfirmed > windowDays) {
    throw new DomainError(
      'return.windowPassed',
      `Return window of ${windowDays} day(s) has passed for invoice ${invoice.serial} (confirmed ${invoice.daysSinceConfirmed} day(s) ago)`,
      { days: windowDays, since: invoice.daysSinceConfirmed }
    );
  }

  const sold = new Map(getReturnableLines(db, invoiceId).map((l) => [l.sourceLineId, l]));
  const pendingByLine = new Map<number, number>();

  const planned: PlannedLine[] = lines.map((line) => {
    const src = line.sourceLineId != null ? sold.get(line.sourceLineId) : undefined;
    if (!src) {
      throw new DomainError('return.lineNotOnInvoice', `Line ${line.sourceLineId} is not on invoice ${invoice.serial}`, {
        serial: invoice.serial,
      });
    }
    const unit = unitOf(db, src.itemId, line.unitId);
    const qtyBase = baseQty(line.qtyInUnit, unit);

    // Two request lines naming the same sold line still share one remainder.
    const already = src.alreadyReturnedQtyBase + (pendingByLine.get(src.sourceLineId) ?? 0);
    const remaining = src.soldQtyBase - already;
    if (qtyBase > remaining) {
      throw new DomainError(
        'return.qtyExceedsRemaining',
        `Cannot return ${qtyBase} units against invoice line ${src.sourceLineId}: only ${remaining} remain returnable ` +
          `(${src.soldQtyBase} sold, ${already} already returned)`,
        { item: src.itemNameAr, remaining }
      );
    }
    pendingByLine.set(src.sourceLineId, (pendingByLine.get(src.sourceLineId) ?? 0) + qtyBase);

    return {
      sourceLineId: src.sourceLineId,
      itemId: src.itemId,
      batchId: src.batchId,
      unitId: line.unitId,
      qtyInUnit: line.qtyInUnit,
      qtyBase,
      lineTotal: proRataShare(src.netValue, already, qtyBase, src.soldQtyBase),
      damaged: Boolean(line.damaged),
      overrideRefrigerated: Boolean(line.overrideRefrigeratedQuarantine),
    };
  });

  return { invoice, planned };
}

function planGeneralReturn(db: Db, warehouseId: number, lines: SalesReturnLineInput[]): PlannedLine[] {
  const newestBatch = db.prepare(
    `SELECT id FROM batches WHERE item_id = ? AND warehouse_id = ? AND is_quarantined = 0
     ORDER BY received_at DESC, id DESC LIMIT 1`
  );
  const batchOf = db.prepare('SELECT item_id AS itemId, warehouse_id AS warehouseId FROM batches WHERE id = ?');
  const itemOf = db.prepare('SELECT public_price AS publicPrice, name_ar AS nameAr FROM items WHERE id = ?');
  const unitsOf = db.prepare('SELECT factor FROM item_units WHERE item_id = ?');

  return lines.map((line) => {
    if (!line.itemId) throw new DomainError('return.itemRequired', 'A general return line needs an item');
    const item = itemOf.get(line.itemId) as { publicPrice: number | null; nameAr: string } | undefined;
    if (!item) throw new DomainError('return.itemRequired', `Item ${line.itemId} not found`);
    const unit = unitOf(db, line.itemId, line.unitId);
    const qtyBase = baseQty(line.qtyInUnit, unit);

    let batchId = line.batchId ?? null;
    if (batchId != null) {
      const b = batchOf.get(batchId) as { itemId: number; warehouseId: number } | undefined;
      if (!b || b.itemId !== line.itemId || b.warehouseId !== warehouseId) {
        throw new DomainError('return.batchMismatch', `Batch ${batchId} is not a batch of item ${line.itemId} in this warehouse`);
      }
    } else {
      batchId = (newestBatch.get(line.itemId, warehouseId) as { id: number } | undefined)?.id ?? null;
      if (batchId == null) {
        throw new DomainError('return.noBatch', `Item ${line.itemId} has never been stocked in this warehouse`, {
          item: item.nameAr,
        });
      }
    }

    // No invoice bounds the refund here, so BR-4 does: at most the unit's
    // share of the public (box) price (decision D9).
    const unitPrice = line.unitPrice ?? unit.salePrice;
    if (item.publicPrice != null) {
      const cap = maxUnitPrice(item.publicPrice, boxFactorOf(unitsOf.all(line.itemId) as Array<{ factor: number }>), unit.factor);
      if (unitPrice > cap) {
        throw new DomainError(
          'return.priceAbovePublic',
          `Return price ${unitPrice} for item ${line.itemId} exceeds its public price share ${cap} — a general return cannot refund more than the item's list price`,
          { cap }
        );
      }
    }

    return {
      sourceLineId: null,
      itemId: line.itemId,
      batchId,
      unitId: line.unitId,
      qtyInUnit: line.qtyInUnit,
      qtyBase,
      lineTotal: lineValue(line.qtyInUnit, unitPrice),
      damaged: Boolean(line.damaged),
      overrideRefrigerated: Boolean(line.overrideRefrigeratedQuarantine),
    };
  });
}

/**
 * Create and confirm a sales return in one step — there is no useful draft
 * state for reversing an already-settled transaction.
 *
 * Returned stock goes back into its original batch unless BR-12 or the
 * damaged flag route it to quarantine — a twin batch (same key,
 * is_quarantined = 1, allowed by migration 0006) that is never offered for
 * sale.
 */
export function createSalesReturn(db: Db, input: SalesReturnInput, userId = 1): number {
  const run = db.transaction((data: SalesReturnInput) => {
    if (data.lines.length === 0) throw new DomainError('return.noLines', 'Cannot create a return with no lines');
    if (data.refundMethod === 'credit_note') {
      throw new DomainError('return.refundMethodInvalid', 'Credit notes are not supported; refund in cash or on account');
    }

    let warehouseId: number;
    let customerId: number | null;
    let refundMethod: RefundMethod;
    let planned: PlannedLine[];
    let insurancePortion = 0;

    if (data.sourceInvoiceId) {
      const plan = planInvoiceReturn(db, data.sourceInvoiceId, data.lines);
      // Insured sale: the patient paid only their share, so they get back
      // only their share of the returned value; the company's part comes off
      // its claim (insurance_portion).
      if (plan.invoice.insuranceShare > 0 && plan.invoice.total > 0) {
        const gross = plan.planned.reduce((s, l) => s + l.lineTotal, 0);
        insurancePortion = Math.round((gross * plan.invoice.insuranceShare) / plan.invoice.total);
      }
      warehouseId = plan.invoice.warehouseId;
      customerId = plan.invoice.customerId;
      planned = plan.planned;
      const expected: RefundMethod = plan.invoice.invoiceType === 'credit' ? 'account' : 'cash';
      if (data.refundMethod && data.refundMethod !== expected) {
        throw new DomainError(
          expected === 'account' ? 'return.creditMustUseAccount' : 'return.cashInvoiceRefundsCash',
          `Invoice ${plan.invoice.serial} is ${plan.invoice.invoiceType}; refund must be "${expected}"`
        );
      }
      refundMethod = expected;
    } else {
      if (!data.approvedBy) {
        throw new DomainError(
          'return.approvalRequired',
          'مرتجع بيع عام requires approvedBy — a general return with no source invoice must be authorized'
        );
      }
      warehouseId = data.warehouseId;
      customerId = data.customerId ?? null;
      refundMethod = data.refundMethod === 'account' ? 'account' : 'cash';
      if (refundMethod === 'account') {
        const customer = customerId ? getCustomer(db, customerId) : undefined;
        if (!customer) throw new DomainError('return.accountNeedsCustomer', 'An account refund needs a customer');
      }
      planned = planGeneralReturn(db, warehouseId, data.lines);
    }

    const total = planned.reduce((s, l) => s + l.lineTotal, 0) - insurancePortion;
    const serial = nextSequence(db, 'sales_return');
    const shift = getOpenShift(db, warehouseId);

    const result = db
      .prepare(
        `INSERT INTO sales_returns (
           serial, source_invoice_id, warehouse_id, customer_id, shift_id, user_id,
           approved_by, status, total, refund_method, reason, created_at, insurance_portion
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ${NOW}, ?)`
      )
      .run(
        serial,
        data.sourceInvoiceId ?? null,
        warehouseId,
        customerId,
        shift?.id ?? null,
        userId,
        data.approvedBy ?? null,
        total,
        refundMethod,
        data.reason?.trim() || null,
        insurancePortion
      );
    const returnId = Number(result.lastInsertRowid);

    const getBatch = db.prepare(
      'SELECT item_id AS itemId, warehouse_id AS warehouseId, batch_number AS batchNumber, expiry_date AS expiryDate, unit_cost AS unitCost FROM batches WHERE id = ?'
    );
    const findQuarantineBatch = db.prepare(
      `SELECT id FROM batches WHERE item_id = ? AND warehouse_id = ? AND batch_number IS ? AND expiry_date IS ? AND unit_cost = ? AND is_quarantined = 1`
    );
    const insertQuarantineBatch = db.prepare(
      `INSERT INTO batches (item_id, warehouse_id, batch_number, expiry_date, qty_on_hand, unit_cost, is_quarantined, received_at)
       VALUES (?, ?, ?, ?, 0, ?, 1, ${NOW})`
    );
    const growBatch = db.prepare('UPDATE batches SET qty_on_hand = qty_on_hand + ? WHERE id = ?');
    const insertMove = db.prepare(
      `INSERT INTO stock_moves (batch_id, item_id, warehouse_id, qty_delta, unit_cost, move_type, ref_table, ref_id, reason, user_id, at)
       VALUES (?, ?, ?, ?, ?, 'sale_return', 'sales_return_lines', ?, ?, ?, ${NOW})`
    );
    const insertLine = db.prepare(
      `INSERT INTO sales_return_lines (
         return_id, source_line_id, item_id, batch_id, unit_id, qty_in_unit,
         qty_base, unit_price, line_total, to_quarantine
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const line of planned) {
      const batch = getBatch.get(line.batchId) as
        | { itemId: number; warehouseId: number; batchNumber: string | null; expiryDate: string | null; unitCost: number }
        | undefined;
      if (!batch) throw new DomainError('return.batchMismatch', `Batch ${line.batchId} not found`);

      // BR-12: refrigerated always quarantines unless explicitly overridden,
      // and an override with no note is not a real override.
      const toQuarantine =
        line.damaged ||
        (isRefrigerated(db, line.itemId) && !(line.overrideRefrigerated && data.overrideNote?.trim()));

      let targetBatchId = line.batchId;
      if (toQuarantine) {
        const existing = findQuarantineBatch.get(
          batch.itemId,
          batch.warehouseId,
          batch.batchNumber,
          batch.expiryDate,
          batch.unitCost
        ) as { id: number } | undefined;
        targetBatchId =
          existing?.id ??
          Number(
            insertQuarantineBatch.run(batch.itemId, batch.warehouseId, batch.batchNumber, batch.expiryDate, batch.unitCost)
              .lastInsertRowid
          );
      }

      growBatch.run(line.qtyBase, targetBatchId);
      const lineId = Number(
        insertLine.run(
          returnId,
          line.sourceLineId,
          line.itemId,
          targetBatchId,
          line.unitId,
          line.qtyInUnit,
          line.qtyBase,
          Math.round(line.lineTotal / line.qtyInUnit),
          line.lineTotal,
          toQuarantine ? 1 : 0
        ).lastInsertRowid
      );
      insertMove.run(
        targetBatchId,
        line.itemId,
        warehouseId,
        line.qtyBase,
        batch.unitCost,
        lineId,
        data.reason?.trim() || null,
        userId
      );
      recordNarcoticMove(db, {
        itemId: line.itemId,
        batchId: targetBatchId,
        qtyDelta: line.qtyBase,
        refTable: 'sales_return_lines',
        refId: lineId,
        userId,
        reason: data.reason?.trim() || null,
        approvedBy: data.approvedBy ?? null,
      });
    }

    if (refundMethod === 'account' && customerId) {
      postCustomerReturnCredit(db, customerId, total, returnId, `مرتجع بيع #${serial}`);
    }

    // A cash refund physically leaves the drawer (QA-002). With no open
    // shift there is no drawer to record it against.
    if (refundMethod === 'cash' && total > 0 && shift) {
      recordCashTransaction(db, shift.id, 'out', total, 'sale_return', `مرتجع بيع #${serial}`, userId);
    }

    return returnId;
  });

  return run(input);
}
