import { z } from 'zod';

export const salesReturnLineInputSchema = z.object({
  itemId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qtyInUnit: z.number().positive(),
  qtyBase: z.number().int().positive(),
  /** Piastres. */
  unitPrice: z.number().int().nonnegative(),
  sourceLineId: z.number().int().nullable().optional(),
  damaged: z.boolean().optional(),
  overrideRefrigeratedQuarantine: z.boolean().optional(),
});
export type SalesReturnLineInput = z.infer<typeof salesReturnLineInputSchema>;

export const salesReturnInputSchema = z.object({
  sourceInvoiceId: z.number().int().positive().nullable().optional(),
  warehouseId: z.number().int().positive(),
  customerId: z.number().int().positive().nullable().optional(),
  refundMethod: z.enum(['cash', 'credit_note', 'account']),
  reason: z.string().nullable().optional(),
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
  itemId: number;
  itemNameAr: string;
  batchId: number;
  unitId: number;
  soldQtyBase: number;
  soldQtyInUnit: number;
  unitPrice: number;
  expiryDate: string | null;
  alreadyReturnedQtyBase: number;
}
