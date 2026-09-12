import { describe, it, expect } from 'vitest';
import { guessMapping, validateRows, rejectedToCsv } from './import';

describe('guessMapping', () => {
  it('maps Arabic headers', () => {
    const m = guessMapping(['اسم الصنف', 'سعر الجمهور', 'باركود']);
    expect(m.nameAr).toBe(0);
    expect(m.publicPrice).toBe(1);
    expect(m.barcode).toBe(2);
  });

  it('maps English headers regardless of case and spacing', () => {
    const m = guessMapping(['  Arabic Name ', 'Public Price', 'BARCODE']);
    expect(m.nameAr).toBe(0);
    expect(m.publicPrice).toBe(1);
    expect(m.barcode).toBe(2);
  });

  it('leaves unknown columns unmapped rather than guessing wildly', () => {
    const m = guessMapping(['اسم الصنف', 'حقل غامض تماما']);
    expect(m.nameAr).toBe(0);
    // Nothing should have claimed column 1.
    expect(Object.values(m).filter((v) => v === 1)).toHaveLength(0);
  });

  it('matches a compound Arabic header that does not literally contain the hint', () => {
    // "اسم الصنف بالانجليزية" (item's name in English) never contains
    // "الاسم الانجليزي" (the English name) as a substring, even though every
    // word overlaps. This is a real header from a supplier export that a
    // pure substring match silently failed to map, so nameEn was dropped
    // on every import using this phrasing without any error being shown.
    const m = guessMapping(['اسم الصنف', 'اسم الصنف بالانجليزية', 'باركود', 'سعر الجمهور']);
    expect(m.nameAr).toBe(0);
    expect(m.nameEn).toBe(1);
    expect(m.barcode).toBe(2);
    expect(m.publicPrice).toBe(3);
  });

  it('never assigns the same column to two different fields', () => {
    // Both nameAr's and nameEn's hint lists could plausibly score against a
    // single ambiguous header; the first field to claim a column must lock
    // it out for the rest.
    const m = guessMapping(['اسم', 'باركود']);
    const claimedColumns = Object.values(m);
    expect(new Set(claimedColumns).size).toBe(claimedColumns.length);
  });
});

describe('validateRows', () => {
  const mapping = { nameAr: 0, nameEn: 1, barcode: 2, publicPrice: 3 };

  it('accepts a well-formed row', () => {
    const { accepted, rejected } = validateRows(
      [['بانادول', 'Panadol', '6221048123450', '25.00']],
      mapping
    );
    expect(rejected).toHaveLength(0);
    expect(accepted[0]).toMatchObject({
      nameAr: 'بانادول',
      nameEn: 'Panadol',
      barcode: '6221048123450',
      publicPrice: 2500,
    });
  });

  it('rejects a row with no Arabic name', () => {
    const { rejected } = validateRows([['', 'Panadol', '', '']], mapping);
    expect(rejected[0]!.reason).toMatch(/مفقود/);
  });

  it('reports the source row number so the file can be fixed', () => {
    const { rejected } = validateRows(
      [
        ['اسم صحيح', '', '', ''],
        ['', '', '', ''],
      ],
      mapping
    );
    // Row 1 is the header, so the second data row is row 3.
    expect(rejected[0]!.rowNumber).toBe(3);
  });

  it('rejects duplicate names within the file', () => {
    const { accepted, rejected } = validateRows(
      [
        ['بانادول', '', '', ''],
        ['بانادول', '', '', ''],
      ],
      mapping
    );
    expect(accepted).toHaveLength(1);
    expect(rejected[0]!.reason).toMatch(/مكرر/);
  });

  it('treats names differing only by hamza as duplicates', () => {
    const { accepted, rejected } = validateRows(
      [
        ['أدول', '', '', ''],
        ['ادول', '', '', ''],
      ],
      mapping
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it('rejects duplicate barcodes', () => {
    const { rejected } = validateRows(
      [
        ['صنف أ', '', '111111', ''],
        ['صنف ب', '', '111111', ''],
      ],
      mapping
    );
    expect(rejected[0]!.reason).toMatch(/باركود/);
  });

  it('rejects rows colliding with what is already in the database', () => {
    const { rejected } = validateRows([['صنف ج', '', '999999', '']], mapping, {
      barcodes: new Set(['999999']),
    });
    expect(rejected).toHaveLength(1);
  });

  it('rejects malformed prices instead of importing zero', () => {
    const { rejected } = validateRows([['صنف', '', '', 'abc']], mapping);
    expect(rejected[0]!.reason).toMatch(/سعر/);
  });

  it('rejects sub-piastre prices rather than rounding silently', () => {
    const { rejected } = validateRows([['صنف', '', '', '10.005']], mapping);
    expect(rejected).toHaveLength(1);
  });

  it('enforces BR-4: sale price may not exceed public price', () => {
    const m = { nameAr: 0, publicPrice: 1, salePrice: 2 };
    const { rejected } = validateRows([['صنف', '10.00', '12.00']], m);
    expect(rejected[0]!.reason).toMatch(/أعلى/);
  });

  it('preserves leading zeros on barcodes', () => {
    const { accepted } = validateRows([['صنف', '', '0004567', '']], mapping);
    expect(accepted[0]!.barcode).toBe('0004567');
  });

  it('rejects a non-integer unit factor', () => {
    const m = { nameAr: 0, unitFactor: 1 };
    const { rejected } = validateRows([['صنف', '2.5']], m);
    expect(rejected[0]!.reason).toMatch(/رقمية/);
  });

  it('handles 35,000 rows well within the time budget', () => {
    const rows = Array.from({ length: 35000 }, (_, i) => [
      `صنف رقم ${i}`,
      `Item ${i}`,
      `700000${String(i).padStart(7, '0')}`,
      '25.00',
    ]);
    const start = performance.now();
    const { accepted, rejected } = validateRows(rows, mapping);
    const elapsed = performance.now() - start;

    expect(accepted).toHaveLength(35000);
    expect(rejected).toHaveLength(0);
    // Validation is only part of the 60s budget; the rest is the insert.
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('rejectedToCsv', () => {
  it('round-trips the original row so the user can fix and re-import', () => {
    const csv = rejectedToCsv(
      [{ rowNumber: 7, reason: 'اسم الصنف مفقود', raw: ['', 'Panadol', '111'] }],
      ['اسم الصنف', 'English', 'باركود']
    );
    expect(csv.split('\n')[0]).toContain('row,reason');
    expect(csv).toContain('7,اسم الصنف مفقود');
    expect(csv).toContain('Panadol');
  });

  it('escapes commas and quotes', () => {
    const csv = rejectedToCsv(
      [{ rowNumber: 2, reason: 'x', raw: ['a,b', 'say "hi"'] }],
      ['c1', 'c2']
    );
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"say ""hi"""');
  });
});
