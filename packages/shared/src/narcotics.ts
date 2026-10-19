import { z } from 'zod';

/** BR-7: the prescription behind a sale of a scheduled item. */
export const prescriptionSchema = z.object({
  prescriptionNo: z.string().trim().min(1).max(60),
  prescriptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  doctorName: z.string().trim().min(1).max(120),
  doctorSyndicateNo: z.string().trim().min(1).max(40),
  patientName: z.string().trim().min(1).max(120),
  /** Egyptian national ID — 14 digits. */
  patientIdNo: z.string().trim().regex(/^\d{14}$/),
  notes: z.string().max(300).nullable().optional(),
});
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

export interface NarcoticsRow {
  id: number;
  serial: number;
  at: string;
  itemId: number;
  itemName: string;
  batchId: number | null;
  direction: 'in' | 'out' | 'reversal';
  qtyBase: number;
  balanceAfter: number;
  prescriptionNo: string | null;
  doctorName: string | null;
  doctorSyndicateNo: string | null;
  patientName: string | null;
  patientIdNo: string | null;
  refTable: string | null;
  refId: number | null;
  reversesId: number | null;
  reason: string | null;
  userName: string | null;
  approvedByName: string | null;
}

export interface NarcoticsReconciliationRow {
  itemId: number;
  code: number;
  nameAr: string;
  scheduleClass: string;
  registerBalance: number | null;
  physicalQty: number;
  difference: number | null;
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

export interface ResumedInvoice {
  invoiceType: 'cash' | 'credit';
  customerId: number | null;
  lines: Array<{ itemId: number; unitId: number; qtyInUnit: number; discountAmt: number }>;
  prescription: (PrescriptionInput & { id: number }) | null;
  insurance: { companyId: number; memberNo: string | null; approvalNo: string | null } | null;
}

export interface InvoiceSearchRow {
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
}

export interface AlternativeRow {
  itemId: number;
  code: number;
  nameAr: string;
  scientificName: string | null;
  publicPrice: number | null;
  qtyOnHand: number;
  shelfLocation: string | null;
}

export interface UnitPriceIssue {
  itemId: number;
  code: number;
  nameAr: string;
  publicPrice: number | null;
  units: Array<{ unitId: number; nameAr: string; factor: number; salePrice: number; suggested: number }>;
}
