/**
 * Small helpers for screens where the pharmacist picks a unit (box, strip,
 * tablet) and types a quantity. All quantities that reach the backend are
 * expressed as (unitId, qtyInUnit); the server converts to base units.
 */

import { toAsciiDigits, toBaseUnits } from '@pharmacy/core';

export interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
  salePrice?: number;
}

/** Base units for a typed quantity: 0 when empty, null when it would split a tablet. */
export function baseQty(text: string, unit: UnitOption | undefined): number | null {
  const qty = Number(toAsciiDigits(text));
  if (!text.trim() || !Number.isFinite(qty) || qty <= 0) return 0;
  if (!unit) return null;
  try {
    return toBaseUnits(qty, unit.factor);
  } catch {
    return null;
  }
}

/** "2 علبة" / "15 قرص" — the largest unit that divides the quantity evenly. */
export function describeQty(base: number, units: UnitOption[]): string {
  const fit = [...units].sort((a, b) => b.factor - a.factor).find((u) => base >= u.factor && base % u.factor === 0);
  const unit = fit ?? units.find((u) => u.factor === 1) ?? units[units.length - 1];
  return unit ? `${base / unit.factor} ${unit.nameAr}` : String(base);
}

/** Units of an item, largest first. */
export async function loadUnits(itemId: number): Promise<UnitOption[]> {
  const detail = await window.api!.items.get(itemId);
  return (detail?.units ?? [])
    .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice }))
    .sort((a, b) => b.factor - a.factor);
}

/** Stock the way it sits on the shelf: «17 علبة + 18 قرص» (largest unit first). */
export function mixedQty(base: number, units: UnitOption[]): string {
  if (base <= 0 || units.length === 0) return String(base);
  const sorted = [...units].sort((a, b) => b.factor - a.factor);
  const box = sorted[0]!;
  const smallest = sorted[sorted.length - 1]!;
  if (box.factor <= 1) return `${base} ${box.nameAr}`;
  const boxes = Math.floor(base / box.factor);
  const rest = base % box.factor;
  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} ${box.nameAr}`);
  if (rest > 0) parts.push(`${rest} ${smallest.nameAr}`);
  return parts.join(' + ');
}
