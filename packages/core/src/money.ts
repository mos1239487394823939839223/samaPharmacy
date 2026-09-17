/**
 * Money — integer piastres only.
 *
 * SQLite has no decimal type and REAL drifts: 200.00 becomes
 * 199.99999999999997 after enough arithmetic, and it surfaces on a receipt
 * eventually (CLAUDE.md rule 1, blueprint §2.5).
 *
 * Every value here is an integer count of piastres. 100 piastres = 1 EGP.
 * Nothing in this module produces a fractional value, and callers must not
 * perform their own arithmetic on money.
 */

import { toAsciiDigits } from './arabic';

/** Branded so a bare number cannot be passed where piastres are expected. */
export type Piastres = number;

export const PIASTRES_PER_EGP = 100;

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite, got ${value}`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer piastre value, got ${value}`);
  }
}

/**
 * Parse a user-entered EGP amount into piastres.
 *
 * Works on the decimal string rather than float maths: `Math.round(19.99 * 100)`
 * is correct here but the same pattern fails for values like 1.005, and the
 * failures are data-dependent and rare enough to reach production.
 */
export function toPiastres(input: string | number): Piastres {
  const text = typeof input === 'number' ? String(input) : toAsciiDigits(input.trim());

  if (text === '') throw new RangeError('Empty money value');

  const match = /^(-)?(\d*)(?:[.,](\d*))?$/.exec(text);
  if (!match) throw new RangeError(`Not a valid money value: ${input}`);

  const [, sign, whole = '', frac = ''] = match;
  if (whole === '' && frac === '') throw new RangeError(`Not a valid money value: ${input}`);

  if (frac.length > 2) {
    throw new RangeError(
      `Money has at most 2 decimal places, got ${frac.length} in "${input}"`
    );
  }

  const padded = (frac + '00').slice(0, 2);
  const value = Number(whole || '0') * PIASTRES_PER_EGP + Number(padded);

  assertSafeInteger(value, 'money');
  return sign === '-' ? -value : value;
}

/** Piastres to a plain decimal string, e.g. 20000 -> "200.00". */
export function fromPiastres(value: Piastres): string {
  assertSafeInteger(value, 'money');
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.trunc(abs / PIASTRES_PER_EGP);
  const frac = abs % PIASTRES_PER_EGP;
  return `${negative ? '-' : ''}${whole}.${String(frac).padStart(2, '0')}`;
}

/** Display form with the Egyptian pound suffix. */
export function formatEGP(value: Piastres): string {
  return `${fromPiastres(value)} ج.م`;
}

export function addMoney(...values: Piastres[]): Piastres {
  let total = 0;
  for (const v of values) {
    assertSafeInteger(v, 'money');
    total += v;
  }
  assertSafeInteger(total, 'money sum');
  return total;
}

export function subtractMoney(a: Piastres, b: Piastres): Piastres {
  assertSafeInteger(a, 'money');
  assertSafeInteger(b, 'money');
  return a - b;
}

/**
 * Multiply money by a whole quantity. Exact — no rounding involved.
 */
export function multiplyMoney(value: Piastres, quantity: number): Piastres {
  assertSafeInteger(value, 'money');
  if (!Number.isInteger(quantity)) {
    throw new RangeError(`Quantity must be an integer, got ${quantity}`);
  }
  const result = value * quantity;
  assertSafeInteger(result, 'money product');
  return result;
}

/**
 * Apply a percentage, rounding half away from zero.
 *
 * Half-up is the convention staff expect from a till: 0.5 piastre rounds to 1,
 * not to the nearest even value. JavaScript's Math.round breaks ties toward
 * +Infinity, which is asymmetric for negatives, so the sign is handled
 * explicitly — refunds must mirror the sale exactly.
 */
export function percentOf(value: Piastres, percent: number): Piastres {
  assertSafeInteger(value, 'money');
  if (!Number.isFinite(percent)) {
    throw new RangeError(`Percent must be finite, got ${percent}`);
  }
  const exact = (value * percent) / 100;
  const rounded = Math.sign(exact) * Math.round(Math.abs(exact));
  assertSafeInteger(rounded, 'money percentage');
  // Normalize -0 to 0 so equality checks and stored values stay clean.
  return rounded === 0 ? 0 : rounded;
}

/**
 * Split an amount across n parts as evenly as possible, with no drift.
 *
 * The remainder is distributed one piastre at a time to the earliest parts, so
 * the parts always sum exactly back to the input. Used for allocating header
 * expenses and discounts across purchase lines (M4 landed cost), where a lost
 * piastre means batch costs that do not reconcile to the invoice total.
 */
export function allocate(total: Piastres, weights: number[]): Piastres[] {
  assertSafeInteger(total, 'money');
  if (weights.length === 0) return [];
  if (weights.some((w) => w < 0 || !Number.isFinite(w))) {
    throw new RangeError('Allocation weights must be finite and non-negative');
  }

  const weightSum = weights.reduce((a, b) => a + b, 0);

  // All-zero weights (e.g. a fully discounted invoice) still need a defined
  // split, so fall back to equal shares rather than dividing by zero.
  const effective = weightSum === 0 ? weights.map(() => 1) : weights;
  const effectiveSum = weightSum === 0 ? weights.length : weightSum;

  const raw = effective.map((w) => (total * w) / effectiveSum);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = total - floored.reduce((a, b) => a + b, 0);

  // Hand the remaining piastres to the largest fractional parts first, so the
  // allocation is stable and as close to proportional as integers allow.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floored];
  let cursor = 0;
  while (remainder > 0 && order.length > 0) {
    const entry = order[cursor % order.length]!;
    result[entry.i] = result[entry.i]! + 1;
    remainder -= 1;
    cursor += 1;
  }
  while (remainder < 0 && order.length > 0) {
    const entry = order[cursor % order.length]!;
    result[entry.i] = result[entry.i]! - 1;
    remainder += 1;
    cursor += 1;
  }

  return result;
}
