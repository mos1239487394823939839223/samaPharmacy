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
  name: z.string().trim().min(1).max(200),
  mobile1: z.string().trim().min(1).max(30),
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
  creditLimit: z.number().int().nonnegative().nullable().optional(),
  insuranceNumber: z.string().nullable().optional(),
  isVip: z.boolean().optional(),
  printNameOnInvoice: z.boolean().optional(),
  sellAtCost: z.boolean().optional(),
  discountCashPct: z.number().min(0).max(100).optional(),
  discountCreditPct: z.number().min(0).max(100).optional(),
  discountInvoicePct: z.number().min(0).max(100).optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  maritalStatus: z.string().nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  hasChildren: z.boolean().optional(),
  childrenCount: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
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
  pharmacyPhone: string | null;
  notes: string | null;
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
  /** Current balance — positive means the customer owes the pharmacy. */
  balance: number;
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

export interface ReceivablesSummary {
  totalOwed: number;
  customerCount: number;
}

export const customerPaymentSchema = z.object({
  id: z.number().int().positive(),
  /** Piastres. */
  amount: z.number().int().positive(),
  note: z.string().max(500).nullable().optional(),
  /** Paid in cash at the counter (recorded in the open shift). Default true. */
  cash: z.boolean().optional(),
});
