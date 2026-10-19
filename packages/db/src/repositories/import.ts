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
