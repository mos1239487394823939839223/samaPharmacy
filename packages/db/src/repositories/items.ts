/**
 * Item repository.
 *
 * Every write populates the *_norm columns via packages/core (rule 11), and
 * every multi-table write runs in one transaction so an item can never exist
 * without its barcodes or units.
 */

import { boxFactorOf, DomainError, maxUnitPrice, normalizeName, repriceUnits, toAsciiDigits, validateUnitSet } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';

export interface ItemUnitInput {
  /** Present for a unit that already exists in item_units; absent for a
      unit newly added in this edit. See replaceUnits. */
  id?: number;
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
  /** Sellable stock in base units (list/search only). */
  stockBase?: number;
  /** The largest unit (the box): its factor and name, for showing stock. */
  boxFactor?: number;
  boxName?: string | null;
  baseName?: string | null;
}

/** Stock and box unit for list rows — cheap per row (indexed by item_id). */
const STOCK_COLUMNS = `,
              (SELECT COALESCE(SUM(b.qty_on_hand), 0) FROM batches b WHERE b.item_id = items.id AND b.is_quarantined = 0) AS stockBase,
              (SELECT MAX(u.factor) FROM item_units u WHERE u.item_id = items.id) AS boxFactor,
              (SELECT u.name_ar FROM item_units u WHERE u.item_id = items.id ORDER BY u.factor DESC LIMIT 1) AS boxName,
              (SELECT u.name_ar FROM item_units u WHERE u.item_id = items.id ORDER BY u.factor ASC LIMIT 1) AS baseName`;

/**
 * Full row shape for a single item (the "اضافة/تعديل صنف" form) — the
 * fields ItemRow omits because list/search screens never display them, but
 * that getItem must return so ItemForm can seed its inputs on edit. Without
 * these, the form's state for internationalCode/origin/itemNature/
 * scientificName/mainIngredientPct/requiresPrescription/minStock/maxStock
 * always started blank on edit and the next save silently overwrote the
 * real stored value with null/default — data entered once, then wiped by
 * editing anything else on the same item.
 */
export interface ItemDetailRow extends ItemRow {
  itemTypeId: number | null;
  manufacturerId: number | null;
  mainIngredientId: number | null;
  requiresPrescription: number;
  internationalCode: string | null;
  origin: string;
  itemNature: string | null;
  scientificName: string | null;
  mainIngredientPct: number | null;
  minStock: number;
  maxStock: number | null;
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

/**
 * Server-side item rules — the form checks the same things for an early
 * Arabic message, but this is the authority (the renderer is untrusted).
 *
 *   * a non-blank Arabic name;
 *   * exactly one base unit with factor 1, unique unit names (validateUnitSet);
 *   * BR-4 with decision D9: public_price is the price of the BOX (the
 *     largest unit), so each unit's sale price is capped at its share of it.
 */
function validateItemInput(data: ItemInput): void {
  if (!data.nameAr.trim()) {
    throw new DomainError('item.nameRequired', 'Item Arabic name is required');
  }
  if (data.units && data.units.length > 0) {
    const errors = validateUnitSet(
      data.units.map((u, i) => ({ id: u.id ?? -i, nameAr: u.nameAr.trim(), factor: u.factor, isBase: u.isBase }))
    );
    if (errors.length > 0) throw new DomainError('item.invalidUnits', errors.join('; '), { detail: errors[0] ?? '' });
    if (data.publicPrice != null) {
      const box = boxFactorOf(data.units);
      for (const u of data.units) {
        const cap = maxUnitPrice(data.publicPrice, box, u.factor);
        if (u.salePrice > cap) {
          throw new DomainError(
            'item.priceAbovePublic',
            `Unit "${u.nameAr}" price ${u.salePrice} exceeds its share of the public price (${cap})`,
            { unit: u.nameAr, cap }
          );
        }
      }
    }
  }
}

export function createItem(db: Db, input: ItemInput): number {
  validateItemInput(input);
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
           shelf_location, public_price, min_stock, max_stock, created_at, updated_at
         ) VALUES (
           @code, @itemTypeId, @nameAr, @nameEn, @nameArNorm, @nameEnNorm,
           @internationalCode, @origin, @manufacturerId, @itemNature,
           @scientificName, @mainIngredientId, @mainIngredientPct, @ingredientNorm,
           @scheduleClass, @storageCondition, @noExpiry, @requiresPrescription,
           @shelfLocation, @publicPrice, @minStock, @maxStock, ${NOW}, ${NOW}
         )`
      )
      .run({
        code,
        itemTypeId: data.itemTypeId ?? null,
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn ?? null,
        nameArNorm: normalizeName(data.nameAr),
        nameEnNorm: data.nameEn ? normalizeName(data.nameEn) : null,
        internationalCode: cleanCode(data.internationalCode),
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
    const intl = cleanCode(data.internationalCode);
    if (intl) assertCodeFree(db, intl, itemId, 'international');

    replaceBarcodes(db, itemId, data.barcodes ?? []);
    replaceUnits(db, itemId, data.units ?? []);
    replaceScientificGroups(db, itemId, data.scientificGroupIds ?? []);

    return itemId;
  });

  return run(input);
}

export function updateItem(db: Db, id: number, input: ItemInput, userId = 1): void {
  const run = db.transaction((patch: ItemInput) => {
    const existing = getItem(db, id);
    if (!existing) throw new DomainError('item.notFound', `Item ${id} not found`, { id });
    const previousCode = cleanCode(existing.internationalCode);

    // A field the caller did not send keeps its stored value. Before this,
    // every omitted field was written as null/default — editing an item's
    // name wiped its manufacturer, type and active ingredient, which the
    // form never loads.
    const keep = <K extends keyof ItemInput>(key: K, stored: ItemInput[K]): ItemInput[K] =>
      patch[key] === undefined ? stored : patch[key];
    const data: ItemInput = {
      ...patch,
      itemTypeId: keep('itemTypeId', existing.itemTypeId),
      nameEn: keep('nameEn', existing.nameEn),
      internationalCode: keep('internationalCode', existing.internationalCode),
      origin: keep('origin', existing.origin as ItemInput['origin']),
      manufacturerId: keep('manufacturerId', existing.manufacturerId),
      itemNature: keep('itemNature', existing.itemNature),
      scientificName: keep('scientificName', existing.scientificName),
      mainIngredientId: keep('mainIngredientId', existing.mainIngredientId),
      mainIngredientPct: keep('mainIngredientPct', existing.mainIngredientPct),
      scheduleClass: keep('scheduleClass', existing.scheduleClass as ItemInput['scheduleClass']),
      storageCondition: keep('storageCondition', existing.storageCondition as ItemInput['storageCondition']),
      noExpiry: keep('noExpiry', Boolean(existing.noExpiry)),
      requiresPrescription: keep('requiresPrescription', Boolean(existing.requiresPrescription)),
      shelfLocation: keep('shelfLocation', existing.shelfLocation),
      publicPrice: keep('publicPrice', existing.publicPrice),
      minStock: keep('minStock', existing.minStock),
      maxStock: keep('maxStock', existing.maxStock),
    };
    // Price rules are checked against the full unit set the item will have.
    validateItemInput({ ...data, units: data.units ?? currentUnitsAsInput(db, id) });

    if (data.publicPrice !== existing.publicPrice && data.publicPrice != null) {
      db.prepare(
        `INSERT INTO price_history (item_id, old_price, new_price, changed_at, changed_by, source)
         VALUES (?, ?, ?, ${NOW}, ?, 'manual')`
      ).run(id, existing.publicPrice, data.publicPrice, userId);
    }

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
         updated_at = ${NOW}
       WHERE id = @id`
    ).run({
      id,
      itemTypeId: data.itemTypeId ?? null,
      nameAr: data.nameAr,
      nameEn: data.nameEn ?? null,
      nameArNorm: normalizeName(data.nameAr),
      nameEnNorm: data.nameEn ? normalizeName(data.nameEn) : null,
      internationalCode: cleanCode(data.internationalCode),
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

    // Only a changed code is checked: data saved before the uniqueness rule
    // may already share a code, and that must not block editing the price.
    const intl = cleanCode(data.internationalCode);
    if (intl && intl !== previousCode) assertCodeFree(db, intl, id, 'international');
    if (data.barcodes) replaceBarcodes(db, id, data.barcodes);
    if (data.units) replaceUnits(db, id, data.units);
    if (data.scientificGroupIds) replaceScientificGroups(db, id, data.scientificGroupIds);
  });

  run(input);
}

/** International code as stored: ASCII digits, no spaces; null when blank. */
function cleanCode(code: string | null | undefined): string | null {
  const c = toAsciiDigits(code ?? '').replace(/\s+/g, '');
  return c || null;
}

/**
 * A code (barcode or international code) may identify only one active item —
 * otherwise a scan at the till would pick one of them arbitrarily.
 */
function assertCodeFree(db: Db, code: string, itemId: number, field: 'barcode' | 'international' = 'barcode'): void {
  const taken = db
    .prepare(
      `SELECT i.name_ar AS nameAr FROM items i
       WHERE i.id != @itemId AND i.is_active = 1
         AND (i.international_code = @code OR i.id IN (SELECT item_id FROM item_barcodes WHERE barcode = @code))
       LIMIT 1`
    )
    .get({ code, itemId }) as { nameAr: string } | undefined;
  if (taken) {
    throw new DomainError(
      field === 'international' ? 'item.internationalCodeTaken' : 'item.barcodeTaken',
      `Code ${code} already belongs to another item`,
      { barcode: code, item: taken.nameAr }
    );
  }
}

function replaceBarcodes(db: Db, itemId: number, barcodes: string[]): void {
  // Barcodes are text, always. Parsed as a number, 04567 becomes 4567 and
  // never matches again (hardware doc §1.5).
  const clean = [...new Set(barcodes.map((b) => String(b).trim()).filter(Boolean))];
  const owner = db.prepare('SELECT b.item_id AS itemId, i.name_ar AS nameAr FROM item_barcodes b JOIN items i ON i.id = b.item_id WHERE b.barcode = ? AND b.item_id != ?');
  for (const barcode of clean) {
    assertCodeFree(db, barcode, itemId);
    const taken = owner.get(barcode, itemId) as { itemId: number; nameAr: string } | undefined;
    if (taken) {
      throw new DomainError('item.barcodeTaken', `Barcode ${barcode} already belongs to item ${taken.itemId}`, {
        barcode,
        item: taken.nameAr,
      });
    }
  }
  db.prepare('DELETE FROM item_barcodes WHERE item_id = ?').run(itemId);
  const insert = db.prepare(
    'INSERT INTO item_barcodes (item_id, barcode, is_primary) VALUES (?, ?, ?)'
  );
  clean.forEach((barcode, index) => insert.run(itemId, barcode, index === 0 ? 1 : 0));
}

function currentUnitsAsInput(db: Db, itemId: number): ItemUnitInput[] {
  return (getItemUnits(db, itemId) as Array<{ id: number; nameAr: string; factor: number; salePrice: number; isBase: number; allowSale: number }>)
    .filter((u) => u.allowSale)
    .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice, isBase: Boolean(u.isBase) }));
}

/**
 * Reconciles item_units against the submitted set instead of deleting and
 * reinserting every row (rule 9: nothing is deleted). sales_invoice_lines,
 * purchase_invoice_lines, sales_return_lines and purchase_return_lines all
 * hold a NOT NULL foreign key to item_units(id) — a delete-all pass fails
 * with "FOREIGN KEY constraint failed" the moment an item has ever been
 * sold or purchased, which is most items past their first day. Existing
 * units (identified by id) are updated in place, so their id — and every
 * historical line referencing it — survives. A unit the user removed from
 * the form is never hard-deleted; it's retired via allow_sale = 0 so it
 * can no longer be sold but its referencing rows stay valid.
 */
function replaceUnits(db: Db, itemId: number, units: ItemUnitInput[]): void {
  const update = db.prepare(
    `UPDATE item_units
     SET name_ar = ?, factor = ?, sale_price = ?, is_base = ?, is_default_sale = ?, allow_sale = ?
     WHERE id = ? AND item_id = ?`
  );
  const insert = db.prepare(
    `INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base, is_default_sale, allow_sale)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // A unit removed earlier and now added back under the same name reuses its
  // old row (UNIQUE(item_id, name_ar) would otherwise reject the insert).
  const byName = db.prepare('SELECT id FROM item_units WHERE item_id = ? AND name_ar = ?');
  const keptIds: number[] = [];

  for (const u of units) {
    const allowSale = u.allowSale === false ? 0 : 1;
    const name = u.nameAr.trim();
    const id = u.id ?? (byName.get(itemId, name) as { id: number } | undefined)?.id;
    if (id != null) {
      update.run(name, u.factor, u.salePrice, u.isBase ? 1 : 0, u.isDefaultSale ? 1 : 0, allowSale, id, itemId);
      keptIds.push(id);
    } else {
      keptIds.push(Number(insert.run(itemId, name, u.factor, u.salePrice, u.isBase ? 1 : 0, u.isDefaultSale ? 1 : 0, allowSale).lastInsertRowid));
    }
  }

  db.prepare(
    `UPDATE item_units SET allow_sale = 0, is_default_sale = 0
     WHERE item_id = ? AND id NOT IN (${keptIds.map(() => '?').join(',') || 'NULL'})`
  ).run(itemId, ...keptIds);
}

function replaceScientificGroups(db: Db, itemId: number, groupIds: number[]): void {
  db.prepare('DELETE FROM item_scientific_groups WHERE item_id = ?').run(itemId);
  const insert = db.prepare(
    'INSERT INTO item_scientific_groups (item_id, group_id) VALUES (?, ?)'
  );
  for (const gid of groupIds) insert.run(itemId, gid);
}

export function getItem(db: Db, id: number): ItemDetailRow | undefined {
  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              item_type_id AS itemTypeId, manufacturer_id AS manufacturerId,
              main_ingredient_id AS mainIngredientId,
              international_code AS internationalCode, origin,
              item_nature AS itemNature, scientific_name AS scientificName,
              main_ingredient_pct AS mainIngredientPct,
              requires_prescription AS requiresPrescription,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, min_stock AS minStock, max_stock AS maxStock,
              is_active AS isActive
       FROM items WHERE id = ?`
    )
    .get(id) as ItemDetailRow | undefined;
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
       WHERE i.is_active = 1
         AND (i.id IN (SELECT item_id FROM item_barcodes WHERE barcode = @code) OR i.international_code = @code)
       LIMIT 1`
    )
    // The international code (the EAN printed on the box) identifies the item
    // exactly like a barcode-table entry — scanning either finds it.
    .get({ code: toAsciiDigits(String(barcode)).trim() }) as ItemRow | undefined;
}

/**
 * Search by normalized Arabic name, English name, active ingredient, or an
 * exact barcode match.
 *
 * The barcode branch exists because this function backs every free-typed
 * item search box in the app (item list, purchase-invoice lines, sales
 * return lookups, ...) — not just the POS, which resolves barcodes
 * separately via findByBarcode on a genuine scan event. A pharmacist typing
 * or slow-scanning a barcode into one of those plain search fields got no
 * results at all before this: name_ar_norm/name_en_norm/ingredient_norm
 * never contain digits, so a 13-digit EAN could never match any of them,
 * even though the exact same code was saved correctly on the item. Matched
 * as an exact, untransformed string (never LIKE) — barcodes are scanned or
 * typed in full, and a partial numeric match against thousands of
 * digit-strings would false-positive constantly.
 *
 * The POS does NOT use this per keystroke — blueprint §2.6 requires the item
 * index in memory, filtered in JS. This backs the item list screen and the
 * initial index load.
 */
export function searchItems(db: Db, query: string, limit = 50): ItemRow[] {
  const norm = normalizeName(query);
  const rawBarcode = toAsciiDigits(query).trim();
  if (!norm && !rawBarcode) return [];

  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, is_active AS isActive${STOCK_COLUMNS}
       FROM items
       WHERE is_active = 1
         AND (
           (@norm != '' AND (name_ar_norm LIKE @like OR name_en_norm LIKE @like OR ingredient_norm LIKE @like))
           OR id IN (SELECT item_id FROM item_barcodes WHERE barcode = @rawBarcode)
           OR international_code = @rawBarcode
           OR CAST(code AS TEXT) = @rawBarcode
         )
       ORDER BY
         CASE WHEN id IN (SELECT item_id FROM item_barcodes WHERE barcode = @rawBarcode) OR international_code = @rawBarcode OR CAST(code AS TEXT) = @rawBarcode THEN 0
              WHEN name_ar_norm LIKE @prefix THEN 1
              ELSE 2 END,
         name_ar
       LIMIT @limit`
    )
    .all({ norm, like: `%${norm}%`, prefix: `${norm}%`, rawBarcode, limit }) as ItemRow[];
}

export function listItems(db: Db, opts: { limit?: number; offset?: number } = {}): ItemRow[] {
  return db
    .prepare(
      `SELECT id, code, name_ar AS nameAr, name_en AS nameEn,
              public_price AS publicPrice, shelf_location AS shelfLocation,
              schedule_class AS scheduleClass, storage_condition AS storageCondition,
              no_expiry AS noExpiry, is_active AS isActive${STOCK_COLUMNS}
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
  db.prepare(`UPDATE items SET is_active = 0, updated_at = ${NOW} WHERE id = ?`).run(id);
}

/**
 * Sets one unit's selling price and carries the change to the item's other
 * units (same ratio) and to its public price (the box). Every screen reads
 * item_units.sale_price, so the POS, the item card and the stock valuation
 * all follow. Runs inside the caller's transaction when there is one.
 * Returns true when anything changed.
 */
export function applyUnitSalePrice(
  db: Db,
  itemId: number,
  unitId: number,
  newPrice: number,
  userId: number,
  source: 'manual' | 'purchase' = 'manual'
): boolean {
  const run = db.transaction(() => {
    const units = db
      .prepare('SELECT id, factor, sale_price AS salePrice FROM item_units WHERE item_id = ?')
      .all(itemId) as Array<{ id: number; factor: number; salePrice: number }>;
    if (!units.some((u) => u.id === unitId)) {
      throw new DomainError('purchase.unitInvalid', `Unit ${unitId} does not belong to item ${itemId}`);
    }
    const changes = repriceUnits(units, unitId, newPrice);
    if (changes.length === 0) return false;

    const update = db.prepare('UPDATE item_units SET sale_price = ? WHERE id = ?');
    for (const c of changes) update.run(c.salePrice, c.id);

    // The box price is the public price (D9) — keep it in step, or BR-4
    // would cap the new unit prices at the old box price.
    const box = boxFactorOf(units);
    const boxUnit = units.find((u) => u.factor === box)!;
    const boxPrice = changes.find((c) => c.id === boxUnit.id)?.salePrice ?? boxUnit.salePrice;
    const item = db.prepare('SELECT public_price AS p FROM items WHERE id = ?').get(itemId) as { p: number | null };
    if (item.p !== boxPrice) {
      db.prepare(
        `INSERT INTO price_history (item_id, old_price, new_price, changed_at, changed_by, source)
         VALUES (?, ?, ?, ${NOW}, ?, ?)`
      ).run(itemId, item.p, boxPrice, userId, source);
    }
    db.prepare(`UPDATE items SET public_price = ?, updated_at = ${NOW} WHERE id = ?`).run(boxPrice, itemId);
    return true;
  });
  return run();
}
