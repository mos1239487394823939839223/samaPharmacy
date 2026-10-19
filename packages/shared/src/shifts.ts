import { z } from 'zod';

export interface ShiftRow {
  id: number;
  userId: number;
  warehouseId: number;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  varianceNote: string | null;
  handedTo: number | null;
  status: 'open' | 'closed';
}

export interface CashTransactionRow {
  id: number;
  shiftId: number | null;
  at: string;
  direction: 'in' | 'out';
  amount: number;
  category: string | null;
  note: string | null;
}

export interface CloseShiftInput {
  countedCash: number;
  varianceNote?: string | null;
  handedTo?: number | null;
}

export interface ShiftSalesSummary {
  count: number;
  cashTotal: number;
  creditTotal: number;
}

export const openShiftSchema = z.object({
  warehouseId: z.number().int().positive(),
  /** Piastres. */
  openingFloat: z.number().int().nonnegative(),
});

export const closeShiftSchema = z.object({
  /** Piastres. */
  countedCash: z.number().int().nonnegative(),
  varianceNote: z.string().max(500).nullable().optional(),
  handedTo: z.number().int().positive().nullable().optional(),
});

export const cashTransactionSchema = z.object({
  shiftId: z.number().int().positive(),
  direction: z.enum(['in', 'out']),
  /** Piastres. */
  amount: z.number().int().positive(),
  category: z.string().max(40).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});
