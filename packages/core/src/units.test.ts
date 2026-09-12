import { describe, it, expect } from 'vitest';
import {
  toBaseUnits,
  fromBaseUnits,
  describeStock,
  validateUnitSet,
  type ItemUnit,
} from './units';

const TABLET: ItemUnit = { id: 1, nameAr: 'قرص', factor: 1, isBase: true };
const STRIP: ItemUnit = { id: 2, nameAr: 'شريط', factor: 10, isBase: false };
const BOX: ItemUnit = { id: 3, nameAr: 'علبة', factor: 20, isBase: false };

describe('toBaseUnits', () => {
  it('converts whole units', () => {
    expect(toBaseUnits(1, 20)).toBe(20);
    expect(toBaseUnits(3, 10)).toBe(30);
    expect(toBaseUnits(5, 1)).toBe(5);
  });

  it('allows fractional entry that lands on whole base units', () => {
    expect(toBaseUnits(0.5, 20)).toBe(10);
    expect(toBaseUnits(1.5, 10)).toBe(15);
  });

  it('rejects a quantity that would need a fraction of a base unit', () => {
    expect(() => toBaseUnits(0.5, 3)).toThrow(/not a whole number/);
  });

  it('tolerates float entry noise', () => {
    // 0.1 * 30 === 3.0000000000000004
    expect(toBaseUnits(0.1, 30)).toBe(3);
  });

  it('rejects invalid factors', () => {
    expect(() => toBaseUnits(1, 0)).toThrow(/positive integer/);
    expect(() => toBaseUnits(1, -5)).toThrow(/positive integer/);
    expect(() => toBaseUnits(1, 1.5)).toThrow(/positive integer/);
  });
});

describe('fromBaseUnits', () => {
  it('converts back', () => {
    expect(fromBaseUnits(20, 20)).toBe(1);
    expect(fromBaseUnits(10, 20)).toBe(0.5);
  });

  it('rejects fractional base quantities — stock is always integer', () => {
    expect(() => fromBaseUnits(1.5, 10)).toThrow(/integer/);
  });
});

describe('describeStock', () => {
  const units = [TABLET, STRIP, BOX];

  it('uses the largest unit that divides evenly', () => {
    expect(describeStock(40, units)).toEqual({ quantity: 2, unit: BOX });
    expect(describeStock(30, units)).toEqual({ quantity: 3, unit: STRIP });
  });

  it('falls back to base units rather than showing a fraction of a box', () => {
    // 24 tablets is 1.2 boxes — a pharmacist needs "24 قرص".
    expect(describeStock(24, units)).toEqual({ quantity: 24, unit: TABLET });
  });

  it('handles zero stock', () => {
    expect(describeStock(0, units)).toEqual({ quantity: 0, unit: TABLET });
  });

  it('returns null when an item has no units configured', () => {
    expect(describeStock(10, [])).toBeNull();
  });
});

describe('validateUnitSet', () => {
  it('accepts a well-formed set', () => {
    expect(validateUnitSet([TABLET, STRIP, BOX])).toEqual([]);
  });

  it('requires a base unit', () => {
    expect(validateUnitSet([STRIP, BOX])).toContain('No base unit defined');
  });

  it('rejects multiple base units', () => {
    const errors = validateUnitSet([TABLET, { ...STRIP, isBase: true }]);
    expect(errors.some((e) => /2 base units/.test(e))).toBe(true);
  });

  it('requires the base unit to have factor 1', () => {
    const errors = validateUnitSet([{ ...TABLET, factor: 5 }]);
    expect(errors.some((e) => /factor 1/.test(e))).toBe(true);
  });

  it('rejects duplicate unit names', () => {
    const errors = validateUnitSet([TABLET, { ...BOX, nameAr: 'قرص' }]);
    expect(errors.some((e) => /Duplicate/.test(e))).toBe(true);
  });
});
