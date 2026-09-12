import { z } from 'zod';

export const salesLineInputSchema = z.object({
  lineNo: z.number().int().positive(),
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  unitFactor: z.number().int().positive(),
  qtyInUnit: z.number().positive(),
  /** Piastres. */
  unitPrice: z.number().int().nonnegative(),
  discountPct: z.number().nonnegative().optional(),
  discountAmt: z.number().int().nonnegative().optional(),
  overrideReason: z.string().nullable().optional(),
});
export type SalesLineInput = z.infer<typeof salesLineInputSchema>;

export const salesInvoiceInputSchema = z.object({
  warehouseId: z.number().int().positive(),
  customerId: z.number().int().positive().nullable().optional(),
  invoiceType: z.enum(['cash', 'credit']),
  isHomeDelivery: z.boolean().optional(),
  deliveryAddress: z.string().nullable().optional(),
  extraDiscountPct: z.number().nonnegative().optional(),
  extraDiscountAmt: z.number().int().nonnegative().optional(),
  extraCharge: z.number().int().nonnegative().optional(),
  paidCash: z.number().int().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(salesLineInputSchema).min(1),
});
export type SalesInvoiceInput = z.infer<typeof salesInvoiceInputSchema>;

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
