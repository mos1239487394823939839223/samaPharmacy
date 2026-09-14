import type { ExpiryBucketDays } from './settings';

export interface ItemStockRow {
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number | null;
  qtyOnHand: number;
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
