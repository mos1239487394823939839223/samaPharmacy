import { z } from 'zod';
import type { ExpiryBucketDays } from './settings';

export interface ItemStockRow {
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number | null;
  /** Sellable base units (not expired, not quarantined). */
  qtyOnHand: number;
  /** Base units past expiry still on the shelf until written off. */
  expiredQty: number;
  /** Base units in quarantine. */
  quarantinedQty: number;
  nearestExpiry: string | null;
  stockValue: number;
}

export interface BatchRow {
  id: number;
  itemId: number;
  warehouseId: number;
  batchNumber: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  unitCost: number;
  receivedAt: string;
  isQuarantined: number;
}

export interface StockMoveRow {
  id: number;
  batchId: number;
  qtyDelta: number;
  unitCost: number;
  moveType: string;
  refTable: string | null;
  refId: number | null;
  reason: string | null;
  at: string;
}

export type ExpiryBucket = 'expired' | 'd30' | 'd60' | 'd90' | 'd180' | 'over180';

export interface ExpiryBatchRow {
  batchId: number;
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number;
  batchNumber: string | null;
  expiryDate: string;
  qtyOnHand: number;
  unitCost: number;
  value: number;
  bucket: ExpiryBucket;
}

export interface ExpiryBucketSummary {
  bucket: ExpiryBucket;
  batchCount: number;
  qtyOnHand: number;
  value: number;
}

export interface ExpiryReport {
  rows: ExpiryBatchRow[];
  summary: ExpiryBucketSummary[];
  bucketDays: ExpiryBucketDays;
}

export const adjustmentReasons = ['damage', 'expiry', 'theft', 'correction', 'count'] as const;
export type AdjustmentReason = (typeof adjustmentReasons)[number];

export const stockAdjustmentInputSchema = z.object({
  reasonCode: z.enum(adjustmentReasons),
  note: z.string().max(500).nullable().optional(),
  lines: z
    .array(
      z.object({
        batchId: z.number().int().positive(),
        /** Physical count of the batch in base units. */
        countedQty: z.number().int().nonnegative().optional(),
        /** Or the change itself in base units. */
        qtyDelta: z.number().int().optional(),
      })
    )
    .min(1)
    .max(500),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInputSchema>;

export interface StockAdjustmentRow {
  id: number;
  at: string;
  reasonCode: AdjustmentReason;
  note: string | null;
  lineCount: number;
  qtyDelta: number;
  valueDelta: number;
}

export interface AdjustmentMoveRow {
  batchId: number;
  itemId: number;
  nameAr: string;
  batchNumber: string | null;
  expiryDate: string | null;
  qtyDelta: number;
  unitCost: number;
}
