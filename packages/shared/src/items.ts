/**
 * Item contracts shared across the process boundary.
 *
 * zod schemas live here so the form, the IPC layer and the repository all
 * validate against one definition.
 */

import { z } from 'zod';

export const itemUnitSchema = z.object({
  /** Set only for a unit that already exists in item_units — tells
      updateItem to UPDATE that row in place instead of inserting a new
      one. Omitted for a unit the user just added in this edit. */
  id: z.number().int().positive().optional(),
  nameAr: z.string().trim().min(1).max(40),
  factor: z.number().int().positive().max(100000),
  /** Piastres. */
  salePrice: z.number().int().nonnegative(),
  isBase: z.boolean(),
  isDefaultSale: z.boolean().optional(),
  allowSale: z.boolean().optional(),
});

export const itemInputSchema = z.object({
  itemTypeId: z.number().int().nullable().optional(),
  nameAr: z.string().trim().min(1).max(300),
  nameEn: z.string().nullable().optional(),
  internationalCode: z.string().nullable().optional(),
  origin: z.enum(['local', 'imported']).optional(),
  manufacturerId: z.number().int().nullable().optional(),
  itemNature: z.string().nullable().optional(),
  scientificName: z.string().nullable().optional(),
  mainIngredientId: z.number().int().nullable().optional(),
  mainIngredientPct: z.number().min(0).max(100).nullable().optional(),
  scheduleClass: z.enum(['none', 'table1', 'table2', 'table3']).optional(),
  storageCondition: z.enum(['room', 'fridge', 'freezer']).optional(),
  noExpiry: z.boolean().optional(),
  requiresPrescription: z.boolean().optional(),
  shelfLocation: z.string().nullable().optional(),
  /** Piastres. The EDA price is the legal maximum sale price. */
  publicPrice: z.number().int().nonnegative().nullable().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().nullable().optional(),
  barcodes: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
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
  /** Sellable stock in base units (item list and search only). */
  stockBase?: number;
  /** The largest unit (the box): factor and name, for showing stock. */
  boxFactor?: number;
  boxName?: string | null;
  baseName?: string | null;
}

/** add = new items only · update = existing items only · upsert = both. */
export type ImportMode = 'add' | 'update' | 'upsert';

export interface ImportPreview {
  filePath: string;
  mode: ImportMode;
  /** Valid rows that would create a new item. */
  newCount: number;
  /** Valid rows that match an existing item (by name or barcode). */
  existingCount: number;
  /** Valid rows the chosen mode leaves alone. */
  skippedCount: number;
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
  updated: number;
  /** Rows the chosen mode left alone. */
  skipped: number;
  /** Updated items whose unit layout differs from the file — their prices were kept. */
  unitsMismatch: number;
  rejectedCount: number;
  elapsedMs: number;
}

export interface ImportProgressEvent {
  done: number;
  total: number;
}

export interface ItemDetail extends ItemListRow {
  itemTypeId: number | null;
  manufacturerId: number | null;
  mainIngredientId: number | null;
  internationalCode: string | null;
  origin: string;
  itemNature: string | null;
  scientificName: string | null;
  mainIngredientPct: number | null;
  requiresPrescription: number;
  minStock: number;
  maxStock: number | null;
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
