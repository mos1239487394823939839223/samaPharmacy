/**
 * Bulk item import.
 *
 * 35,000 rows in under 60 seconds means: one transaction, prepared statements
 * reused across rows, and progress reported over the message port so the
 * renderer can show a bar that actually moves.
 *
 * Running this outside a transaction would fsync per row and take minutes.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DomainError, normalizeName, type ParsedRow } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';

export interface SheetData {
  headers: string[];
  rows: string[][];
}

/**
 * CSV files exported by an Arabic Excel on Windows are usually Windows-1256
 * (or UTF-16 with a BOM), not UTF-8 — read as UTF-8 every Arabic name became
 * mojibake. UTF-8 is tried first and kept when it decodes cleanly.
 */
function decodeText(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1256').decode(buf);
  }
}

/** Read a CSV or XLSX file into headers plus raw string rows. */
export function readSheet(filePath: string): SheetData {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.csv' || ext === '.txt') {
    const text = decodeText(readFileSync(filePath));
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    const all = parsed.data;
    const headers = (all[0] ?? []).map((h) => String(h ?? ''));
    return { headers, rows: all.slice(1).map((r) => r.map((c) => String(c ?? ''))) };
  }

  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.readFile(filePath, { cellDates: false, raw: false });
    const first = wb.SheetNames[0];
    if (!first) return { headers: [], rows: [] };
    const sheet = wb.Sheets[first]!;
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
    const headers = (grid[0] ?? []).map((h) => String(h ?? ''));
    return { headers, rows: grid.slice(1).map((r) => r.map((c) => String(c ?? ''))) };
  }

  throw new DomainError('import.unsupportedFile', `Unsupported file type: ${ext}`);
}

/** Names and barcodes already stored, for cross-file duplicate detection. */
export function existingKeys(db: Db): { names: Set<string>; barcodes: Set<string> } {
  const names = new Set(
    // Deactivated items do not block a name: they no longer appear anywhere.
    (db.prepare('SELECT name_ar_norm AS n FROM items WHERE is_active = 1').all() as { n: string }[]).map((r) => r.n)
  );
  const barcodes = new Set(
    (db.prepare('SELECT barcode AS b FROM item_barcodes').all() as { b: string }[]).map(
      (r) => r.b
    )
  );
  return { names, barcodes };
}

/** Name of the base unit created for a multi-unit imported item. */
const BASE_UNIT_NAME = 'وحدة';

export interface ImportProgress {
  done: number;
  total: number;
}

export interface ImportOutcome {
  inserted: number;
  elapsedMs: number;
}

/**
 * Insert validated rows. All-or-nothing: a failure part-way rolls the whole
 * import back rather than leaving the catalogue half-populated.
 */
export function bulkInsertItems(
  db: Db,
  rows: ParsedRow[],
  onProgress?: (p: ImportProgress) => void
): ImportOutcome {
  const started = Date.now();

  const insertItem = db.prepare(
    `INSERT INTO items (
       code, name_ar, name_en, name_ar_norm, name_en_norm,
       scientific_name, ingredient_norm, shelf_location, public_price, min_stock,
       created_at, updated_at
     ) VALUES (
       @code, @nameAr, @nameEn, @nameArNorm, @nameEnNorm,
       @scientificName, @ingredientNorm, @shelfLocation, @publicPrice, @minStock,
       ${NOW}, ${NOW}
     )`
  );

  const insertBarcode = db.prepare(
    'INSERT INTO item_barcodes (item_id, barcode, is_primary) VALUES (?, ?, 1)'
  );

  const insertUnit = db.prepare(
    `INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base, is_default_sale, allow_sale)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  );

  // Take the whole code block up front rather than one UPDATE per row.
  const seqRow = db.prepare('SELECT next_value FROM sequences WHERE name = ?').get('item_code') as
    | { next_value: number }
    | undefined;
  if (!seqRow) throw new Error('Unknown sequence: item_code');
  let nextCode = seqRow.next_value;

  const run = db.transaction((batch: ParsedRow[]) => {
    let done = 0;

    for (const row of batch) {
      const result = insertItem.run({
        code: nextCode++,
        nameAr: row.nameAr,
        nameEn: row.nameEn,
        nameArNorm: normalizeName(row.nameAr),
        nameEnNorm: row.nameEn ? normalizeName(row.nameEn) : null,
        scientificName: row.scientificName,
        ingredientNorm: row.scientificName ? normalizeName(row.scientificName) : null,
        shelfLocation: row.shelfLocation,
        publicPrice: row.publicPrice,
        minStock: row.minStock,
      });

      const itemId = Number(result.lastInsertRowid);

      if (row.barcode) insertBarcode.run(itemId, row.barcode);

      // A unit is created when the sheet supplies one, otherwise the item has
      // no sellable unit until it is edited. Better than inventing a factor.
      // The sheet's price is the box price (D9). A box of N needs a base
      // unit of 1 too (validateUnitSet requires exactly one), priced at its
      // share of the box — otherwise the item could never be sold by the
      // tablet and the unit set would be invalid.
      if (row.unitName) {
        const factor = row.unitFactor ?? 1;
        const boxPrice = row.salePrice ?? row.publicPrice ?? 0;
        insertUnit.run(itemId, row.unitName, factor, boxPrice, factor > 1 ? 0 : 1, 1);
        if (factor > 1) {
          insertUnit.run(itemId, row.baseUnitName || BASE_UNIT_NAME, 1, Math.ceil(boxPrice / factor), 1, 0);
        }
      }

      done += 1;
      // Report every 500 rows — often enough for a smooth bar, rare enough
      // that message passing does not dominate the import.
      if (onProgress && done % 500 === 0) onProgress({ done, total: batch.length });
    }

    db.prepare('UPDATE sequences SET next_value = ? WHERE name = ?').run(nextCode, 'item_code');
    return done;
  });

  const inserted = run(rows);
  onProgress?.({ done: inserted, total: rows.length });

  return { inserted, elapsedMs: Date.now() - started };
}

/**
 * All active items as a sheet in the importer's own column layout, so an
 * export opens in Excel and re-imports unchanged (on this machine or a new
 * one). Stock is added as an extra column (in the smallest unit); the
 * importer ignores it.
 */
export function exportItemsSheet(db: Db): { headers: string[]; rows: (string | number)[][] } {
  const items = db
    .prepare(
      `SELECT i.id, i.code, i.name_ar AS nameAr, i.name_en AS nameEn, i.scientific_name AS sci,
              i.public_price AS publicPrice, i.shelf_location AS shelf, i.min_stock AS minStock,
              (SELECT barcode FROM item_barcodes b WHERE b.item_id = i.id ORDER BY b.is_primary DESC, b.id LIMIT 1) AS barcode,
              (SELECT COALESCE(SUM(qty_on_hand), 0) FROM batches bt WHERE bt.item_id = i.id) AS stock
       FROM items i WHERE i.is_active = 1 ORDER BY i.name_ar`
    )
    .all() as Array<{
    id: number; code: number; nameAr: string; nameEn: string | null; sci: string | null; publicPrice: number | null;
    shelf: string | null; minStock: number; barcode: string | null; stock: number;
  }>;
  const units = db
    .prepare('SELECT item_id AS itemId, name_ar AS nameAr, factor, sale_price AS salePrice FROM item_units WHERE allow_sale = 1')
    .all() as Array<{ itemId: number; nameAr: string; factor: number; salePrice: number }>;
  const byItem = new Map<number, typeof units>();
  for (const u of units) {
    const list = byItem.get(u.itemId) ?? [];
    list.push(u);
    byItem.set(u.itemId, list);
  }
  const egp = (p: number | null) => (p == null ? '' : (p / 100).toFixed(2));

  const headers = ['اسم الصنف', 'الاسم الانجليزي', 'الاسم العلمي', 'الوحدة', 'المعامل', 'سعر الجمهور', 'الوحدة الصغرى',
    'باركود', 'مكان الصنف', 'الحد الأدنى', 'مؤشر الصنف', 'الرصيد (بالوحدة الصغرى)'];
  const rows = items.map((i) => {
    const list = (byItem.get(i.id) ?? []).sort((a, b) => b.factor - a.factor);
    const box = list[0];
    const base = list.find((u) => u.factor === 1);
    return [
      i.nameAr, i.nameEn ?? '', i.sci ?? '',
      box?.nameAr ?? '', box?.factor ?? '', egp(i.publicPrice ?? box?.salePrice ?? null),
      box && box.factor > 1 ? base?.nameAr ?? '' : '',
      i.barcode ?? '', i.shelf ?? '', i.minStock || '', i.code, i.stock,
    ];
  });
  return { headers, rows };
}

/** add = new items only · update = existing items only · upsert = both. */
export type ImportMode = 'add' | 'update' | 'upsert';

export interface ImportPlan {
  toInsert: ParsedRow[];
  toUpdate: Array<{ itemId: number; row: ParsedRow }>;
  /** Rows the chosen mode leaves alone (already exists in "add", not found in "update"). */
  skipped: number;
}

/**
 * Split validated rows into new and existing items. An existing item is the
 * active item with the same (normalized) Arabic name, or — when the name
 * changed — the active item that owns the row's barcode.
 */
export function planImport(db: Db, rows: ParsedRow[], mode: ImportMode): ImportPlan {
  const byName = new Map<string, number>();
  for (const r of db.prepare('SELECT id, name_ar_norm AS n FROM items WHERE is_active = 1').all() as { id: number; n: string }[]) {
    byName.set(r.n, r.id);
  }
  const byBarcode = new Map<string, number>();
  for (const r of db
    .prepare('SELECT b.barcode AS b, b.item_id AS id FROM item_barcodes b JOIN items i ON i.id = b.item_id WHERE i.is_active = 1')
    .all() as { b: string; id: number }[]) {
    byBarcode.set(r.b, r.id);
  }

  const plan: ImportPlan = { toInsert: [], toUpdate: [], skipped: 0 };
  for (const row of rows) {
    const itemId = byName.get(normalizeName(row.nameAr)) ?? (row.barcode ? byBarcode.get(row.barcode) : undefined);
    if (itemId !== undefined) {
      if (mode === 'add') plan.skipped += 1;
      else plan.toUpdate.push({ itemId, row });
    } else if (mode === 'update') {
      plan.skipped += 1;
    } else {
      plan.toInsert.push(row);
    }
  }
  return plan;
}

export interface UpdateOutcome {
  updated: number;
  /** Items whose unit layout in the file (e.g. a box of 20) differs from the item's — prices left as they were. */
  unitsMismatch: number;
}

/**
 * Update existing items from the file. Only what the file actually provides
 * changes; an empty cell never wipes a stored value. Units are never
 * restructured here (a different factor would corrupt the stock already
 * counted in base units) — only prices of the matching units are updated:
 * the box gets the public price, the base unit its share of it (D9).
 */
export function updateImportedItems(
  db: Db,
  rows: Array<{ itemId: number; row: ParsedRow }>,
  mapped: { minStock: boolean },
  onProgress?: (p: ImportProgress) => void
): UpdateOutcome {
  const item = db.prepare(
    `UPDATE items SET
       name_en = COALESCE(@nameEn, name_en),
       name_en_norm = COALESCE(@nameEnNorm, name_en_norm),
       scientific_name = COALESCE(@sci, scientific_name),
       ingredient_norm = COALESCE(@sciNorm, ingredient_norm),
       shelf_location = COALESCE(@shelf, shelf_location),
       public_price = COALESCE(@publicPrice, public_price),
       min_stock = CASE WHEN @setMin = 1 THEN @minStock ELSE min_stock END,
       updated_at = ${NOW}
     WHERE id = @id`
  );
  const units = db.prepare('SELECT id, factor FROM item_units WHERE item_id = ? AND allow_sale = 1 ORDER BY factor DESC');
  const setPrice = db.prepare('UPDATE item_units SET sale_price = ? WHERE id = ?');
  const barcodeOwner = db.prepare('SELECT item_id AS id FROM item_barcodes WHERE barcode = ?');
  const addBarcode = db.prepare('INSERT INTO item_barcodes (item_id, barcode, is_primary) VALUES (?, ?, 0)');

  let unitsMismatch = 0;
  const run = db.transaction(() => {
    let done = 0;
    for (const { itemId, row } of rows) {
      item.run({
        id: itemId,
        nameEn: row.nameEn,
        nameEnNorm: row.nameEn ? normalizeName(row.nameEn) : null,
        sci: row.scientificName,
        sciNorm: row.scientificName ? normalizeName(row.scientificName) : null,
        shelf: row.shelfLocation,
        publicPrice: row.publicPrice,
        setMin: mapped.minStock ? 1 : 0,
        minStock: row.minStock,
      });

      if (row.barcode && !barcodeOwner.get(row.barcode)) addBarcode.run(itemId, row.barcode);

      const boxPrice = row.salePrice ?? row.publicPrice;
      if (boxPrice != null) {
        const list = units.all(itemId) as { id: number; factor: number }[];
        const box = row.unitFactor ? list.find((u) => u.factor === row.unitFactor) : list[0];
        if (!box) {
          unitsMismatch += 1;
        } else {
          for (const u of list) {
            // Box at the full price, smaller units at their share (rounded up, like the item form).
            if (u.factor <= box.factor) setPrice.run(u.id === box.id ? boxPrice : Math.ceil((boxPrice * u.factor) / box.factor), u.id);
          }
        }
      }

      done += 1;
      if (onProgress && done % 500 === 0) onProgress({ done, total: rows.length });
    }
    return done;
  });
  const updated = run();
  onProgress?.({ done: updated, total: rows.length });
  return { updated, unitsMismatch };
}
