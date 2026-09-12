import { describe, it, expect } from 'vitest';
import { allocateFefo, allocationUnitCost, InsufficientStockError, type FefoBatch } from './fefo';

describe('allocateFefo', () => {
  it('takes entirely from the single available batch', () => {
    const batches: FefoBatch[] = [{ batchId: 1, qtyOnHand: 100, expiryDate: '2027-01-01', unitCost: 50 }];
    const result = allocateFefo(batches, 30);
    expect(result).toEqual([{ batchId: 1, qtyTaken: 30, unitCost: 50, expiryDate: '2027-01-01' }]);
  });

  it('picks the earliest expiry when multiple batches have stock', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 100, expiryDate: '2027-01-01', unitCost: 50 },
      { batchId: 2, qtyOnHand: 100, expiryDate: '2026-06-01', unitCost: 60 },
    ];
    const result = allocateFefo(batches, 10);
    expect(result).toEqual([{ batchId: 2, qtyTaken: 10, unitCost: 60, expiryDate: '2026-06-01' }]);
  });

  it('splits across batches when the earliest-expiry batch is not enough (partial consumption)', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 5, expiryDate: '2026-01-01', unitCost: 50 },
      { batchId: 2, qtyOnHand: 100, expiryDate: '2027-01-01', unitCost: 60 },
    ];
    const result = allocateFefo(batches, 12);
    expect(result).toEqual([
      { batchId: 1, qtyTaken: 5, unitCost: 50, expiryDate: '2026-01-01' },
      { batchId: 2, qtyTaken: 7, unitCost: 60, expiryDate: '2027-01-01' },
    ]);
  });

  it('splits across three batches when needed, fully draining the first two', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 5, expiryDate: '2026-01-01', unitCost: 10 },
      { batchId: 2, qtyOnHand: 5, expiryDate: '2026-06-01', unitCost: 20 },
      { batchId: 3, qtyOnHand: 100, expiryDate: '2027-01-01', unitCost: 30 },
    ];
    const result = allocateFefo(batches, 13);
    expect(result.map((a) => [a.batchId, a.qtyTaken])).toEqual([
      [1, 5],
      [2, 5],
      [3, 3],
    ]);
  });

  it('skips a batch with zero quantity even if its expiry is earliest', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 0, expiryDate: '2025-01-01', unitCost: 10 },
      { batchId: 2, qtyOnHand: 20, expiryDate: '2027-01-01', unitCost: 20 },
    ];
    const result = allocateFefo(batches, 5);
    expect(result).toEqual([{ batchId: 2, qtyTaken: 5, unitCost: 20, expiryDate: '2027-01-01' }]);
  });

  it('sorts NULL-expiry batches after every dated batch (migration 0003 batches)', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 5, expiryDate: null, unitCost: 10 },
      { batchId: 2, qtyOnHand: 5, expiryDate: '2027-01-01', unitCost: 20 },
    ];
    const result = allocateFefo(batches, 8);
    // The dated batch (2) is drawn down first even though it expires later
    // than "unknown" -- a recorded risk beats an unrecorded one.
    expect(result[0]!.batchId).toBe(2);
    expect(result[1]!.batchId).toBe(1);
  });

  it('breaks ties on the same expiry date by batch id (oldest first)', () => {
    const batches: FefoBatch[] = [
      { batchId: 2, qtyOnHand: 10, expiryDate: '2027-01-01', unitCost: 10 },
      { batchId: 1, qtyOnHand: 10, expiryDate: '2027-01-01', unitCost: 20 },
    ];
    const result = allocateFefo(batches, 5);
    expect(result[0]!.batchId).toBe(1);
  });

  it('throws InsufficientStockError rather than returning a partial allocation', () => {
    const batches: FefoBatch[] = [{ batchId: 1, qtyOnHand: 5, expiryDate: '2027-01-01', unitCost: 10 }];
    expect(() => allocateFefo(batches, 10)).toThrow(InsufficientStockError);
  });

  it('reports the actual shortfall in the error', () => {
    const batches: FefoBatch[] = [{ batchId: 1, qtyOnHand: 5, expiryDate: '2027-01-01', unitCost: 10 }];
    try {
      allocateFefo(batches, 10);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientStockError);
      expect((err as InsufficientStockError).requested).toBe(10);
      expect((err as InsufficientStockError).available).toBe(5);
    }
  });

  it('rejects a non-positive or fractional quantity', () => {
    const batches: FefoBatch[] = [{ batchId: 1, qtyOnHand: 5, expiryDate: null, unitCost: 10 }];
    expect(() => allocateFefo(batches, 0)).toThrow(RangeError);
    expect(() => allocateFefo(batches, -1)).toThrow(RangeError);
    expect(() => allocateFefo(batches, 1.5)).toThrow(RangeError);
  });

  it('handles an empty batch list as zero stock, not a crash', () => {
    expect(() => allocateFefo([], 1)).toThrow(InsufficientStockError);
  });

  it('exactly consumes total stock with nothing left over', () => {
    const batches: FefoBatch[] = [
      { batchId: 1, qtyOnHand: 3, expiryDate: '2026-01-01', unitCost: 10 },
      { batchId: 2, qtyOnHand: 7, expiryDate: '2027-01-01', unitCost: 20 },
    ];
    const result = allocateFefo(batches, 10);
    expect(result.reduce((s, a) => s + a.qtyTaken, 0)).toBe(10);
  });
});

describe('allocationUnitCost', () => {
  it('returns the single batch cost when only one batch is used', () => {
    expect(allocationUnitCost([{ batchId: 1, qtyTaken: 10, unitCost: 50, expiryDate: null }])).toBe(50);
  });

  it('computes the quantity-weighted average across a split allocation', () => {
    // 5 units @ 10 + 5 units @ 20 -> average 15
    const cost = allocationUnitCost([
      { batchId: 1, qtyTaken: 5, unitCost: 10, expiryDate: null },
      { batchId: 2, qtyTaken: 5, unitCost: 20, expiryDate: null },
    ]);
    expect(cost).toBe(15);
  });

  it('weights correctly when quantities are uneven, not a plain average', () => {
    // 1 unit @ 10 + 9 units @ 100 -> (10 + 900) / 10 = 91, not (10+100)/2 = 55
    const cost = allocationUnitCost([
      { batchId: 1, qtyTaken: 1, unitCost: 10, expiryDate: null },
      { batchId: 2, qtyTaken: 9, unitCost: 100, expiryDate: null },
    ]);
    expect(cost).toBe(91);
  });

  it('returns zero for an empty allocation rather than dividing by zero', () => {
    expect(allocationUnitCost([])).toBe(0);
  });
});
