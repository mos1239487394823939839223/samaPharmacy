/**
 * One shape for every printable document (sales/purchase invoices and their
 * returns), so a single A4 template prints all four. Read-only.
 */

import { DomainError } from '@pharmacy/core';
import type { PrintableDocument, PrintableKind, PrintableLine } from '@pharmacy/shared';
import type { Db } from '../connection';

const qty3 = (n: number) => Math.round(n * 1000) / 1000;

export function getPrintableDocument(db: Db, kind: PrintableKind, id: number): PrintableDocument {
  switch (kind) {
    case 'sale':
      return sale(db, id);
    case 'purchase':
      return purchase(db, id);
    case 'salesReturn':
      return salesReturn(db, id);
    case 'purchaseReturn':
      return purchaseReturn(db, id);
  }
}

function notFound(kind: string, id: number): never {
  throw new DomainError('print.documentNotFound', `${kind} ${id} not found`, { id });
}

function sale(db: Db, id: number): PrintableDocument {
  const h = db
    .prepare(
      `SELECT s.serial, s.status, s.invoice_type AS paymentType, COALESCE(s.confirmed_at, s.created_at) AS date,
              c.name AS partyName, c.mobile1 AS partyPhone, s.subtotal,
              s.line_discount_total + s.extra_discount_amt AS discount, s.extra_charge AS extra, s.total,
              ic.name_ar AS insuranceCompany, s.insurance_share AS insuranceShare, s.notes
       FROM sales_invoices s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN insurance_companies ic ON ic.id = s.insurance_company_id
       WHERE s.id = ?`
    )
    .get(id) as Omit<PrintableDocument, 'kind' | 'lines' | 'reference' | 'tax'> | undefined;
  if (!h) notFound('sale', id);
  // Lines split across batches are merged back into what the customer bought.
  const lines = db
    .prepare(
      `SELECT i.name_ar AS name, un.name_ar AS unitName, SUM(l.qty_in_unit) AS qty, l.unit_price AS unitPrice,
              SUM(l.value_after_discount) AS total
       FROM sales_invoice_lines l JOIN items i ON i.id = l.item_id JOIN item_units un ON un.id = l.unit_id
       WHERE l.invoice_id = ? GROUP BY l.item_id, l.unit_id, l.unit_price ORDER BY MIN(l.line_no)`
    )
    .all(id) as PrintableLine[];
  return { ...h, kind: 'sale', reference: null, tax: 0, lines: lines.map((l) => ({ ...l, qty: qty3(l.qty) })) };
}

function purchase(db: Db, id: number): PrintableDocument {
  const h = db
    .prepare(
      `SELECT p.serial, p.status, p.purchase_type AS paymentType, p.invoice_date AS date, s.name_ar AS partyName,
              s.phone1 AS partyPhone, p.supplier_invoice_no AS reference, p.subtotal, p.extra_discount_amt AS discount,
              p.expenses AS extra, p.tax_total AS tax, p.total, p.notes
       FROM purchase_invoices p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`
    )
    .get(id) as Omit<PrintableDocument, 'kind' | 'lines' | 'insuranceCompany' | 'insuranceShare'> | undefined;
  if (!h) notFound('purchase', id);
  const rows = db
    .prepare(
      `SELECT i.name_ar AS name, un.name_ar AS unitName, l.qty_in_unit AS qty, l.bonus_in_unit AS bonus,
              l.unit_purchase_price AS unitPrice, l.value_after_tax AS total, l.batch_number AS batch, l.expiry_date AS expiry
       FROM purchase_invoice_lines l JOIN items i ON i.id = l.item_id JOIN item_units un ON un.id = l.unit_id
       WHERE l.invoice_id = ? ORDER BY l.line_no`
    )
    .all(id) as Array<PrintableLine & { bonus: number; batch: string | null; expiry: string | null }>;
  const lines = rows.map(({ bonus, batch, expiry, ...l }) => ({
    ...l,
    qty: qty3(l.qty),
    note: [bonus ? `+${qty3(bonus)}` : null, batch, expiry].filter(Boolean).join(' · ') || null,
  }));
  return { ...h, kind: 'purchase', insuranceCompany: null, insuranceShare: 0, lines };
}

function salesReturn(db: Db, id: number): PrintableDocument {
  const h = db
    .prepare(
      `SELECT r.serial, r.status, r.refund_method AS paymentType, r.created_at AS date, c.name AS partyName,
              c.mobile1 AS partyPhone, CAST(s.serial AS TEXT) AS reference, r.total, r.reason AS notes,
              r.insurance_portion AS insuranceShare
       FROM sales_returns r LEFT JOIN customers c ON c.id = r.customer_id
       LEFT JOIN sales_invoices s ON s.id = r.source_invoice_id WHERE r.id = ?`
    )
    .get(id) as (Pick<PrintableDocument, 'serial' | 'status' | 'paymentType' | 'date' | 'partyName' | 'partyPhone' | 'reference' | 'total' | 'notes'> & { insuranceShare: number | null }) | undefined;
  if (!h) notFound('salesReturn', id);
  const lines = db
    .prepare(
      `SELECT i.name_ar AS name, un.name_ar AS unitName, l.qty_in_unit AS qty, l.unit_price AS unitPrice, l.line_total AS total
       FROM sales_return_lines l JOIN items i ON i.id = l.item_id JOIN item_units un ON un.id = l.unit_id
       WHERE l.return_id = ? ORDER BY l.id`
    )
    .all(id) as PrintableLine[];
  return {
    ...h,
    kind: 'salesReturn',
    subtotal: h.total,
    discount: 0,
    extra: 0,
    tax: 0,
    insuranceCompany: null,
    insuranceShare: h.insuranceShare ?? 0,
    lines: lines.map((l) => ({ ...l, qty: qty3(l.qty) })),
  };
}

function purchaseReturn(db: Db, id: number): PrintableDocument {
  const h = db
    .prepare(
      `SELECT r.serial, r.status, r.created_at AS date, s.name_ar AS partyName, s.phone1 AS partyPhone,
              CAST(p.serial AS TEXT) AS reference, r.total, r.reason AS notes
       FROM purchase_returns r JOIN suppliers s ON s.id = r.supplier_id
       LEFT JOIN purchase_invoices p ON p.id = r.source_invoice_id WHERE r.id = ?`
    )
    .get(id) as Pick<PrintableDocument, 'serial' | 'status' | 'date' | 'partyName' | 'partyPhone' | 'reference' | 'total' | 'notes'> | undefined;
  if (!h) notFound('purchaseReturn', id);
  const rows = db
    .prepare(
      `SELECT i.name_ar AS name, un.name_ar AS unitName, l.qty_in_unit AS qty, l.line_total AS total
       FROM purchase_return_lines l JOIN items i ON i.id = l.item_id JOIN item_units un ON un.id = l.unit_id
       WHERE l.return_id = ? ORDER BY l.id`
    )
    .all(id) as Array<Omit<PrintableLine, 'unitPrice'>>;
  return {
    ...h,
    kind: 'purchaseReturn',
    paymentType: null,
    subtotal: h.total,
    discount: 0,
    extra: 0,
    tax: 0,
    insuranceCompany: null,
    insuranceShare: 0,
    lines: rows.map((l) => ({ ...l, qty: qty3(l.qty), unitPrice: l.qty ? Math.round(l.total / l.qty) : l.total })),
  };
}
