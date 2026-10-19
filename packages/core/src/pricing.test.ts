import { describe, it, expect } from 'vitest';
import { boxFactorOf, maxUnitPrice, proRataShare } from './pricing';
import { lineValue } from './money';
import { addDays, isIsoDate, toLocalIsoDate } from './dates';

describe('maxUnitPrice (BR-4 with the public price on the box)', () => {
  it('caps a strip of 10 from a 100.00 box of 20 at 50.00', () => {
    expect(maxUnitPrice(10000, 20, 10)).toBe(5000);
  });
  it('caps a single tablet at its share, rounded up to the next piastre', () => {
    expect(maxUnitPrice(10000, 3, 1)).toBe(3334);
  });
  it('the box itself is capped at the public price exactly', () => {
    expect(maxUnitPrice(10000, 20, 20)).toBe(10000);
  });
  it('box factor is the largest unit', () => {
    expect(boxFactorOf([{ factor: 1 }, { factor: 20 }, { factor: 10 }])).toBe(20);
    expect(boxFactorOf([])).toBe(1);
  });
});

describe('proRataShare (refund of part of a line)', () => {
  it('refunds the proportional share', () => {
    expect(proRataShare(10000, 0, 10, 20)).toBe(5000);
  });
  it('partial refunds of one line always add back to the line exactly', () => {
    // 100.00 for 3 units: 33.33 + 33.34 + 33.33 — never 100.01.
    const a = proRataShare(10000, 0, 1, 3);
    const b = proRataShare(10000, 1, 1, 3);
    const c = proRataShare(10000, 2, 1, 3);
    expect(a + b + c).toBe(10000);
  });
});

describe('lineValue', () => {
  it('is always an integer number of piastres', () => {
    expect(lineValue(0.5, 1001)).toBe(501);
    expect(lineValue(1.1, 300)).toBe(330);
    expect(lineValue(3, 1999)).toBe(5997);
    expect(Number.isInteger(lineValue(0.33, 1234))).toBe(true);
  });
});

describe('local dates', () => {
  it('formats the local calendar date, not UTC', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });
  it('adds days across month and leap-year boundaries', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('not-a-date')).toBe(false);
    expect(isIsoDate('2026-1-1')).toBe(false);
  });
});
