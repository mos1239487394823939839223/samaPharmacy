import { describe, it, expect } from 'vitest';
import {
  toPiastres,
  fromPiastres,
  formatEGP,
  addMoney,
  subtractMoney,
  multiplyMoney,
  percentOf,
  allocate,
} from './money';

describe('toPiastres', () => {
  it('parses whole and decimal amounts', () => {
    expect(toPiastres('200')).toBe(20000);
    expect(toPiastres('200.00')).toBe(20000);
    expect(toPiastres('19.99')).toBe(1999);
    expect(toPiastres('0.05')).toBe(5);
    expect(toPiastres('0.5')).toBe(50);
    expect(toPiastres('.5')).toBe(50);
  });

  it('accepts a comma as the decimal separator', () => {
    expect(toPiastres('19,99')).toBe(1999);
  });

  it('handles negatives for refunds', () => {
    expect(toPiastres('-19.99')).toBe(-1999);
  });

  it('rejects more than two decimal places rather than silently truncating', () => {
    expect(() => toPiastres('1.005')).toThrow(/2 decimal places/);
  });

  it('rejects junk', () => {
    expect(() => toPiastres('')).toThrow();
    expect(() => toPiastres('abc')).toThrow();
    expect(() => toPiastres('1.2.3')).toThrow();
  });

  it('parses values whose float representation is inexact', () => {
    // 1.1 * 100 === 110.00000000000001 and 8.87 * 100 === 886.9999999999999.
    // Math.round absorbs both, so these do not by themselves prove the string
    // parse is in use — they pin the values against a parser that truncates
    // instead of rounding.
    expect(toPiastres('1.1')).toBe(110);
    expect(toPiastres('8.87')).toBe(887);
    expect(toPiastres('4.35')).toBe(435);
  });

  it('rejects sub-piastre input rather than resolving it by float rounding', () => {
    // This guard is what actually keeps float error out of toPiastres: every
    // value where `Math.round(x * 100)` diverges from the exact 2-decimal value
    // needs a third decimal (2.675 -> naive 268, exact 267), and all of those
    // are refused here. The caller must decide how to round, not the parser.
    for (const v of ['2.675', '1.005', '0.001', '19.999']) {
      expect(() => toPiastres(v)).toThrow(/2 decimal places/);
    }
  });
});

describe('fromPiastres / formatEGP', () => {
  it('always shows two decimal places', () => {
    expect(fromPiastres(20000)).toBe('200.00');
    expect(fromPiastres(5)).toBe('0.05');
    expect(fromPiastres(0)).toBe('0.00');
    expect(fromPiastres(-1999)).toBe('-19.99');
  });

  it('round-trips', () => {
    for (const v of ['0.00', '0.01', '19.99', '200.00', '12345.67']) {
      expect(fromPiastres(toPiastres(v))).toBe(v);
    }
  });

  it('appends the currency', () => {
    expect(formatEGP(20000)).toBe('200.00 ج.م');
  });
});

describe('arithmetic', () => {
  it('adds and subtracts exactly', () => {
    expect(addMoney(1000, 8500, 4200, 6300)).toBe(20000);
    expect(subtractMoney(20000, 1999)).toBe(18001);
  });

  it('does not drift over many operations, unlike float EGP', () => {
    let total = 0;
    for (let i = 0; i < 1000; i++) total = addMoney(total, 20);
    expect(total).toBe(20000);
    expect(fromPiastres(total)).toBe('200.00');
  });

  it('multiplies by whole quantities', () => {
    expect(multiplyMoney(1999, 3)).toBe(5997);
    expect(() => multiplyMoney(1999, 1.5)).toThrow(/integer/);
  });
});

describe('percentOf', () => {
  it('computes simple percentages', () => {
    expect(percentOf(20000, 10)).toBe(2000);
    expect(percentOf(1999, 50)).toBe(1000); // 999.5 rounds half away from zero
  });

  it('rounds half away from zero symmetrically, so refunds mirror sales', () => {
    expect(percentOf(101, 50)).toBe(51); // 50.5 -> 51
    expect(percentOf(-101, 50)).toBe(-51); // -50.5 -> -51, not -50
  });

  it('normalizes negative zero', () => {
    expect(Object.is(percentOf(-1, 0), 0)).toBe(true);
  });
});

describe('allocate', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(allocate(300, [1, 1, 1])).toEqual([100, 100, 100]);
  });

  it('distributes the remainder without losing a piastre', () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it('allocates proportionally to weights', () => {
    const parts = allocate(1000, [500, 300, 200]);
    expect(parts).toEqual([500, 300, 200]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('always sums back to the total, for any weights', () => {
    const cases: Array<[number, number[]]> = [
      [10000, [333, 333, 334]],
      [99, [1, 2, 3, 4, 5]],
      [1, [1, 1, 1, 1]],
      [12345, [7, 11, 13]],
      [5000, [0, 0, 1]],
    ];
    for (const [total, weights] of cases) {
      const parts = allocate(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('falls back to equal shares when all weights are zero', () => {
    // A fully discounted purchase invoice still needs expenses allocated.
    const parts = allocate(100, [0, 0, 0, 0]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([25, 25, 25, 25]);
  });

  it('handles negative totals for reversing entries', () => {
    const parts = allocate(-100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-100);
  });

  it('returns an empty allocation for no lines', () => {
    expect(allocate(500, [])).toEqual([]);
  });
});
