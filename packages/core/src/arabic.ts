/**
 * Arabic normalization.
 *
 * Blueprint §2.6 calls this the feature that decides whether staff like the
 * system: without it, searching `ادول` misses `أدول` and the pharmacist
 * concludes the item is not in stock and reorders it.
 *
 * Normalized values are stored in dedicated *_norm columns on write
 * (CLAUDE.md rule 11) and all searching happens against those.
 */

/** Tashkeel (diacritics) and tatweel (kashida stretching). */
const TASHKEEL_TATWEEL = /[ً-ْـ]/g;

/** Arabic-Indic and Eastern Arabic-Indic digits → ASCII. */
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/**
 * Fold Arabic-Indic and Eastern Arabic-Indic digits to ASCII, leaving
 * everything else untouched.
 *
 * Numeric inputs (invoice serials, quantities, prices) must parse correctly
 * regardless of the Windows input language (CLAUDE.md rule 4 covers the same
 * concern for barcode scanning) — a pharmacist switching keyboards mid-shift
 * still expects "١٢٣" to behave exactly like "123". Unlike normalizeArabic,
 * this never lowercases or folds letters: it is meant to run on numeric
 * fields, not names.
 */
export function toAsciiDigits(input: string): string {
  if (!input) return input;
  return input.replace(/[٠-٩۰-۹]/g, (ch) => ARABIC_INDIC_DIGITS[ch] ?? ch);
}

/**
 * Fold letter variants that staff type interchangeably.
 *
 * ة→ه and ى→ي are deliberate: they lose a real orthographic distinction, but
 * pharmacy staff type both forms for the same drug and a search must match
 * regardless. The original spelling is preserved in name_ar; only the search
 * column is folded.
 */
export function normalizeArabic(input: string): string {
  if (!input) return '';

  let out = input.normalize('NFKC').replace(TASHKEEL_TATWEEL, '');

  out = out.replace(/[ء-٩۰-۹]/g, (ch) => {
    if (ARABIC_INDIC_DIGITS[ch]) return ARABIC_INDIC_DIGITS[ch]!;
    if ('أإآٱ'.includes(ch)) return 'ا';
    if (ch === 'ى') return 'ي';
    if (ch === 'ة') return 'ه';
    if (ch === 'ؤ') return 'و';
    if (ch === 'ئ') return 'ي';
    return ch;
  });

  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a Latin-script name for the same search column.
 * Drug names arrive with inconsistent spacing, casing and punctuation.
 */
export function normalizeLatin(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKD')
    // Strip combining marks so café and cafe match.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize a mixed Arabic/Latin string. Item names routinely contain both,
 * e.g. "نوبراديكس مرهم Neobradex".
 */
export function normalizeName(input: string): string {
  return normalizeArabic(normalizeLatin(input));
}
