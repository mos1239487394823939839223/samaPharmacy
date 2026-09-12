import { z } from 'zod';

export const purchaseLineInputSchema = z.object({
  lineNo: z.number().int().positive(),
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qtyInUnit: z.number().positive(),
  qtyBase: z.number().int().positive(),
  bonusInUnit: z.number().nonnegative().optional(),
  bonusBase: z.number().int().nonnegative().optional(),
  batchNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  /** Piastres. */
  unitPurchasePrice: z.number().int().nonnegative(),
  discountPct: z.number().nonnegative().optional(),
  discountAmt: z.number().int().nonnegative().optional(),
  taxPct: z.number().nonnegative().optional(),
  taxAmt: z.number().int().nonnegative().optional(),
});
export type PurchaseLineInput = z.infer<typeof purchaseLineInputSchema>;

export const purchaseInvoiceInputSchema = z.object({
  supplierInvoiceNo: z.string().min(1),
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  purchaseType: z.enum(['cash', 'credit']),
  invoiceDate: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  /** Piastres. */
  expenses: z.number().int().nonnegative().optional(),
  extraDiscountAmt: z.number().int().nonnegative().optional(),
  extraDiscountPct: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  lines: z.array(purchaseLineInputSchema).min(1),
});
export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceInputSchema>;

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
  valueBeforeDiscount: number;
  discountPct: number;
  discountAmt: number;
  valueAfterDiscount: number;
  taxPct: number;
  taxAmt: number;
  valueAfterTax: number;
  landedUnitCost: number;
  batchId: number | null;
}

export interface PurchaseInvoiceDetail extends PurchaseInvoiceRow {
  lines: PurchaseLineRow[];
}
