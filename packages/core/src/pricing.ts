/**
 * Pricing rules that depend on the unit set.
 *
 * public_price is the EDA price printed on the box (decision D9): the price
 * of the item's largest unit. Strips and tablets may be sold too, and BR-4
 * caps each of them at its proportional share of the box price.
 */

import type { Piastres } from './money';

/**
 * Highest legal sale price for one `unitFactor`-sized unit when the box
 * (`boxFactor` base units) is priced at `publicPrice`. Rounded up to the next
 * piastre so that, e.g., a third of a 100.00 box may be sold at 33.34.
 */
export function maxUnitPrice(publicPrice: Piastres, boxFactor: number, unitFactor: number): Piastres {
  if (boxFactor <= 0 || unitFactor <= 0) throw new RangeError('Unit factors must be positive');
  return Math.ceil((publicPrice * unitFactor) / boxFactor);
}

/** The box factor: the largest factor among the item's units (1 when it has none). */
export function boxFactorOf(units: Array<{ factor: number }>): number {
  return units.reduce((max, u) => Math.max(max, u.factor), 1);
}

/**
 * Share of `total` that belongs to `part` out of `whole`, computed
 * cumulatively so repeated partial refunds of the same line always sum back
 * to exactly `total`: refund(already + qty) − refund(already).
 */
export function proRataShare(total: Piastres, already: number, part: number, whole: number): Piastres {
  if (whole <= 0) throw new RangeError('whole must be positive');
  const upTo = (q: number) => Math.round((total * q) / whole);
  return upTo(already + part) - upTo(already);
}

/**
 * New selling prices for every unit of an item after one unit is repriced
 * (e.g. the box price typed on a purchase invoice). Each other unit keeps its
 * ratio to the repriced one, so a strip priced a little under its share stays
 * a little under; a unit with no usable reference falls back to its exact
 * share. Returns only the units whose price changes.
 */
export function repriceUnits(
  units: Array<{ id: number; factor: number; salePrice: Piastres }>,
  unitId: number,
  newPrice: Piastres
): Array<{ id: number; salePrice: Piastres }> {
  if (!Number.isInteger(newPrice) || newPrice < 0) throw new RangeError('Price must be a non-negative integer');
  const chosen = units.find((u) => u.id === unitId);
  if (!chosen) throw new RangeError(`Unit ${unitId} is not one of the item's units`);
  const old = chosen.salePrice;
  const out: Array<{ id: number; salePrice: Piastres }> = [];
  for (const u of units) {
    const price =
      u.id === unitId
        ? newPrice
        : old > 0 && u.salePrice > 0
          ? Math.round((u.salePrice * newPrice) / old)
          : Math.round((newPrice * u.factor) / chosen.factor);
    if (price !== u.salePrice) out.push({ id: u.id, salePrice: price });
  }
  return out;
}
