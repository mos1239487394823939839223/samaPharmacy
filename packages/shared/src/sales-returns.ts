import { z } from 'zod';

/**
 * A returned line names WHAT comes back; the server derives base units,
 * batch, item and refund (packages/db/src/repositories/sales-returns.ts).
 */
export const salesReturnLineInputSchema = z.object({
  /** Against an invoice: the sold line. */
  sourceLineId: z.number().int().positive().nullable().optional(),
  /** General return: the item (ignored for an invoice return). */
  itemId: z.number().int().positive().optional(),
  /** General return: batch to restock (optional). */
  batchId: z.number().int().positive().nullable().optional(),
  /** Unit the quantity is in — box, strip or tablet. */
  unitId: z.number().int().positive(),
  qtyInUnit: z.number().positive().max(100000),
  /** General return only — piastres per unit, capped by BR-4. */
  unitPrice: z.number().int().nonnegative().optional(),
  /** Ignored — derived by the server. */
  qtyBase: z.number().int().positive().optional(),
  damaged: z.boolean().optional(),
  overrideRefrigeratedQuarantine: z.boolean().optional(),
});
export type SalesReturnLineInput = z.infer<typeof salesReturnLineInputSchema>;

export const salesReturnInputSchema = z.object({
  sourceInvoiceId: z.number().int().positive().nullable().optional(),
  warehouseId: z.number().int().positive(),
  customerId: z.number().int().positive().nullable().optional(),
  /** Derived from the invoice type for an invoice return; cash or account for a general one. */
  refundMethod: z.enum(['cash', 'account']).optional(),
  reason: z.string().max(500).nullable().optional(),
  approvedBy: z.number().int().nullable().optional(),
  overrideNote: z.string().nullable().optional(),
  lines: z.array(salesReturnLineInputSchema).min(1),
});
export type SalesReturnInput = z.infer<typeof salesReturnInputSchema>;

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

export interface ReturnableLine {
  sourceLineId: number;
  invoiceId: number;
  itemId: number;
  itemNameAr: string;
  batchId: number;
  /** The unit it was sold in. */
  unitId: number;
  unitNameAr: string;
  unitFactor: number;
  soldQtyBase: number;
  soldQtyInUnit: number;
  unitPrice: number;
  valueAfterDiscount: number;
  expiryDate: string | null;
  alreadyReturnedQtyBase: number;
  /** What the customer paid for the line after all discounts. */
  netValue: number;
  /** What the line can still refund. */
  refundableValue: number;
}
