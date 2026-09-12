import { z } from 'zod';

export const supplierInputSchema = z.object({
  nameAr: z.string().min(1),
  phone1: z.string().nullable().optional(),
  phone2: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  taxNumber: z.string().nullable().optional(),
  /** Piastres. */
  openingBalance: z.number().int().optional(),
  paymentTermsDays: z.number().int().nullable().optional(),
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
}
