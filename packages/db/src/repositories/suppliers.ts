/**
 * Supplier repository. Feeds the supplier autocomplete on فاتورة شراء
 * (blueprint §1.7) and the supplier ledger.
 */

import { DomainError, normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';

export interface SupplierRow {
  id: number;
  code: number;
  nameAr: string;
  phone1: string | null;
  phone2: string | null;
  address: string | null;
  taxNumber: string | null;
  openingBalance: number;
  paymentTermsDays: number | null;
  isActive: number;
  /** Current balance — positive means the pharmacy owes the supplier. */
  balance: number;
}

export interface SupplierInput {
  nameAr: string;
  phone1?: string | null;
  phone2?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  openingBalance?: number;
  paymentTermsDays?: number | null;
}

const SELECT = `
  SELECT id, code, name_ar AS nameAr, phone1, phone2, address,
         tax_number AS taxNumber, opening_balance AS openingBalance,
         payment_terms_days AS paymentTermsDays, is_active AS isActive,
         COALESCE((SELECT sl.balance_after FROM supplier_ledger sl
                   WHERE sl.supplier_id = suppliers.id ORDER BY sl.id DESC LIMIT 1),
                  opening_balance) AS balance
  FROM suppliers
`;

export function listSuppliers(db: Db, limit = 200): SupplierRow[] {
  return db
    .prepare(`${SELECT} WHERE is_active = 1 ORDER BY name_ar LIMIT ?`)
    .all(limit) as SupplierRow[];
}

export function searchSuppliers(db: Db, query: string, limit = 20): SupplierRow[] {
  const norm = normalizeName(query);
  if (!norm) return [];
  return db
    .prepare(`${SELECT} WHERE is_active = 1 AND name_norm LIKE ? ORDER BY name_ar LIMIT ?`)
    .all(`%${norm}%`, limit) as SupplierRow[];
}

export function getSupplier(db: Db, id: number): SupplierRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as SupplierRow | undefined;
}

/** Current balance from the ledger — positive means the pharmacy owes the supplier. */
export function getSupplierBalance(db: Db, id: number): number {
  const row = db
    .prepare(
      'SELECT balance_after AS b FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT 1'
    )
    .get(id) as { b: number } | undefined;
  if (row) return row.b;

  const supplier = getSupplier(db, id);
  return supplier?.openingBalance ?? 0;
}

export function createSupplier(db: Db, input: SupplierInput): number {
  const run = db.transaction((data: SupplierInput) => {
    const code = nextSequence(db, 'supplier_code');
    const result = db
      .prepare(
        `INSERT INTO suppliers (code, name_ar, name_norm, phone1, phone2, address,
           tax_number, opening_balance, payment_terms_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        code,
        data.nameAr.trim(),
        normalizeName(data.nameAr),
        data.phone1 ?? null,
        data.phone2 ?? null,
        data.address ?? null,
        data.taxNumber ?? null,
        data.openingBalance ?? 0,
        data.paymentTermsDays ?? null
      );
    const supplierId = Number(result.lastInsertRowid);

    if (data.openingBalance) {
      db.prepare(
        `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, note, at)
         VALUES (?, 'opening', 0, ?, ?, 'رصيد افتتاحي', ${NOW})`
      ).run(supplierId, data.openingBalance, data.openingBalance);
    }

    return supplierId;
  });
  return run(input);
}

export function updateSupplier(db: Db, id: number, input: SupplierInput): void {
  db.prepare(
    `UPDATE suppliers SET name_ar = ?, name_norm = ?, phone1 = ?, phone2 = ?,
       address = ?, tax_number = ?, payment_terms_days = ? WHERE id = ?`
  ).run(
    input.nameAr.trim(),
    normalizeName(input.nameAr),
    input.phone1 ?? null,
    input.phone2 ?? null,
    input.address ?? null,
    input.taxNumber ?? null,
    input.paymentTermsDays ?? null,
    id
  );
}

export function deactivateSupplier(db: Db, id: number): void {
  const balance = getSupplierBalance(db, id);
  if (balance !== 0) {
    throw new DomainError('supplier.hasBalance', `Supplier ${id} has a non-zero balance (${balance})`, { balance });
  }
  db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
}

/**
 * Pay a supplier (سداد مورد). Paid from the safe, not the shift drawer
 * (decision D13), so no cash_transactions row.
 */
export function recordSupplierPayment(db: Db, supplierId: number, amount: number, note?: string | null): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new DomainError('payment.amountInvalid', `Payment amount must be a positive integer, got ${amount}`);
  }
  db.transaction(() => {
    if (!getSupplier(db, supplierId)) throw new DomainError('supplier.notFound', `Supplier ${supplierId} not found`);
    const after = getSupplierBalance(db, supplierId) - amount;
    db.prepare(
      `INSERT INTO supplier_ledger (supplier_id, entry_type, debit, credit, balance_after, note, at)
       VALUES (?, 'payment', ?, 0, ?, ?, ${NOW})`
    ).run(supplierId, amount, after, note?.trim() || null);
  })();
}

export interface SupplierLedgerRow {
  id: number;
  at: string;
  entryType: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  refTable: string | null;
  refId: number | null;
  note: string | null;
}

export function getSupplierLedger(db: Db, supplierId: number, limit = 200): SupplierLedgerRow[] {
  return db
    .prepare(
      `SELECT id, at, entry_type AS entryType, debit, credit, balance_after AS balanceAfter,
              ref_table AS refTable, ref_id AS refId, note
       FROM supplier_ledger WHERE supplier_id = ? ORDER BY id DESC LIMIT ?`
    )
    .all(supplierId, limit) as SupplierLedgerRow[];
}
