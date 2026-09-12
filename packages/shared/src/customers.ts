import { z } from 'zod';

export const customerAddressInputSchema = z.object({
  deliveryAddress: z.string().nullable().optional(),
  governorateId: z.number().int().nullable().optional(),
  cityId: z.number().int().nullable().optional(),
  area: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});
export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;

export const customerInputSchema = z.object({
  name: z.string().min(1),
  mobile1: z.string().min(1),
  mobile2: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  pharmacyOwnerName: z.string().nullable().optional(),
  pharmacyPhone: z.string().nullable().optional(),
  accountType: z.enum(['individual', 'pharmacy', 'clinic', 'company']).optional(),
  parentCustomerId: z.number().int().nullable().optional(),
  installmentCompany: z.string().nullable().optional(),
  installmentTier: z.string().nullable().optional(),
  paymentMethod: z.enum(['cash', 'credit']).optional(),
  /** Piastres. */
  openingBalance: z.number().int().optional(),
  creditLimit: z.number().int().nullable().optional(),
  insuranceNumber: z.string().nullable().optional(),
  isVip: z.boolean().optional(),
  printNameOnInvoice: z.boolean().optional(),
  sellAtCost: z.boolean().optional(),
  discountCashPct: z.number().nonnegative().optional(),
  discountCreditPct: z.number().nonnegative().optional(),
  discountInvoicePct: z.number().nonnegative().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  hasChildren: z.boolean().optional(),
  childrenCount: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  addresses: z.array(customerAddressInputSchema).optional(),
  tags: z.array(z.string()).optional(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export interface CustomerRow {
  id: number;
  code: number;
  name: string;
  mobile1: string;
  mobile2: string | null;
  email: string | null;
  pharmacyOwnerName: string | null;
  accountType: string;
  paymentMethod: string;
  openingBalance: number;
  creditLimit: number | null;
  isVip: number;
  isSuspended: number;
  discountCashPct: number;
  discountCreditPct: number;
  discountInvoicePct: number;
  sellAtCost: number;
  isActive: number;
}

export interface CustomerAddressRow {
  id: number;
  deliveryAddress: string | null;
  governorateId: number | null;
  cityId: number | null;
  area: string | null;
  isDefault: number;
}

export interface CustomerLedgerRow {
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

export interface CustomerDetail extends CustomerRow {
  addresses: CustomerAddressRow[];
  tags: string[];
}
