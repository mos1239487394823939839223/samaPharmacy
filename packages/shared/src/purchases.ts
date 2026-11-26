import { z } from 'zod';

export const purchaseLineInputSchema = z.object({
  lineNo: z.number().int().positive(),
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qtyInUnit: z.number().positive().max(1000000),
  /** Ignored by the server — derived from the unit's factor. */
  qtyBase: z.number().int().positive().optional(),
  bonusInUnit: z.number().nonnegative().optional(),
  /** Ignored by the server — derived from the unit's factor. */
  bonusBase: z.number().int().nonnegative().optional(),
  batchNumber: z.string().max(60).nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  /** Piastres. */
  unitPurchasePrice: z.number().int().nonnegative(),
  /** Selling price of this unit (piastres), when typed on the invoice: it
      becomes the item's selling price everywhere (all units follow). */
  salePrice: z.number().int().positive().optional(),
  discountPct: z.number().min(0).max(100).optional(),
  discountAmt: z.number().int().nonnegative().optional(),
  taxPct: z.number().min(0).max(100).optional(),
  taxAmt: z.number().int().nonnegative().optional(),
});
export type PurchaseLineInput = z.infer<typeof purchaseLineInputSchema>;

export const purchaseInvoiceInputSchema = z.object({
  supplierInvoiceNo: z.string().trim().min(1).max(60),
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  purchaseType: z.enum(['cash', 'credit']),
  invoiceDate: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  /** Piastres. */
  expenses: z.number().int().nonnegative().optional(),
  extraDiscountAmt: z.number().int().nonnegative().optional(),
  extraDiscountPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z.array(purchaseLineInputSchema).min(1).max(1000),
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
  /** Joined for lists; absent on rows built elsewhere. */
  supplierName?: string | null;
  lineCount?: number;
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
