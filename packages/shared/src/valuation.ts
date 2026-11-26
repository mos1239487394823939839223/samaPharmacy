/** Stock valuation (قيمة المخزون). All money in piastres. */

export interface ValuationRow {
  itemId: number;
  code: number;
  nameAr: string;
  /** Sellable base units (not expired, not quarantined). */
  qtyBase: number;
  /** The same quantity in the item's units, e.g. "3 علبة + 5 قرص". */
  qtyText: string;
  /** What the stock cost: Σ qty × landed cost of each batch. */
  costValue: number;
  /** At today's selling price (the box price, shared down to the tablet). Null when the item has no price. */
  saleValue: number | null;
  /** saleValue − costValue; null when the item has no price. */
  profit: number | null;
}

export interface ValuationTotals {
  /** Items with sellable stock. */
  items: number;
  costValue: number;
  /** Selling value of the priced items. */
  saleValue: number;
  /** Profit on the priced items (their sale value − their cost). */
  profit: number;
  /** Profit as a share of the priced items' selling value, in percent (one decimal). */
  marginPct: number;
  /** Items in stock with no selling price — left out of saleValue/profit. */
  unpricedItems: number;
  unpricedCost: number;
  /** Past expiry, still on the shelf: cost that will not be sold. */
  expiredCost: number;
  expiredItems: number;
  /** Quarantined (returned to fridge / damaged) at cost. */
  quarantinedCost: number;
}

export interface Valuation {
  totals: ValuationTotals;
  rows: ValuationRow[];
}
