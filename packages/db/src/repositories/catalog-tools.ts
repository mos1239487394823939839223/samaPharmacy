/**
 * Catalogue helpers for the counter and for cleaning up item data.
 *
 *   findAlternatives    — البدائل: other items with the same active ingredient,
 *                          sellable stock first, then cheapest (spec M4: "the
 *                          single highest-value feature at the counter").
 *   unitPriceIssues     — items whose smaller units are priced above their share
 *                          of the box (e.g. a tablet priced like a whole box,
 *                          found on 120 of 122 items in the existing data).
 *   fixUnitPrices       — set those units to exactly their share (decision D9).
 */

import { boxFactorOf, DomainError, maxUnitPrice, normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW, TODAY } from '../time';

export interface AlternativeRow {
  itemId: number;
  code: number;
  nameAr: string;
  scientificName: string | null;
  publicPrice: number | null;
  /** Sellable base units in the warehouse. */
  qtyOnHand: number;
  shelfLocation: string | null;
}

export function findAlternatives(db: Db, itemId: number, warehouseId: number, limit = 30): AlternativeRow[] {
  const item = db
    .prepare('SELECT main_ingredient_id AS ing, ingredient_norm AS norm, scientific_name AS sci FROM items WHERE id = ?')
    .get(itemId) as { ing: number | null; norm: string | null; sci: string | null } | undefined;
  if (!item) return [];
  const norm = item.norm ?? (item.sci ? normalizeName(item.sci) : null);
  if (!item.ing && !norm) return [];

  return db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr, i.scientific_name AS scientificName,
              i.public_price AS publicPrice, i.shelf_location AS shelfLocation,
              COALESCE((SELECT SUM(b.qty_on_hand) FROM batches b
                        WHERE b.item_id = i.id AND b.warehouse_id = @wh AND b.is_quarantined = 0
                          AND (i.no_expiry = 1 OR b.expiry_date IS NULL OR b.expiry_date > ${TODAY})), 0) AS qtyOnHand
       FROM items i
       WHERE i.is_active = 1 AND i.id != @id
         AND ((@ing IS NOT NULL AND i.main_ingredient_id = @ing) OR (@norm IS NOT NULL AND i.ingredient_norm = @norm))
       ORDER BY (qtyOnHand > 0) DESC, COALESCE(i.public_price, 999999999), i.name_ar
       LIMIT @limit`
    )
    .all({ id: itemId, wh: warehouseId, ing: item.ing, norm, limit }) as AlternativeRow[];
}

export interface UnitPriceIssue {
  itemId: number;
  code: number;
  nameAr: string;
  publicPrice: number | null;
  units: Array<{ unitId: number; nameAr: string; factor: number; salePrice: number; suggested: number }>;
}

/**
 * Units priced above their share of the box. The box price is the item's
 * public price when set, otherwise the sale price of its largest unit.
 */
export function unitPriceIssues(db: Db): UnitPriceIssue[] {
  const rows = db
    .prepare(
      `SELECT i.id AS itemId, i.code, i.name_ar AS nameAr, i.public_price AS publicPrice,
              u.id AS unitId, u.name_ar AS unitName, u.factor, u.sale_price AS salePrice
       FROM items i JOIN item_units u ON u.item_id = i.id AND u.allow_sale = 1
       WHERE i.is_active = 1
       ORDER BY i.name_ar, u.factor DESC`
    )
    .all() as Array<{ itemId: number; code: number; nameAr: string; publicPrice: number | null; unitId: number; unitName: string; factor: number; salePrice: number }>;

  const byItem = new Map<number, typeof rows>();
  for (const r of rows) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);

  const issues: UnitPriceIssue[] = [];
  for (const units of byItem.values()) {
    if (units.length < 2) continue;
    const box = boxFactorOf(units);
    const boxPrice = units[0]!.publicPrice ?? units.find((u) => u.factor === box)!.salePrice;
    const bad = units
      .filter((u) => u.factor < box)
      .map((u) => ({ unitId: u.unitId, nameAr: u.unitName, factor: u.factor, salePrice: u.salePrice, suggested: maxUnitPrice(boxPrice, box, u.factor) }))
      .filter((u) => u.salePrice > u.suggested);
    if (bad.length > 0) {
      const head = units[0]!;
      issues.push({ itemId: head.itemId, code: head.code, nameAr: head.nameAr, publicPrice: head.publicPrice, units: bad });
    }
  }
  return issues;
}

/** Apply the suggested share prices to the given items' over-priced units. Returns units changed. */
export function fixUnitPrices(db: Db, itemIds: number[], userId: number): number {
  if (itemIds.length === 0) throw new DomainError('items.nothingSelected', 'No items selected');
  return db.transaction(() => {
    const wanted = new Set(itemIds);
    const update = db.prepare('UPDATE item_units SET sale_price = ? WHERE id = ?');
    const touch = db.prepare(`UPDATE items SET updated_at = ${NOW} WHERE id = ?`);
    let changed = 0;
    for (const issue of unitPriceIssues(db)) {
      if (!wanted.has(issue.itemId)) continue;
      for (const u of issue.units) {
        update.run(u.suggested, u.unitId);
        changed++;
      }
      touch.run(issue.itemId);
    }
    void userId;
    return changed;
  })();
}

export interface ReceiptLine {
  name: string;
  unitName: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  serial: number;
  status: string;
  invoiceType: 'cash' | 'credit';
  dateTime: string;
  cashier: string;
  customerName: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  extraCharge: number;
  total: number;
  /** Insured sale: company share and name; patientPays = total − insuranceShare. */
  insuranceShare: number;
  insuranceCompany: string | null;
  patientPays: number;
  tendered: number | null;
  change: number;
}

/** Everything a receipt needs, from the database (the renderer never assembles a receipt). */
export function getReceiptData(db: Db, invoiceId: number): ReceiptData {
  const inv = db
    .prepare(
      `SELECT s.serial, s.status, s.invoice_type AS invoiceType, COALESCE(s.confirmed_at, s.created_at) AS dateTime,
              u.display_name AS cashier, CASE WHEN c.print_name_on_invoice = 1 THEN c.name END AS customerName,
              s.subtotal, s.line_discount_total + s.extra_discount_amt AS discount, s.extra_charge AS extraCharge,
              s.total, s.cash_tendered AS tendered, s.insurance_share AS insuranceShare, ic.name_ar AS insuranceCompany
       FROM sales_invoices s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN insurance_companies ic ON ic.id = s.insurance_company_id
       WHERE s.id = ?`
    )
    .get(invoiceId) as Omit<ReceiptData, 'lines' | 'change' | 'patientPays'> | undefined;
  if (!inv) throw new DomainError('sale.notFound', `Sales invoice ${invoiceId} not found`);

  // Physical lines split across batches are merged back into what the customer bought.
  const lines = db
    .prepare(
      `SELECT i.name_ar AS name, un.name_ar AS unitName, SUM(l.qty_in_unit) AS qty, l.unit_price AS unitPrice,
              SUM(l.value_after_discount) AS total
       FROM sales_invoice_lines l
       JOIN items i ON i.id = l.item_id
       JOIN item_units un ON un.id = l.unit_id
       WHERE l.invoice_id = ?
       GROUP BY l.item_id, l.unit_id, l.unit_price
       ORDER BY MIN(l.line_no)`
    )
    .all(invoiceId) as ReceiptLine[];

  return {
    ...inv,
    cashier: inv.cashier ?? '',
    lines: lines.map((l) => ({ ...l, qty: Math.round(l.qty * 1000) / 1000 })),
    patientPays: inv.total - inv.insuranceShare,
    change: inv.invoiceType === 'cash' && inv.tendered != null ? inv.tendered - (inv.total - inv.insuranceShare) : 0,
  };
}
