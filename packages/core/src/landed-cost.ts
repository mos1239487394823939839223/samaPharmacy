/**
 * Landed cost — the most financially sensitive calculation in the system
 * (blueprint §1.7). Bonus quantity, header-level expenses, and header-level
 * discount all change the true per-unit cost of a purchase line, and every
 * batch's stored cost depends on getting this arithmetic exactly right.
 *
 * Formula, from schema.sql's own comment on purchase_invoice_lines:
 *   landed_unit_cost = (line_total + allocated_expenses - allocated_discount)
 *                       / (qty_base + bonus_base)
 *
 * Header expenses and header discount are allocated across lines proportionally
 * by line value (value_after_tax), using packages/core's allocate() so the
 * allocated amounts always sum exactly back to the header total — no
 * remainder is silently dropped or double-counted.
 */

import { allocate, type Piastres } from './money';

export interface LandedCostLine {
  /** Stable identifier for matching input lines to output lines. */
  lineNo: number;
  /** value_after_tax — the line's own total before header-level allocation. */
  lineTotal: Piastres;
  /** Base units received for pay, excluding bonus. */
  qtyBase: number;
  /** Base units received as bonus/free goods (BR-9: reduces weighted cost). */
  bonusBase: number;
}

export interface LandedCostResult {
  lineNo: number;
  /** Piastres allocated to this line from the header expenses. */
  allocatedExpense: Piastres;
  /** Piastres allocated to this line from the header discount. */
  allocatedDiscount: Piastres;
  /** (lineTotal + allocatedExpense - allocatedDiscount) / (qtyBase + bonusBase). */
  landedUnitCost: Piastres;
}

/**
 * Compute landed unit cost for every line on a purchase invoice.
 *
 * Header expenses and header discount are each allocated once, proportionally
 * by lineTotal, via allocate() — so both allocations independently sum back
 * to the header figures regardless of rounding. A single-line invoice takes
 * the whole header amount by construction (allocate() with one weight
 * returns [total]).
 *
 * Division truncates toward zero (integer piastres per base unit); the
 * fractional remainder is inherent to storing cost per base unit and is not
 * an allocation error — it does not accumulate the way an unallocated
 * remainder would, because each batch's total value is qty * landedUnitCost,
 * not the reverse.
 */
export function landedCost(
  lines: LandedCostLine[],
  headerExpenses: Piastres,
  headerDiscount: Piastres
): LandedCostResult[] {
  if (lines.length === 0) return [];

  for (const line of lines) {
    if (line.qtyBase + line.bonusBase <= 0) {
      throw new RangeError(
        `Line ${line.lineNo} has zero total quantity (qtyBase + bonusBase); ` +
          `cannot compute a per-unit cost`
      );
    }
  }

  const weights = lines.map((l) => l.lineTotal);
  const expenseShares = allocate(headerExpenses, weights);
  const discountShares = allocate(headerDiscount, weights);

  return lines.map((line, i) => {
    const allocatedExpense = expenseShares[i]!;
    const allocatedDiscount = discountShares[i]!;
    const adjustedTotal = line.lineTotal + allocatedExpense - allocatedDiscount;
    const totalQty = line.qtyBase + line.bonusBase;

    return {
      lineNo: line.lineNo,
      allocatedExpense,
      allocatedDiscount,
      landedUnitCost: Math.trunc(adjustedTotal / totalQty),
    };
  });
}
