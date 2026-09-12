/**
 * Item repository.
 *
 * Every write populates the *_norm columns via packages/core (rule 11), and
 * every multi-table write runs in one transaction so an item can never exist
 * without its barcodes or units.
 */

import { normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';

export interface ItemUnitInput {
  nameAr: string;
  factor: number;
  salePrice: number;
  isBase: boolean;
  isDefaultSale?: boolean;
  allowSale?: boolean;
}

export interface ItemInput {
  itemTypeId?: number | null;
  nameAr: string;
  nameEn?: string | null;
  internationalCode?: string | null;
  origin?: 'local' | 'imported';
  manufacturerId?: number | null;
  itemNature?: string | null;
  scientificName?: string | null;
  mainIngredientId?: number | null;
  mainIngredientPct?: number | null;
  scheduleClass?: 'none' | 'table1' | 'table2' | 'table3';
  storageCondition?: 'room' | 'fridge' | 'freezer';
  noExpiry?: boolean;
  requiresPrescription?: boolean;
  shelfLocation?: string | null;
  publicPrice?: number | null;
  minStock?: number;
  maxStock?: number | null;
  barcodes?: string[];
  units?: ItemUnitInput[];
  scientificGroupIds?: number[];
}

export interface ItemRow {
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

/**
 * Take the next value from a named sequence.
 * Must be called inside the caller's transaction so the number is never
 * consumed by a row that then fails to insert.
 */
export function nextSequence(db: Db, name: string): number {
  const row = db
    .prepare('SELECT next_value FROM sequences WHERE name = ?')
    .get(name) as { next_value: number } | undefined;

  if (!row) throw new Error(`Unknown sequence: ${name}`);

  db.prepare('UPDATE sequences SET next_value = next_value + 1 WHERE name = ?').run(name);
  return row.next_value;
}

export function createItem(db: Db, input: ItemInput): number {
  const run = db.transaction((data: ItemInput) => {
    const code = nextSequence(db, 'item_code');

    const ingredientNorm = data.scientificName ? normalizeName(data.scientificName) : null;

    const result = db
      .prepare(
        `INSERT INTO items (
           code, item_type_id, name_ar, name_en, name_ar_norm, name_en_norm,
           international_code, origin, manufacturer_id, item_nature,
           scientific_name, main_ingredient_id, main_ingredient_pct, ingredient_norm,
           schedule_class, storage_condition, no_expiry, requires_prescription,
           shelf_location, public_price, min_stock, max_stock
         ) VALUES (
           @code, @itemTypeId, @nameAr, @nameEn, @nameArNorm, @nameEnNorm,
           @internationalCode, @origin, @manufacturerId, @itemNature,
           @scientificName, @mainIngredientId, @mainIngredientPct, @ingredientNorm,
           @scheduleClass, @storageCondition, @noExpiry, @requiresPrescription,
           @shelfLocation, @publicPrice, @minStock, @maxStock
         )`
      )
      .run({
        code,
        itemTypeId: data.itemTypeId ?? null,
        nameAr: data.nameAr,
        nameEn: data.nameEn ?? null,
        nameArNorm: normalizeName(data.nameAr),
        nameEnNorm: data.nameEn ? normalizeName(data.nameEn) : null,
        internationalCode: data.internationalCode ?? null,
        origin: data.origin ?? 'local',
        manufacturerId: data.manufacturerId ?? null,
        itemNature: data.itemNature ?? null,
        scientificName: data.scientificName ?? null,
        mainIngredientId: data.mainIngredientId ?? null,
        mainIngredientPct: data.mainIngredientPct ?? null,
        ingredientNorm,
        scheduleClass: data.scheduleClass ?? 'none',
        storageCondition: data.storageCondition ?? 'room',
        noExpiry: data.noExpiry ? 1 : 0,
        requiresPrescription: data.requiresPrescription ? 1 : 0,
        shelfLocation: data.shelfLocation ?? null,
        publicPrice: data.publicPrice ?? null,
        minStock: data.minStock ?? 0,
        maxStock: data.maxStock ?? null,
      });

    const itemId = Number(result.lastInsertRowid);

    replaceBarcodes(db, itemId, data.barcodes ?? []);
    replaceUnits(db, itemId, data.units ?? []);
    replaceScientificGroups(db, itemId, data.scientificGroupIds ?? []);

    return itemId;
  });

  return run(input);
}

export function updateItem(db: Db, id: number, input: ItemInput): void {
  const run = db.transaction((data: ItemInput) => {
    db.prepare(
      `UPDATE items SET
         item_type_id = @itemTypeId,
         name_ar = @nameAr, name_en = @nameEn,
         name_ar_norm = @nameArNorm, name_en_norm = @nameEnNorm,
         international_code = @internationalCode, origin = @origin,
         manufacturer_id = @manufacturerId, item_nature = @itemNature,
         scientific_name = @scientificName, main_ingredient_id = @mainIngredientId,
         main_ingredient_pct = @mainIngredientPct, ingredient_norm = @ingredientNorm,
         schedule_class = @scheduleClass, storage_condition = @storageCondition,
         no_expiry = @noExpiry, requires_prescription = @requiresPrescription,
         shelf_location = @shelfLocation, public_price = @publicPrice,
         min_stock = @minStock, max_stock = @maxStock,
         updated_at = datetime('now')
       WHERE id = @id`
    ).run({
      id,
      itemTypeId: data.itemTypeId ?? null,
      nameAr: data.nameAr,
      nameEn: data.nameEn ?? null,
      nameArNorm: normalizeName(data.nameAr),
      nameEnNorm: data.nameEn ? normalizeName(data.nameEn) : null,
      internationalCode: data.internationalCode ?? null,
      origin: data.origin ?? 'local',
      manufacturerId: data.manufacturerId ?? null,
      itemNature: data.itemNature ?? null,
      scientificName: data.scientificName ?? null,
      mainIngredientId: data.mainIngredientId ?? null,
      mainIngredientPct: data.mainIngredientPct ?? null,
      ingredientNorm: data.scientificName ? normalizeName(data.scientificName) : null,
      scheduleClass: data.scheduleClass ?? 'none',
      storageCondition: data.storageCondition ?? 'room',
      noExpiry: data.noExpiry ? 1 : 0,
      requiresPrescription: data.requiresPrescription ? 1 : 0,
      shelfLocation: data.shelfLocation ?? null,
      publicPrice: data.publicPrice ?? null,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? null,
    });

    if (data.barcodes) replaceBarcodes(db, id, data.barcodes);
    if (data.units) replaceUnits(db, id, data.units);
    if (data.scientificGroupIds) replaceScientificGroups(db, id, data.scientificGroupIds);
  });

  run(input);
}

function replaceBarcodes(db: Db, itemId: number, barcodes: string[]): void {
  db.prepare('DELETE FROM item_barcodes WHERE item_id = ?').run(itemId);
  const insert = db.prepare(
    'INSERT INTO item_barcodes (item_id, barcode, is_primary) VALUES (?, ?, ?)'
  );
  barcodes.forEach((barcode, index) => {
    // Barcodes are text, always. Parsed as a number, 04567 becomes 4567 and
    // never matches again (hardware doc §1.5).
    insert.run(itemId, String(barcode).trim(), index === 0 ? 1 : 0);
  });
}

function replaceUnits(db: Db, itemId: number, units: ItemUnitInput[]): void {
  db.prepare('DELETE FROM item_units WHERE item_id = ?').run(itemId);
  const insert = db.prepare(
    `INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base, is_default_sale, allow_sale)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const u of units) {
    insert.run(
      itemId,
      u.nameAr,
      u.factor,
      u.salePrice,
      u.isBase ? 1 : 0,
      u.isDefaultSale ? 1 : 0,
      u.allowSale === false ? 0 : 1
    );
  }
}

function replaceScientificGroups(db: Db, itemId: number, groupIds: number[]): void {
  db.prepare('DELETE FROM item_scientific_groups WHERE item_id = ?').run(itemId);
  const insert = db.prepare(
    'INSERT INTO item_scientific_groups (item_id, group_id) VALUES (?, ?)'
  );
  for (const gid of groupIds) insert.run(itemId, gid);
}

export function getItem(db: Db, id: number): ItemRow | undefined {
  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, is_active AS isActive
       FROM items WHERE id = ?`
    )
    .get(id) as ItemRow | undefined;
}

export function getItemBarcodes(db: Db, itemId: number): string[] {
  const rows = db
    .prepare('SELECT barcode FROM item_barcodes WHERE item_id = ? ORDER BY is_primary DESC, id')
    .all(itemId) as { barcode: string }[];
  return rows.map((r) => r.barcode);
}

export function getItemUnits(db: Db, itemId: number) {
  return db
    .prepare(
      `SELECT id, name_ar AS nameAr, factor, sale_price AS salePrice,
              is_base AS isBase, is_default_sale AS isDefaultSale, allow_sale AS allowSale
       FROM item_units WHERE item_id = ? ORDER BY factor`
    )
    .all(itemId);
}

export function findByBarcode(db: Db, barcode: string): ItemRow | undefined {
  return db
    .prepare(
      `SELECT i.id, i.code, i.name_ar AS nameAr, i.name_en AS nameEn,
              i.public_price AS publicPrice, i.shelf_location AS shelfLocation,
              i.schedule_class AS scheduleClass, i.storage_condition AS storageCondition,
              i.no_expiry AS noExpiry, i.is_active AS isActive
       FROM items i
       JOIN item_barcodes b ON b.item_id = i.id
       WHERE b.barcode = ?`
    )
    .get(String(barcode).trim()) as ItemRow | undefined;
}

/**
 * Search by normalized Arabic name, English name, or active ingredient.
 *
 * The POS does NOT use this per keystroke — blueprint §2.6 requires the item
 * index in memory, filtered in JS. This backs the item list screen and the
 * initial index load.
 */
export function searchItems(db: Db, query: string, limit = 50): ItemRow[] {
  const norm = normalizeName(query);
  if (!norm) return [];

  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, is_active AS isActive
       FROM items
       WHERE is_active = 1
         AND (name_ar_norm LIKE @like OR name_en_norm LIKE @like OR ingredient_norm LIKE @like)
       ORDER BY
         CASE WHEN name_ar_norm LIKE @prefix THEN 0 ELSE 1 END,
         name_ar
       LIMIT @limit`
    )
    .all({ like: `%${norm}%`, prefix: `${norm}%`, limit }) as ItemRow[];
}

export function listItems(db: Db, opts: { limit?: number; offset?: number } = {}): ItemRow[] {
  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, is_active AS isActive
       FROM items WHERE is_active = 1
       ORDER BY name_ar
       LIMIT ? OFFSET ?`
    )
    .all(opts.limit ?? 100, opts.offset ?? 0) as ItemRow[];
}

export function countItems(db: Db): number {
  const row = db.prepare('SELECT count(*) AS c FROM items WHERE is_active = 1').get() as {
    c: number;
  };
  return row.c;
}

/** Nothing is deleted (rule 9) — deactivate instead. */
export function deactivateItem(db: Db, id: number): void {
  db.prepare("UPDATE items SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
}
