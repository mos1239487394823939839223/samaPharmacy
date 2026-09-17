import { describe, it, expect } from 'vitest';
import { normalizeArabic, normalizeLatin, normalizeName, toAsciiDigits } from './arabic';

describe('normalizeArabic', () => {
  it('folds alef variants — the case blueprint §2.6 names', () => {
    // Searching ادول must find أدول.
    expect(normalizeArabic('أدول')).toBe(normalizeArabic('ادول'));
    expect(normalizeArabic('إيزادور')).toBe(normalizeArabic('ايزادور'));
    expect(normalizeArabic('آمون')).toBe(normalizeArabic('امون'));
  });

  it('folds ة to ه', () => {
    expect(normalizeArabic('حقنة')).toBe(normalizeArabic('حقنه'));
  });

  it('folds ى to ي', () => {
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'));
  });

  it('folds ؤ and ئ', () => {
    expect(normalizeArabic('مسؤول')).toBe(normalizeArabic('مسوول'));
    expect(normalizeArabic('سائل')).toBe(normalizeArabic('سايل'));
  });

  it('strips tashkeel', () => {
    expect(normalizeArabic('مَرْهَم')).toBe('مرهم');
    expect(normalizeArabic('كِتَاب')).toBe('كتاب');
  });

  it('strips tatweel', () => {
    expect(normalizeArabic('مرهــــم')).toBe('مرهم');
  });

  it('converts Arabic-Indic digits so ٥٠٠ matches 500', () => {
    expect(normalizeArabic('٥٠٠')).toBe('500');
    expect(normalizeArabic('باراسيتامول ٥٠٠')).toBe('باراسيتامول 500');
  });

  it('collapses whitespace and trims', () => {
    expect(normalizeArabic('  حقنة   بنسلين  ')).toBe('حقنه بنسلين');
  });

  it('handles real Egyptian pharmacy drug names', () => {
    const pairs: Array<[string, string]> = [
      ['بانادول إكسترا', 'بانادول اكسترا'],
      ['أوجمنتين ١ جم', 'اوجمنتين 1 جم'],
      ['كلاريتين شراب', 'كلاريتين شراب'],
      ['فولتارين أمبولات', 'فولتارين امبولات'],
      ['نوبراديكس مرهــم', 'نوبراديكس مرهم'],
      ['حقنة فيتامين ب١٢', 'حقنه فيتامين ب12'],
    ];
    for (const [written, typed] of pairs) {
      expect(normalizeArabic(written)).toBe(normalizeArabic(typed));
    }
  });

  it('returns empty for empty input', () => {
    expect(normalizeArabic('')).toBe('');
  });
});

describe('toAsciiDigits', () => {
  it('converts Arabic-Indic digits', () => {
    expect(toAsciiDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('converts Eastern Arabic-Indic (Persian/Urdu) digits', () => {
    expect(toAsciiDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('leaves ASCII digits untouched', () => {
    expect(toAsciiDigits('12345')).toBe('12345');
  });

  it('converts digits embedded in a larger string, leaving the rest alone', () => {
    expect(toAsciiDigits('فاتورة رقم ٦٢٣٤١')).toBe('فاتورة رقم 62341');
  });

  it('parses correctly with Number() after conversion', () => {
    expect(Number(toAsciiDigits('١٢٣'))).toBe(123);
    expect(Number(toAsciiDigits('  ٤٥.٥  '.trim()))).toBe(45.5);
  });

  it('returns empty for empty input', () => {
    expect(toAsciiDigits('')).toBe('');
  });
});

describe('normalizeLatin', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeLatin('  Hepta   Panthenol  ')).toBe('hepta panthenol');
  });

  it('strips accents', () => {
    expect(normalizeLatin('Café')).toBe('cafe');
  });
});

describe('normalizeName', () => {
  it('handles mixed Arabic and Latin names', () => {
    expect(normalizeName('نوبراديكس مرهم Neobradex')).toBe('نوبراديكس مرهم neobradex');
  });

  it('makes a mixed name searchable from either script', () => {
    const stored = normalizeName('أوجمنتين Augmentin ١ جم');
    expect(stored).toContain('اوجمنتين');
    expect(stored).toContain('augmentin');
    expect(stored).toContain('1');
  });
});
