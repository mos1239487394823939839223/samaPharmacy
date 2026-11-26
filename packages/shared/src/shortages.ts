import { z } from 'zod';

/** open → ordered → resolved; cancelled = taken off the list. */
export type ShortageStatus = 'open' | 'ordered' | 'resolved' | 'cancelled';
export const ACTIVE_SHORTAGE: ShortageStatus[] = ['open', 'ordered'];

export const shortageInputSchema = z.object({
  itemId: z.number().int().positive(),
  /** Unit the required quantity is counted in (box, strip…). */
  unitId: z.number().int().positive().nullable().optional(),
  requiredQty: z.number().int().positive().max(100000).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
});
export type ShortageInput = z.infer<typeof shortageInputSchema>;

export const shortageUpdateSchema = shortageInputSchema.omit({ itemId: true });
export type ShortageUpdate = z.infer<typeof shortageUpdateSchema>;

export const shortageStatusSchema = z.enum(['open', 'ordered', 'resolved', 'cancelled']);

export interface ShortageRow {
  id: number;
  itemId: number;
  itemCode: number;
  itemNameAr: string;
  itemNameEn: string | null;
  barcode: string | null;
  /** Sellable stock now, in base units (tablets). */
  stockBase: number;
  /** The same stock described in the item's units, e.g. "2 علبة + 3 قرص". */
  stockText: string;
  unitId: number | null;
  unitNameAr: string | null;
  requiredQty: number | null;
  note: string | null;
  status: ShortageStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}
