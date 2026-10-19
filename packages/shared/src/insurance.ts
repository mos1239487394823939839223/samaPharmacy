import { z } from 'zod';

export const insuranceCompanyInputSchema = z.object({
  nameAr: z.string().trim().min(1).max(150),
  phone: z.string().max(40).nullable().optional(),
  contactName: z.string().max(100).nullable().optional(),
  /** Percent of covered lines the company pays. */
  coveragePct: z.number().min(0).max(100),
  /** Piastres; null = no cap. */
  maxPerInvoice: z.number().int().nonnegative().nullable().optional(),
  requiresApprovalNo: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type InsuranceCompanyInput = z.infer<typeof insuranceCompanyInputSchema>;

export const insuranceSaleSchema = z.object({
  companyId: z.number().int().positive(),
  memberNo: z.string().trim().max(60).nullable().optional(),
  approvalNo: z.string().trim().max(60).nullable().optional(),
});
export type InsuranceSaleInput = z.infer<typeof insuranceSaleSchema>;

export const claimSettlementSchema = z.object({
  /** Piastres the company actually paid. */
  paid: z.number().int().nonnegative(),
  rejections: z.array(z.object({ invoiceId: z.number().int().positive(), reason: z.string().trim().min(1).max(300) })).max(1000),
  notes: z.string().max(500).nullable().optional(),
});
export type ClaimSettlement = z.infer<typeof claimSettlementSchema>;

export interface InsuranceCompanyRow {
  id: number;
  nameAr: string;
  phone: string | null;
  contactName: string | null;
  coveragePct: number;
  maxPerInvoice: number | null;
  requiresApprovalNo: number;
  notes: string | null;
  isActive: number;
  excludedCount: number;
}

export interface ClaimableInvoice {
  invoiceId: number;
  serial: number;
  confirmedAt: string;
  memberNo: string | null;
  approvalNo: string | null;
  total: number;
  insuranceShare: number;
  claimable: number;
}

export interface ClaimRow {
  id: number;
  serial: number;
  companyId: number;
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: 'draft' | 'submitted' | 'settled';
  totalClaimed: number;
  totalPaid: number | null;
  totalRejected: number | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  settledAt: string | null;
  invoiceCount: number;
}

export interface ClaimLineRow {
  id: number;
  invoiceId: number;
  serial: number;
  confirmedAt: string;
  memberNo: string | null;
  approvalNo: string | null;
  amount: number;
  rejected: number;
  rejectedReason: string | null;
}

export interface InsuranceReceivableRow {
  companyId: number;
  companyName: string;
  unclaimed: number;
  pending: number;
  shortPaid: number;
  rejected: number;
}
