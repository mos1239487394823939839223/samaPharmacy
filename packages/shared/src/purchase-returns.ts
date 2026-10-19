import { z } from 'zod';

export const purchaseReturnLineInputSchema = z.object({
  itemId: z.number().int().positive(),
  batchId: z.number().int().positive(),
  unitId: z.number().int().positive(),
  qtyInUnit: z.number().positive(),
  /** Ignored by the server — derived from the unit's factor. */
  qtyBase: z.number().int().positive().optional(),
});
export type PurchaseReturnLineInput = z.infer<typeof purchaseReturnLineInputSchema>;

export const purchaseReturnInputSchema = z.object({
  sourceInvoiceId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  reason: z.string().nullable().optional(),
  lines: z.array(purchaseReturnLineInputSchema).min(1),
});
export type PurchaseReturnInput = z.infer<typeof purchaseReturnInputSchema>;

export interface PurchaseReturnRow {
  id: number;
  serial: number;
  sourceInvoiceId: number | null;
  supplierId: number;
  warehouseId: number;
  status: string;
  total: number;
  reason: string | null;
  createdAt: string;
}

export interface PurchaseReturnLineRow {
  id: number;
  itemId: number;
  batchId: number;
  unitId: number;
  qtyInUnit: number;
  qtyBase: number;
  unitCost: number;
  lineTotal: number;
}

export interface ReturnablePurchaseLine {
  sourceLineId: number;
  itemId: number;
  itemNameAr: string;
  batchId: number;
  unitId: number;
  unitNameAr: string;
  unitFactor: number;
  receivedQtyBase: number;
  receivedQtyInUnit: number;
  unitCost: number;
  batchQtyOnHand: number | null;
  alreadyReturnedQtyBase: number;
}
