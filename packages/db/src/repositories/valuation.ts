/**
 * قيمة المخزون — what the stock on the shelf is worth.
 *
 *   cost value   = Σ qty_on_hand × unit_cost        (per batch: the landed
 *                  cost, bonus and invoice expenses already spread in)
 *   sale value   = qty × box price ÷ units per box   (D9: the public price is
 *                  the box price; smaller units sell at their share)
 *   profit       = sale value − cost value
 *
 * Only sellable stock counts (not expired, not quarantined); expired and
 * quarantined stock are reported separately, at cost, as what will not sell.
 */

import type { Valuation, ValuationRow } from '@pharmacy/shared';
import type { Db } from '../connection';
import { TODAY } from '../time';

export function getStockValuation(db: Db, warehouseId?: number | null): Valuation {
  const wh = warehouseId ? 'AND b.warehouse_id = @wh' : '';
  const perItem = db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr, i.public_price AS publicPrice,
              SUM(CASE WHEN s.kind = 'ok' THEN b.qty_on_hand ELSE 0 END) AS qtyBase,
              SUM(CASE WHEN s.kind = 'ok' THEN b.qty_on_hand * b.unit_cost ELSE 0 END) AS costValue,
              SUM(CASE WHEN s.kind = 'expired' THEN b.qty_on_hand * b.unit_cost ELSE 0 END) AS expiredCost,
              SUM(CASE WHEN s.kind = 'quarantined' THEN b.qty_on_hand * b.unit_cost ELSE 0 END) AS quarantinedCost
       FROM batches b
       JOIN items i ON i.id = b.item_id
       JOIN (SELECT b2.id AS batchId,
                    CASE WHEN b2.is_quarantined = 1 THEN 'quarantined'
                         WHEN i2.no_expiry = 0 AND b2.expiry_date IS NOT NULL AND b2.expiry_date <= ${TODAY} THEN 'expired'
                         ELSE 'ok' END AS kind
             FROM batches b2 JOIN items i2 ON i2.id = b2.item_id) s ON s.batchId = b.id
       WHERE b.qty_on_hand > 0 ${wh}
       GROUP BY i.id`
    )
    .all(warehouseId ? { wh: warehouseId } : {}) as Array<{
    itemId: number; code: number; nameAr: string; publicPrice: number | null;
    qtyBase: number; costValue: number; expiredCost: number; quarantinedCost: number;
  }>;

  // Units of the stocked items, largest first — for the box price and for "3 علبة + 5 قرص".
  const units = new Map<number, Array<{ n: string; f: number; p: number }>>();
  const unitStmt = db.prepare('SELECT name_ar AS n, factor AS f, sale_price AS p FROM item_units WHERE item_id = ? AND allow_sale = 1 ORDER BY factor DESC');
  for (const r of perItem) units.set(r.itemId, unitStmt.all(r.itemId) as Array<{ n: string; f: number; p: number }>);

  const rows: ValuationRow[] = [];
  const totals = {
    items: 0, costValue: 0, saleValue: 0, profit: 0, marginPct: 0,
    unpricedItems: 0, unpricedCost: 0, expiredCost: 0, expiredItems: 0, quarantinedCost: 0,
  };
  let pricedCost = 0;

  for (const r of perItem) {
    totals.expiredCost += r.expiredCost;
    if (r.expiredCost > 0) totals.expiredItems += 1;
    totals.quarantinedCost += r.quarantinedCost;
    if (r.qtyBase <= 0) continue;

    const list = units.get(r.itemId) ?? [];
    const box = list[0];
    const boxPrice = box && box.p > 0 ? box.p : r.publicPrice && r.publicPrice > 0 ? r.publicPrice : null;
    const boxFactor = box?.f ?? 1;
    // One rounding per item, on integers: qty × price ÷ factor.
    const saleValue = boxPrice == null ? null : Math.round((r.qtyBase * boxPrice) / boxFactor);
    const costValue = Math.round(r.costValue);

    totals.items += 1;
    totals.costValue += costValue;
    if (saleValue == null) {
      totals.unpricedItems += 1;
      totals.unpricedCost += costValue;
    } else {
      totals.saleValue += saleValue;
      pricedCost += costValue;
    }

    rows.push({
      itemId: r.itemId,
      code: r.code,
      nameAr: r.nameAr,
      qtyBase: r.qtyBase,
      qtyText: describeQty(r.qtyBase, list),
      costValue,
      saleValue,
      profit: saleValue == null ? null : saleValue - costValue,
    });
  }

  totals.expiredCost = Math.round(totals.expiredCost);
  totals.quarantinedCost = Math.round(totals.quarantinedCost);
  totals.profit = totals.saleValue - pricedCost;
  totals.marginPct = totals.saleValue > 0 ? Math.round((totals.profit * 1000) / totals.saleValue) / 10 : 0;
  rows.sort((a, b) => b.costValue - a.costValue);
  return { totals, rows };
}

function describeQty(base: number, list: Array<{ n: string; f: number }>): string {
  if (list.length === 0) return String(base);
  const parts: string[] = [];
  let rest = base;
  for (const u of list) {
    const k = Math.floor(rest / u.f);
    if (k) parts.push(`${k} ${u.n}`);
    rest -= k * u.f;
  }
  return parts.join(' + ') || `0 ${list[list.length - 1]!.n}`;
}
