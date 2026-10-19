import { z } from 'zod';
import { prescriptionSchema } from './narcotics';
import { insuranceSaleSchema } from './insurance';

export const salesLineInputSchema = z.object({
  lineNo: z.number().int().positive(),
  itemId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  /** Ignored by the server (read from item_units); optional for compatibility. */
  unitFactor: z.number().int().positive().optional(),
  qtyInUnit: z.number().positive().max(100000),
  /** Piastres. Optional downward override of the unit's list price. */
  unitPrice: z.number().int().nonnegative().optional(),
  discountPct: z.number().min(0).max(100).optional(),
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
  extraDiscountPct: z.number().min(0).max(100).optional(),
  extraDiscountAmt: z.number().int().nonnegative().optional(),
  extraCharge: z.number().int().nonnegative().optional(),
  /** Piastres — the note(s) the customer handed over. Cash invoices only. */
  cashTendered: z.number().int().nonnegative().nullable().optional(),
  /** Legacy alias of cashTendered. */
  paidCash: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).nullable().optional(),
  /** BR-7: required when any line is a scheduled item. */
  prescription: prescriptionSchema.nullable().optional(),
  /** Insured sale (cash): the company pays its share, the patient the rest. */
  insurance: insuranceSaleSchema.nullable().optional(),
  lines: z.array(salesLineInputSchema).min(1).max(500),
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
  /** Cash kept in the drawer: the total for a cash invoice, 0 for credit. */
  paidCash: number;
  /** What the customer handed over (for change). */
  cashTendered: number | null;
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

export interface SalesReportRow {
  invoiceCount: number;
  cashTotal: number;
  creditTotal: number;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  costTotal: number;
  insuranceTotal: number;
  returnsTotal: number;
  returnsCost: number;
  netTotal: number;
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

export interface SalesTrendPoint {
  date: string;
  grandTotal: number;
  invoiceCount: number;
}
