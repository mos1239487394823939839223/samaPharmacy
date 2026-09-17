/**
 * Customer repository. العملاء — blueprint §1.5, both screens (customer
 * master and demographics), plus the credit ledger sales already reference
 * via sales_invoices.customer_id.
 *
 * D8 (docs/DECISIONS.md) settles the three discount rates: cash, credit, and
 * a whole-invoice override. This repository stores and returns them; which
 * one a sale actually applies is decided at the POS, not here.
 */

import { normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { nextSequence } from './items';

export interface CustomerAddressInput {
  deliveryAddress?: string | null;
  governorateId?: number | null;
  cityId?: number | null;
  area?: string | null;
  isDefault?: boolean;
}

export interface CustomerInput {
  name: string;
  mobile1: string;
  mobile2?: string | null;
  email?: string | null;
  pharmacyOwnerName?: string | null;
  pharmacyPhone?: string | null;
  accountType?: 'individual' | 'pharmacy' | 'clinic' | 'company';
  parentCustomerId?: number | null;
  installmentCompany?: string | null;
  installmentTier?: string | null;
  paymentMethod?: 'cash' | 'credit';
  openingBalance?: number;
  creditLimit?: number | null;
  insuranceNumber?: string | null;
  isVip?: boolean;
  printNameOnInvoice?: boolean;
  sellAtCost?: boolean;
  discountCashPct?: number;
  discountCreditPct?: number;
  discountInvoicePct?: number;
  gender?: 'male' | 'female' | null;
  maritalStatus?: string | null;
  birthDate?: string | null;
  hasChildren?: boolean;
  childrenCount?: number | null;
  notes?: string | null;
  addresses?: CustomerAddressInput[];
  tags?: string[];
}

export interface CustomerRow {
  id: number;
  code: number;
  name: string;
  mobile1: string;
  mobile2: string | null;
  email: string | null;
  pharmacyOwnerName: string | null;
  accountType: string;
  paymentMethod: string;
  openingBalance: number;
  creditLimit: number | null;
  isVip: number;
  isSuspended: number;
  discountCashPct: number;
  discountCreditPct: number;
  discountInvoicePct: number;
  sellAtCost: number;
  isActive: number;
}

const SELECT = `
  SELECT id, code, name, mobile1, mobile2, email,
         pharmacy_owner_name AS pharmacyOwnerName, account_type AS accountType,
         payment_method AS paymentMethod, opening_balance AS openingBalance,
         credit_limit AS creditLimit, is_vip AS isVip, is_suspended AS isSuspended,
         discount_cash_pct AS discountCashPct, discount_credit_pct AS discountCreditPct,
         discount_invoice_pct AS discountInvoicePct, sell_at_cost AS sellAtCost,
         is_active AS isActive
  FROM customers
`;

export function listCustomers(db: Db, limit = 200): CustomerRow[] {
  return db.prepare(`${SELECT} WHERE is_active = 1 ORDER BY name LIMIT ?`).all(limit) as CustomerRow[];
}

export function searchCustomers(db: Db, query: string, limit = 20): CustomerRow[] {
  const norm = normalizeName(query);
  if (!norm) return [];
  // Also match on mobile1 directly (unnormalized) — staff frequently look a
  // credit customer up by phone number, not by name.
  return db
    .prepare(
      `${SELECT} WHERE is_active = 1 AND (name_norm LIKE ? OR mobile1 LIKE ?) ORDER BY name LIMIT ?`
    )
    .all(`%${norm}%`, `%${query.trim()}%`, limit) as CustomerRow[];
}

export function getCustomer(db: Db, id: number): CustomerRow | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as CustomerRow | undefined;
}

export function getCustomerAddresses(db: Db, customerId: number) {
  return db
    .prepare(
      `SELECT id, delivery_address AS deliveryAddress, governorate_id AS governorateId,
              city_id AS cityId, area, is_default AS isDefault
       FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id`
    )
    .all(customerId);
}

export function getCustomerTags(db: Db, customerId: number): string[] {
  const rows = db
    .prepare('SELECT tag FROM customer_tags WHERE customer_id = ? ORDER BY tag')
    .all(customerId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

/** Current balance from the ledger — positive means the customer owes the pharmacy. */
export function getCustomerBalance(db: Db, id: number): number {
  const row = db
    .prepare(
      'SELECT balance_after AS b FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT 1'
    )
    .get(id) as { b: number } | undefined;
  if (row) return row.b;
  const customer = getCustomer(db, id);
  return customer?.openingBalance ?? 0;
}

function replaceAddresses(db: Db, customerId: number, addresses: CustomerAddressInput[]): void {
  db.prepare('DELETE FROM customer_addresses WHERE customer_id = ?').run(customerId);
  const insert = db.prepare(
    `INSERT INTO customer_addresses (customer_id, delivery_address, governorate_id, city_id, area, is_default)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  addresses.forEach((a, i) => {
    insert.run(
      customerId,
      a.deliveryAddress ?? null,
      a.governorateId ?? null,
      a.cityId ?? null,
      a.area ?? null,
      a.isDefault || i === 0 ? 1 : 0
    );
  });
}

function replaceTags(db: Db, customerId: number, tags: string[]): void {
  db.prepare('DELETE FROM customer_tags WHERE customer_id = ?').run(customerId);
  const insert = db.prepare('INSERT INTO customer_tags (customer_id, tag) VALUES (?, ?)');
  for (const tag of new Set(tags.map((t) => t.trim()).filter(Boolean))) {
    insert.run(customerId, tag);
  }
}

export function createCustomer(db: Db, input: CustomerInput): number {
  const run = db.transaction((data: CustomerInput) => {
    const code = nextSequence(db, 'customer_code');
    const result = db
      .prepare(
        `INSERT INTO customers (
           code, name, name_norm, mobile1, mobile2, email,
           pharmacy_owner_name, pharmacy_phone, account_type, parent_customer_id,
           installment_company, installment_tier, payment_method, opening_balance,
           credit_limit, insurance_number, is_vip, print_name_on_invoice, sell_at_cost,
           discount_cash_pct, discount_credit_pct, discount_invoice_pct,
           gender, marital_status, birth_date, has_children, children_count, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        code,
        data.name,
        normalizeName(data.name),
        data.mobile1,
        data.mobile2 ?? null,
        data.email ?? null,
        data.pharmacyOwnerName ?? null,
        data.pharmacyPhone ?? null,
        data.accountType ?? 'individual',
        data.parentCustomerId ?? null,
        data.installmentCompany ?? null,
        data.installmentTier ?? null,
        data.paymentMethod ?? 'cash',
        data.openingBalance ?? 0,
        data.creditLimit ?? null,
        data.insuranceNumber ?? null,
        data.isVip ? 1 : 0,
        data.printNameOnInvoice === false ? 0 : 1,
        data.sellAtCost ? 1 : 0,
        data.discountCashPct ?? 0,
        data.discountCreditPct ?? 0,
        data.discountInvoicePct ?? 0,
        data.gender ?? null,
        data.maritalStatus ?? null,
        data.birthDate ?? null,
        data.hasChildren ? 1 : 0,
        data.childrenCount ?? null,
        data.notes ?? null
      );

    const customerId = Number(result.lastInsertRowid);

    if (data.openingBalance) {
      db.prepare(
        `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, note)
         VALUES (?, 'opening', ?, 0, ?, 'رصيد افتتاحي')`
      ).run(customerId, data.openingBalance, data.openingBalance);
    }

    replaceAddresses(db, customerId, data.addresses ?? []);
    replaceTags(db, customerId, data.tags ?? []);

    return customerId;
  });

  return run(input);
}

export function updateCustomer(db: Db, id: number, input: CustomerInput): void {
  const run = db.transaction((data: CustomerInput) => {
    db.prepare(
      `UPDATE customers SET
         name = ?, name_norm = ?, mobile1 = ?, mobile2 = ?, email = ?,
         pharmacy_owner_name = ?, pharmacy_phone = ?, account_type = ?,
         parent_customer_id = ?, installment_company = ?, installment_tier = ?,
         payment_method = ?, credit_limit = ?, insurance_number = ?,
         is_vip = ?, print_name_on_invoice = ?, sell_at_cost = ?,
         discount_cash_pct = ?, discount_credit_pct = ?, discount_invoice_pct = ?,
         gender = ?, marital_status = ?, birth_date = ?, has_children = ?,
         children_count = ?, notes = ?
       WHERE id = ?`
    ).run(
      data.name,
      normalizeName(data.name),
      data.mobile1,
      data.mobile2 ?? null,
      data.email ?? null,
      data.pharmacyOwnerName ?? null,
      data.pharmacyPhone ?? null,
      data.accountType ?? 'individual',
      data.parentCustomerId ?? null,
      data.installmentCompany ?? null,
      data.installmentTier ?? null,
      data.paymentMethod ?? 'cash',
      data.creditLimit ?? null,
      data.insuranceNumber ?? null,
      data.isVip ? 1 : 0,
      data.printNameOnInvoice === false ? 0 : 1,
      data.sellAtCost ? 1 : 0,
      data.discountCashPct ?? 0,
      data.discountCreditPct ?? 0,
      data.discountInvoicePct ?? 0,
      data.gender ?? null,
      data.maritalStatus ?? null,
      data.birthDate ?? null,
      data.hasChildren ? 1 : 0,
      data.childrenCount ?? null,
      data.notes ?? null,
      id
    );

    if (data.addresses) replaceAddresses(db, id, data.addresses);
    if (data.tags) replaceTags(db, id, data.tags);
  });

  run(input);
}

/** إيقاف حساب العميل — suspends credit/purchase activity without deleting history. */
export function suspendCustomer(db: Db, id: number): void {
  db.prepare('UPDATE customers SET is_suspended = 1 WHERE id = ?').run(id);
}

export function unsuspendCustomer(db: Db, id: number): void {
  db.prepare('UPDATE customers SET is_suspended = 0 WHERE id = ?').run(id);
}

export function deactivateCustomer(db: Db, id: number): void {
  db.prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(id);
}

/**
 * Post a credit sale to the ledger and enforce the credit limit. Called by
 * the sales confirm path for credit invoices; kept here since it is
 * fundamentally a customer-account operation, not a sale mechanic.
 *
 * A suspended customer cannot be extended further credit at all, regardless
 * of limit — إيقاف حساب العميل blocks new debt outright.
 */
export function postCreditSale(db: Db, customerId: number, amount: number, refId: number): void {
  const customer = getCustomer(db, customerId);
  if (!customer) throw new Error(`Customer ${customerId} not found`);
  if (customer.isSuspended) {
    throw new Error(`Customer ${customer.name} (#${customer.code}) is suspended — cannot extend credit`);
  }

  const balanceBefore = getCustomerBalance(db, customerId);
  const balanceAfter = balanceBefore + amount;

  if (customer.creditLimit !== null && balanceAfter > customer.creditLimit) {
    throw new Error(
      `Credit limit exceeded for ${customer.name} (#${customer.code}): balance would be ` +
        `${balanceAfter}, limit is ${customer.creditLimit}`
    );
  }

  db.prepare(
    `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, ref_table, ref_id)
     VALUES (?, 'sale', ?, 0, ?, 'sales_invoices', ?)`
  ).run(customerId, amount, balanceAfter, refId);
}

export function recordCustomerPayment(db: Db, customerId: number, amount: number, note?: string | null): void {
  if (amount <= 0) throw new RangeError(`Payment amount must be positive, got ${amount}`);
  const balanceBefore = getCustomerBalance(db, customerId);
  const balanceAfter = balanceBefore - amount;
  db.prepare(
    `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, note)
     VALUES (?, 'payment', 0, ?, ?, ?)`
  ).run(customerId, amount, balanceAfter, note ?? null);
}

export interface ReceivablesSummary {
  /** Sum of every active customer's current balance, floored at 0 per
      customer — a customer in credit (negative balance) owes nothing, so
      their balance does not offset what others owe (rule: this is what the
      pharmacy is still owed, not a net position). */
  totalOwed: number;
  /** Count of active customers with a positive balance. */
  customerCount: number;
}

/**
 * Total outstanding customer debt across the whole customer list — the
 * dashboard's "مستحقات العملاء" figure. Each customer's current balance is
 * their latest customer_ledger row (falling back to opening_balance for a
 * customer with no ledger activity yet), the same definition getCustomerBalance
 * uses for one customer; this aggregates it across all of them in a single
 * query rather than calling getCustomerBalance in a loop.
 */
export function getReceivablesSummary(db: Db): ReceivablesSummary {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(MAX(balance, 0)), 0) AS totalOwed,
         COALESCE(SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END), 0) AS customerCount
       FROM (
         SELECT c.id,
                COALESCE(
                  (SELECT cl.balance_after FROM customer_ledger cl
                   WHERE cl.customer_id = c.id ORDER BY cl.id DESC LIMIT 1),
                  c.opening_balance
                ) AS balance
         FROM customers c
         WHERE c.is_active = 1
       )`
    )
    .get() as ReceivablesSummary;
  return row;
}

export function getCustomerLedger(db: Db, customerId: number, limit = 200) {
  return db
    .prepare(
      `SELECT id, at, entry_type AS entryType, debit, credit, balance_after AS balanceAfter,
              ref_table AS refTable, ref_id AS refId, note
       FROM customer_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT ?`
    )
    .all(customerId, limit);
}
