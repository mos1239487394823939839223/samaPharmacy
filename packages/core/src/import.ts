/**
 * Item import validation — pure, no I/O.
 *
 * The Egyptian drug database arrives as a spreadsheet with inconsistent
 * columns, so the mapping is chosen by the user and validation runs over the
 * mapped result. Rejected rows carry their original row number and a reason,
 * so the user can fix the source file and re-import.
 */

import { toPiastres } from './money';
import { normalizeName } from './arabic';

/** Fields the importer can map a spreadsheet column onto. */
export type ImportField =
  | 'nameAr'
  | 'nameEn'
  | 'barcode'
  | 'publicPrice'
  | 'scientificName'
  | 'shelfLocation'
  | 'unitName'
  | 'unitFactor'
  | 'salePrice'
  | 'minStock';

export const REQUIRED_FIELDS: ImportField[] = ['nameAr'];

export const IMPORTABLE_FIELDS: ImportField[] = [
  'nameAr',
  'nameEn',
  'barcode',
  'publicPrice',
  'scientificName',
  'shelfLocation',
  'unitName',
  'unitFactor',
  'salePrice',
  'minStock',
];

/** Column name → field, for the common spellings seen in supplier exports. */
const HEADER_HINTS: Record<ImportField, string[]> = {
  nameAr: ['اسم الصنف', 'الاسم العربي', 'name_ar', 'arabic name', 'الصنف'],
  nameEn: ['english name', 'name_en', 'الاسم الانجليزي', 'trade name'],
  barcode: ['barcode', 'باركود', 'ean', 'الكود الدولي', 'code'],
  publicPrice: ['public price', 'سعر الجمهور', 'price', 'السعر'],
  scientificName: ['scientific', 'الاسم العلمي', 'active ingredient', 'المادة الفعالة'],
  shelfLocation: ['shelf', 'مكان الصنف', 'location', 'الرف'],
  unitName: ['unit', 'الوحدة'],
  unitFactor: ['factor', 'المعامل', 'pack size'],
  salePrice: ['sale price', 'سعر البيع'],
  minStock: ['min stock', 'الحد الأدنى'],
};

/**
 * Score a header against a hint by shared words rather than substring
 * containment. Arabic compound phrases rarely contain a hint verbatim —
 * "اسم الصنف بالانجليزية" ("item's name in English") never literally contains
 * "الاسم الانجليزي" ("the English name") as a substring even though every word
 * overlaps — so word overlap is what actually finds real spreadsheet headers.
 */
function wordOverlapScore(header: string, hint: string): number {
  const headerWords = new Set(header.split(' ').filter(Boolean));
  const hintWords = hint.split(' ').filter(Boolean);
  if (hintWords.length === 0) return 0;

  let matched = 0;
  for (const word of hintWords) {
    if (headerWords.has(word)) {
      matched += 1;
      continue;
    }
    // Allow a prefix match one way for short attached-preposition forms, e.g.
    // "بالانجليزية" against "انجليزي" — both share the root but neither is a
    // clean substring of the other after normalization.
    if ([...headerWords].some((w) => w.length >= 3 && (w.includes(word) || word.includes(w)))) {
      matched += 0.5;
    }
  }
  return matched / hintWords.length;
}

/** Best-effort initial mapping. The user confirms or overrides it. */
export function guessMapping(headers: string[]): Partial<Record<ImportField, number>> {
  const mapping: Partial<Record<ImportField, number>> = {};
  const normalized = headers.map((h) => normalizeName(String(h ?? '')));
  const claimed = new Set<number>();

  for (const field of IMPORTABLE_FIELDS) {
    const hints = HEADER_HINTS[field].map((h) => normalizeName(h));

    let bestIndex = -1;
    let bestScore = 0;

    normalized.forEach((header, index) => {
      if (header === '' || claimed.has(index)) return;
      for (const hint of hints) {
        const score = header === hint ? 1 : wordOverlapScore(header, hint);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
    });

    // Require at least half the hint's words to have matched, so an
    // unrelated column never gets claimed just because it shares one common
    // word (e.g. "اسم" appearing in both a name field and an unrelated one).
    if (bestIndex >= 0 && bestScore >= 0.5) {
      mapping[field] = bestIndex;
      claimed.add(bestIndex);
    }
  }

  return mapping;
}

export interface ParsedRow {
  /** 1-based row number in the source file, including the header. */
  rowNumber: number;
  nameAr: string;
  nameEn: string | null;
  barcode: string | null;
  publicPrice: number | null;
  scientificName: string | null;
  shelfLocation: string | null;
  unitName: string | null;
  unitFactor: number | null;
  salePrice: number | null;
  minStock: number;
}

export interface RejectedRow {
  rowNumber: number;
  reason: string;
  raw: string[];
}

export interface ValidationResult {
  accepted: ParsedRow[];
  rejected: RejectedRow[];
}

export type RejectReason =
  | 'missing_name'
  | 'duplicate_name'
  | 'duplicate_barcode'
  | 'bad_price'
  | 'bad_number'
  | 'price_below_sale';

export const REJECT_REASONS: Record<RejectReason, string> = {
  missing_name: 'اسم الصنف مفقود',
  duplicate_name: 'اسم مكرر داخل الملف',
  duplicate_barcode: 'باركود مكرر',
  bad_price: 'سعر غير صالح',
  bad_number: 'قيمة رقمية غير صالحة',
  price_below_sale: 'سعر البيع أعلى من سعر الجمهور',
};

function cell(row: string[], index: number | undefined): string {
  if (index === undefined) return '';
  return String(row[index] ?? '').trim();
}

/**
 * Validate mapped rows.
 *
 * `existingBarcodes` and `existingNames` carry what is already in the database
 * so a re-import does not silently create duplicates. Both are normalized.
 */
export function validateRows(
  rows: string[][],
  mapping: Partial<Record<ImportField, number>>,
  existing: { barcodes?: Set<string>; names?: Set<string> } = {},
  startRowNumber = 2
): ValidationResult {
  const accepted: ParsedRow[] = [];
  const rejected: RejectedRow[] = [];

  const seenNames = new Set(existing.names ?? []);
  const seenBarcodes = new Set(existing.barcodes ?? []);

  rows.forEach((row, i) => {
    const rowNumber = startRowNumber + i;
    const reject = (reason: RejectReason) =>
      rejected.push({ rowNumber, reason: REJECT_REASONS[reason], raw: row });

    const nameAr = cell(row, mapping.nameAr);
    if (!nameAr) return reject('missing_name');

    const nameKey = normalizeName(nameAr);
    if (seenNames.has(nameKey)) return reject('duplicate_name');

    const barcode = cell(row, mapping.barcode) || null;
    if (barcode && seenBarcodes.has(barcode)) return reject('duplicate_barcode');

    let publicPrice: number | null = null;
    const priceText = cell(row, mapping.publicPrice);
    if (priceText) {
      try {
        publicPrice = toPiastres(priceText);
      } catch {
        return reject('bad_price');
      }
      if (publicPrice < 0) return reject('bad_price');
    }

    let salePrice: number | null = null;
    const saleText = cell(row, mapping.salePrice);
    if (saleText) {
      try {
        salePrice = toPiastres(saleText);
      } catch {
        return reject('bad_price');
      }
      if (salePrice < 0) return reject('bad_price');
    }

    // BR-4: sale price may never exceed the EDA public price.
    if (publicPrice !== null && salePrice !== null && salePrice > publicPrice) {
      return reject('price_below_sale');
    }

    let unitFactor: number | null = null;
    const factorText = cell(row, mapping.unitFactor);
    if (factorText) {
      const parsed = Number(factorText);
      if (!Number.isInteger(parsed) || parsed < 1) return reject('bad_number');
      unitFactor = parsed;
    }

    let minStock = 0;
    const minText = cell(row, mapping.minStock);
    if (minText) {
      const parsed = Number(minText);
      if (!Number.isInteger(parsed) || parsed < 0) return reject('bad_number');
      minStock = parsed;
    }

    seenNames.add(nameKey);
    if (barcode) seenBarcodes.add(barcode);

    accepted.push({
      rowNumber,
      nameAr,
      nameEn: cell(row, mapping.nameEn) || null,
      barcode,
      publicPrice,
      scientificName: cell(row, mapping.scientificName) || null,
      shelfLocation: cell(row, mapping.shelfLocation) || null,
      unitName: cell(row, mapping.unitName) || null,
      unitFactor,
      salePrice,
      minStock,
    });
  });

  return { accepted, rejected };
}

/** Rejected rows as CSV, so the user can fix them and re-import. */
export function rejectedToCsv(rejected: RejectedRow[], headers: string[]): string {
  const escape = (v: string) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [['row', 'reason', ...headers].map(escape).join(',')];
  for (const r of rejected) {
    lines.push([String(r.rowNumber), r.reason, ...r.raw].map(escape).join(','));
  }
  return lines.join('\n');
}
