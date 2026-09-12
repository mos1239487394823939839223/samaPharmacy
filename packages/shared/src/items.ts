/**
 * Item contracts shared across the process boundary.
 *
 * zod schemas live here so the form, the IPC layer and the repository all
 * validate against one definition.
 */

import { z } from 'zod';

export const itemUnitSchema = z.object({
  nameAr: z.string().min(1),
  factor: z.number().int().positive(),
  /** Piastres. */
  salePrice: z.number().int().nonnegative(),
  isBase: z.boolean(),
  isDefaultSale: z.boolean().optional(),
  allowSale: z.boolean().optional(),
});

export const itemInputSchema = z.object({
  itemTypeId: z.number().int().nullable().optional(),
  nameAr: z.string().min(1),
  nameEn: z.string().nullable().optional(),
  internationalCode: z.string().nullable().optional(),
  origin: z.enum(['local', 'imported']).optional(),
  manufacturerId: z.number().int().nullable().optional(),
  itemNature: z.string().nullable().optional(),
  scientificName: z.string().nullable().optional(),
  mainIngredientId: z.number().int().nullable().optional(),
  mainIngredientPct: z.number().nullable().optional(),
  scheduleClass: z.enum(['none', 'table1', 'table2', 'table3']).optional(),
  storageCondition: z.enum(['room', 'fridge', 'freezer']).optional(),
  noExpiry: z.boolean().optional(),
  requiresPrescription: z.boolean().optional(),
  shelfLocation: z.string().nullable().optional(),
  /** Piastres. The EDA price is the legal maximum sale price. */
  publicPrice: z.number().int().nonnegative().nullable().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().nullable().optional(),
  barcodes: z.array(z.string().min(1)).optional(),
  units: z.array(itemUnitSchema).optional(),
  scientificGroupIds: z.array(z.number().int()).optional(),
});

export type ItemInput = z.infer<typeof itemInputSchema>;
export type ItemUnitInput = z.infer<typeof itemUnitSchema>;

export interface ItemListRow {
  id: number;
  code: number;
  nameAr: string;
  nameEn: string | null;
  publicPrice: number | null;
  shelfLocation: string | null;
  scheduleClass: string;
  storageCondition: string;
  noExpiry: number;
  isActive: number;
}

export interface ImportPreview {
  filePath: string;
  headers: string[];
  /** Suggested column mapping; the user confirms or overrides it. */
  mapping: Record<string, number>;
  totalRows: number;
  acceptedCount: number;
  /** First rows that would be imported, for eyeballing the mapping. */
  sample: Array<Record<string, string | number | null>>;
  rejected: Array<{ rowNumber: number; reason: string; raw: string[] }>;
}

export interface ImportResult {
  inserted: number;
  rejectedCount: number;
  elapsedMs: number;
}

export interface ImportProgressEvent {
  done: number;
  total: number;
}

export interface ItemDetail extends ItemListRow {
  barcodes: string[];
  units: Array<{
    id: number;
    nameAr: string;
    factor: number;
    salePrice: number;
    isBase: number;
    isDefaultSale: number;
    allowSale: number;
  }>;
}
