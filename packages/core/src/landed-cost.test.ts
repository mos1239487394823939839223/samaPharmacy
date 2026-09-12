import { describe, it, expect } from 'vitest';
import { landedCost, type LandedCostLine } from './landed-cost';

describe('landedCost', () => {
  it('with no bonus, no expenses, no discount: cost is just line total / qty', () => {
    const lines: LandedCostLine[] = [{ lineNo: 1, lineTotal: 10000, qtyBase: 100, bonusBase: 0 }];
    const [result] = landedCost(lines, 0, 0);
    expect(result!.landedUnitCost).toBe(100); // 10000 / 100
    expect(result!.allocatedExpense).toBe(0);
    expect(result!.allocatedDiscount).toBe(0);
  });

  it('bonus only: same cost spread over more units lowers unit cost (BR-9)', () => {
    // 100 base units paid for, 100 more free -> cost halves.
    const lines: LandedCostLine[] = [{ lineNo: 1, lineTotal: 10000, qtyBase: 100, bonusBase: 100 }];
    const [result] = landedCost(lines, 0, 0);
    expect(result!.landedUnitCost).toBe(50); // 10000 / 200
  });

  it('allocates by line value, not by quantity', () => {
    // Deliberately disproportionate: line 1 has more quantity but less value
    // (cheap bulky item), line 2 has less quantity but more value (expensive
    // small item). Allocating by qty instead of value is a realistic bug --
    // it silently passed every other test in this file where value and qty
    // happened to be proportional.
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 1000, qtyBase: 90, bonusBase: 0 },
      { lineNo: 2, lineTotal: 9000, qtyBase: 10, bonusBase: 0 },
    ];
    const results = landedCost(lines, 1000, 0);
    // By value (1000:9000 = 10:90): line 1 gets 100, line 2 gets 900.
    // By qty (90:10), it would be reversed: line 1 gets 900, line 2 gets 100.
    expect(results[0]!.allocatedExpense).toBe(100);
    expect(results[1]!.allocatedExpense).toBe(900);
  });

  it('expenses only: allocated proportionally and added before dividing', () => {
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 6000, qtyBase: 60, bonusBase: 0 },
      { lineNo: 2, lineTotal: 4000, qtyBase: 40, bonusBase: 0 },
    ];
    const results = landedCost(lines, 1000, 0);

    // Expenses split 60/40 by line value: 600 and 400.
    expect(results[0]!.allocatedExpense).toBe(600);
    expect(results[1]!.allocatedExpense).toBe(400);
    expect(results[0]!.landedUnitCost).toBe(110); // (6000+600)/60
    expect(results[1]!.landedUnitCost).toBe(110); // (4000+400)/40
  });

  it('discount only: allocated proportionally and subtracted before dividing', () => {
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 6000, qtyBase: 60, bonusBase: 0 },
      { lineNo: 2, lineTotal: 4000, qtyBase: 40, bonusBase: 0 },
    ];
    const results = landedCost(lines, 0, 500);

    expect(results[0]!.allocatedDiscount).toBe(300);
    expect(results[1]!.allocatedDiscount).toBe(200);
    expect(results[0]!.landedUnitCost).toBe(95); // (6000-300)/60
    expect(results[1]!.landedUnitCost).toBe(95); // (4000-200)/40
  });

  it('all three combined: bonus, expenses, and discount together', () => {
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 8000, qtyBase: 80, bonusBase: 20 }, // 100 total units
      { lineNo: 2, lineTotal: 2000, qtyBase: 20, bonusBase: 0 },
    ];
    // Weights are 8000:2000 = 80:20.
    const results = landedCost(lines, 1000, 500);

    // Expenses: 800 / 200. Discount: 400 / 100.
    expect(results[0]!.allocatedExpense).toBe(800);
    expect(results[1]!.allocatedExpense).toBe(200);
    expect(results[0]!.allocatedDiscount).toBe(400);
    expect(results[1]!.allocatedDiscount).toBe(100);

    // Line 1: (8000 + 800 - 400) / 100 = 8400/100 = 84
    expect(results[0]!.landedUnitCost).toBe(84);
    // Line 2: (2000 + 200 - 100) / 20 = 2100/20 = 105
    expect(results[1]!.landedUnitCost).toBe(105);
  });

  it('a single-line invoice takes the entire header expense and discount', () => {
    const lines: LandedCostLine[] = [{ lineNo: 1, lineTotal: 10000, qtyBase: 100, bonusBase: 0 }];
    const [result] = landedCost(lines, 750, 250);
    expect(result!.allocatedExpense).toBe(750);
    expect(result!.allocatedDiscount).toBe(250);
    expect(result!.landedUnitCost).toBe(105); // (10000+750-250)/100
  });

  it('allocated expenses always sum exactly back to the header total', () => {
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 3333, qtyBase: 33, bonusBase: 0 },
      { lineNo: 2, lineTotal: 3333, qtyBase: 33, bonusBase: 0 },
      { lineNo: 3, lineTotal: 3334, qtyBase: 34, bonusBase: 0 },
    ];
    const results = landedCost(lines, 1000, 700);
    const expenseSum = results.reduce((a, r) => a + r.allocatedExpense, 0);
    const discountSum = results.reduce((a, r) => a + r.allocatedDiscount, 0);
    expect(expenseSum).toBe(1000);
    expect(discountSum).toBe(700);
  });

  it('handles a large realistic invoice (many lines, uneven weights)', () => {
    const lines: LandedCostLine[] = Array.from({ length: 25 }, (_, i) => ({
      lineNo: i + 1,
      lineTotal: 1000 + i * 137,
      qtyBase: 10 + i,
      bonusBase: i % 3 === 0 ? 2 : 0,
    }));
    const results = landedCost(lines, 5000, 1200);
    expect(results.reduce((a, r) => a + r.allocatedExpense, 0)).toBe(5000);
    expect(results.reduce((a, r) => a + r.allocatedDiscount, 0)).toBe(1200);
    expect(results).toHaveLength(25);
    for (const r of results) {
      expect(Number.isInteger(r.landedUnitCost)).toBe(true);
    }
  });

  it('rejects a line with zero total quantity rather than dividing by zero', () => {
    const lines: LandedCostLine[] = [{ lineNo: 1, lineTotal: 500, qtyBase: 0, bonusBase: 0 }];
    expect(() => landedCost(lines, 0, 0)).toThrow(/zero total quantity/);
  });

  it('returns an empty result for an invoice with no lines', () => {
    expect(landedCost([], 100, 50)).toEqual([]);
  });

  it('handles zero-value lines (fully discounted freebie line) without NaN', () => {
    const lines: LandedCostLine[] = [
      { lineNo: 1, lineTotal: 0, qtyBase: 10, bonusBase: 0 },
      { lineNo: 2, lineTotal: 10000, qtyBase: 100, bonusBase: 0 },
    ];
    const results = landedCost(lines, 1000, 0);
    // allocate() falls back to equal weighting when all weights are zero, but
    // here only one line is zero-weighted among nonzero ones, so it gets no
    // share of the expense allocation (weight 0 of total 10000).
    expect(results[0]!.allocatedExpense).toBe(0);
    expect(results[1]!.allocatedExpense).toBe(1000);
    expect(Number.isFinite(results[0]!.landedUnitCost)).toBe(true);
  });
});
