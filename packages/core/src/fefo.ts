/**
 * FEFO batch allocation — the other function CLAUDE.md names as
 * financially/operationally critical, alongside landedCost. Deciding which
 * batch a sale draws from determines whether stock actually expires before
 * it sells, and a wrong allocation either strands near-expiry stock or
 * (worse) sells from a batch that has already run out.
 *
 * Pure and side-effect free: it takes a snapshot of available batches and a
 * quantity to allocate, and returns how much to take from each. It does not
 * touch the database — the caller (packages/db) re-reads batches inside its
 * own transaction and re-validates quantities are still available immediately
 * before committing, so a stale snapshot here cannot oversell under
 * concurrent access.
 */

export interface FefoBatch {
  batchId: number;
  qtyOnHand: number;
  /** ISO date, or null for an item flagged no_expiry. */
  expiryDate: string | null;
  unitCost: number;
}

export interface FefoAllocation {
  batchId: number;
  qtyTaken: number;
  unitCost: number;
  expiryDate: string | null;
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly requested: number,
    public readonly available: number
  ) {
    super(`Requested ${requested} base units but only ${available} available across sellable batches`);
    this.name = 'InsufficientStockError';
  }
}

/**
 * Allocate `qtyBase` units from `batches`, earliest expiry first, splitting
 * across batches when one is not enough. Batches with a NULL expiry (no_expiry
 * items, or a purchase where the expiry was left blank — see migration 0003)
 * sort after every dated batch: a dated batch is closer to a known problem
 * and should be sold down first even though "no expiry recorded" is not
 * necessarily "never expires."
 *
 * Throws InsufficientStockError rather than returning a partial allocation —
 * a sale either goes through in full or the pharmacist is told to split the
 * line or pick a different item, never silently short-fulfilled.
 */
export function allocateFefo(batches: FefoBatch[], qtyBase: number): FefoAllocation[] {
  if (!Number.isInteger(qtyBase) || qtyBase <= 0) {
    throw new RangeError(`qtyBase must be a positive integer, got ${qtyBase}`);
  }

  const totalAvailable = batches.reduce((sum, b) => sum + b.qtyOnHand, 0);
  if (totalAvailable < qtyBase) {
    throw new InsufficientStockError(qtyBase, totalAvailable);
  }

  const sorted = [...batches].sort((a, b) => {
    if (a.expiryDate === null && b.expiryDate === null) return a.batchId - b.batchId;
    if (a.expiryDate === null) return 1;
    if (b.expiryDate === null) return -1;
    if (a.expiryDate !== b.expiryDate) return a.expiryDate < b.expiryDate ? -1 : 1;
    return a.batchId - b.batchId;
  });

  const allocations: FefoAllocation[] = [];
  let remaining = qtyBase;

  for (const batch of sorted) {
    if (remaining <= 0) break;
    if (batch.qtyOnHand <= 0) continue;

    const take = Math.min(batch.qtyOnHand, remaining);
    allocations.push({
      batchId: batch.batchId,
      qtyTaken: take,
      unitCost: batch.unitCost,
      expiryDate: batch.expiryDate,
    });
    remaining -= take;
  }

  return allocations;
}

/** Weighted-average cost across an allocation — for the invoice line snapshot. */
export function allocationUnitCost(allocation: FefoAllocation[]): number {
  const totalQty = allocation.reduce((s, a) => s + a.qtyTaken, 0);
  if (totalQty === 0) return 0;
  const totalCost = allocation.reduce((s, a) => s + a.qtyTaken * a.unitCost, 0);
  return Math.round(totalCost / totalQty);
}
