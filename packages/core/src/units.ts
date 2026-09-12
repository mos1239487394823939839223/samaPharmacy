/**
 * Unit conversion.
 *
 * Stock is stored in integer base units — individual tablets or ml
 * (CLAUDE.md rule 2). علبة and شريط are display conversions through
 * item_units.factor, never a second stored quantity.
 */

export interface ItemUnit {
  id: number;
  nameAr: string;
  /** Base units contained. The base unit itself has factor 1. */
  factor: number;
  isBase: boolean;
}

export function assertValidFactor(factor: number): void {
  if (!Number.isInteger(factor) || factor < 1) {
    throw new RangeError(`Unit factor must be a positive integer, got ${factor}`);
  }
}

/**
 * Convert an entered quantity into base units.
 *
 * Fractional entry is allowed (half a box of a 20-tablet pack is 10 tablets)
 * but the result must land on a whole base unit — you cannot sell half a
 * tablet when the base unit is a tablet.
 */
export function toBaseUnits(quantityInUnit: number, factor: number): number {
  assertValidFactor(factor);
  if (!Number.isFinite(quantityInUnit)) {
    throw new RangeError(`Quantity must be finite, got ${quantityInUnit}`);
  }

  const exact = quantityInUnit * factor;
  const rounded = Math.round(exact);

  // Guard against floating point entry like 0.1 * 3 producing 0.30000000000000004.
  if (Math.abs(exact - rounded) > 1e-9) {
    throw new RangeError(
      `${quantityInUnit} of a unit containing ${factor} base units is ` +
        `${exact} base units, which is not a whole number`
    );
  }

  return rounded;
}

/** Convert base units back to a (possibly fractional) quantity in the unit. */
export function fromBaseUnits(qtyBase: number, factor: number): number {
  assertValidFactor(factor);
  if (!Number.isInteger(qtyBase)) {
    throw new RangeError(`Base quantity must be an integer, got ${qtyBase}`);
  }
  return qtyBase / factor;
}

/**
 * Render base units in the largest unit that divides evenly, falling back to
 * the base unit. Used for stock displays: 24 tablets in boxes of 20 reads
 * "24 قرص", not "1.2 علبة".
 */
export function describeStock(
  qtyBase: number,
  units: ItemUnit[]
): { quantity: number; unit: ItemUnit } | null {
  if (units.length === 0) return null;

  const sorted = [...units].sort((a, b) => b.factor - a.factor);
  for (const unit of sorted) {
    if (unit.factor > 0 && qtyBase % unit.factor === 0 && qtyBase >= unit.factor) {
      return { quantity: qtyBase / unit.factor, unit };
    }
  }

  const base = units.find((u) => u.isBase) ?? sorted[sorted.length - 1]!;
  return { quantity: fromBaseUnits(qtyBase, base.factor), unit: base };
}

/** Exactly one unit must be the base, and it must have factor 1. */
export function validateUnitSet(units: ItemUnit[]): string[] {
  const errors: string[] = [];

  const bases = units.filter((u) => u.isBase);
  if (bases.length === 0) errors.push('No base unit defined');
  if (bases.length > 1) errors.push(`${bases.length} base units defined, expected exactly 1`);
  if (bases.length === 1 && bases[0]!.factor !== 1) {
    errors.push(`Base unit must have factor 1, got ${bases[0]!.factor}`);
  }

  for (const u of units) {
    if (!Number.isInteger(u.factor) || u.factor < 1) {
      errors.push(`Unit "${u.nameAr}" has invalid factor ${u.factor}`);
    }
  }

  const names = new Set<string>();
  for (const u of units) {
    if (names.has(u.nameAr)) errors.push(`Duplicate unit name "${u.nameAr}"`);
    names.add(u.nameAr);
  }

  return errors;
}
