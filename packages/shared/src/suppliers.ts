import { z } from 'zod';

export const supplierInputSchema = z.object({
  nameAr: z.string().trim().min(1).max(200),
  phone1: z.string().nullable().optional(),
  phone2: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  /** Piastres. */
  openingBalance: z.number().int().optional(),
  paymentTermsDays: z.number().int().nonnegative().max(365).nullable().optional(),
});
export type SupplierInput = z.infer<typeof supplierInputSchema>;

export interface SupplierRow {
  id: number;
  code: number;
  nameAr: string;
  phone1: string | null;
  phone2: string | null;
  address: string | null;
  taxNumber: string | null;
  openingBalance: number;
  paymentTermsDays: number | null;
  isActive: number;
  /** Current balance — positive means the pharmacy owes the supplier. */
  balance: number;
}

export const supplierPaymentSchema = z.object({
  id: z.number().int().positive(),
  /** Piastres. */
  amount: z.number().int().positive(),
  note: z.string().max(500).nullable().optional(),
});

export interface SupplierLedgerRow {
  id: number;
  at: string;
  entryType: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  refTable: string | null;
  refId: number | null;
  note: string | null;
}
