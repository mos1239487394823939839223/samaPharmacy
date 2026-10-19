/**
 * Customer repository. العملاء — blueprint §1.5, both screens (customer
 * master and demographics), plus the credit ledger sales already reference
 * via sales_invoices.customer_id.
 *
 * D8 (docs/DECISIONS.md) settles the three discount rates: cash, credit, and
 * a whole-invoice override. This repository stores and returns them; which
 * one a sale actually applies is decided at the POS, not here.
 */

import { DomainError, normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';
import { getOpenShift, recordCashTransaction } from './shifts';
import { getDefaultWarehouse } from './warehouses';

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
  pharmacyPhone: string | null;
  notes: string | null;
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
  /** Current balance from the ledger — positive means the customer owes the pharmacy. */
  balance: number;
}

const SELECT = `
  SELECT id, code, name, mobile1, mobile2, email,
         pharmacy_owner_name AS pharmacyOwnerName, pharmacy_phone AS pharmacyPhone,
         account_type AS accountType, notes,
         payment_method AS paymentMethod, opening_balance AS openingBalance,
         credit_limit AS creditLimit, is_vip AS isVip, is_suspended AS isSuspended,
         discount_cash_pct AS discountCashPct, discount_credit_pct AS discountCreditPct,
         discount_invoice_pct AS discountInvoicePct, sell_at_cost AS sellAtCost,
         is_active AS isActive,
         COALESCE((SELECT cl.balance_after FROM customer_ledger cl
                   WHERE cl.customer_id = customers.id ORDER BY cl.id DESC LIMIT 1),
                  opening_balance) AS balance
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
           gender, marital_status, birth_date, has_children, children_count, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${NOW})`
      )
      .run(
        code,
        data.name.trim(),
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
        `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, note, at)
         VALUES (?, 'opening', ?, 0, ?, 'رصيد افتتاحي', ${NOW})`
      ).run(customerId, data.openingBalance, data.openingBalance);
    }

    replaceAddresses(db, customerId, data.addresses ?? []);
    replaceTags(db, customerId, data.tags ?? []);

    return customerId;
  });

  return run(input);
}

export function updateCustomer(db: Db, id: number, input: CustomerInput): void {
  const run = db.transaction((patch: CustomerInput) => {
    // A field the caller did not send keeps its stored value. The form edits
    // a subset of the columns; writing the rest as null wiped the insurance
    // number, birth date and the sell-at-cost flag on every save.
    const stored = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!stored) throw new DomainError('customer.notFound', `Customer ${id} not found`, { id });
    const flag = (v: unknown) => v === 1;
    const data: CustomerInput = {
      ...patch,
      mobile2: patch.mobile2 !== undefined ? patch.mobile2 : (stored.mobile2 as string | null),
      email: patch.email !== undefined ? patch.email : (stored.email as string | null),
      pharmacyOwnerName: patch.pharmacyOwnerName !== undefined ? patch.pharmacyOwnerName : (stored.pharmacy_owner_name as string | null),
      pharmacyPhone: patch.pharmacyPhone !== undefined ? patch.pharmacyPhone : (stored.pharmacy_phone as string | null),
      accountType: patch.accountType ?? (stored.account_type as CustomerInput['accountType']),
      parentCustomerId: patch.parentCustomerId !== undefined ? patch.parentCustomerId : (stored.parent_customer_id as number | null),
      installmentCompany: patch.installmentCompany !== undefined ? patch.installmentCompany : (stored.installment_company as string | null),
      installmentTier: patch.installmentTier !== undefined ? patch.installmentTier : (stored.installment_tier as string | null),
      paymentMethod: patch.paymentMethod ?? (stored.payment_method as CustomerInput['paymentMethod']),
      creditLimit: patch.creditLimit !== undefined ? patch.creditLimit : (stored.credit_limit as number | null),
      insuranceNumber: patch.insuranceNumber !== undefined ? patch.insuranceNumber : (stored.insurance_number as string | null),
      isVip: patch.isVip ?? flag(stored.is_vip),
      printNameOnInvoice: patch.printNameOnInvoice ?? flag(stored.print_name_on_invoice),
      sellAtCost: patch.sellAtCost ?? flag(stored.sell_at_cost),
      discountCashPct: patch.discountCashPct ?? (stored.discount_cash_pct as number),
      discountCreditPct: patch.discountCreditPct ?? (stored.discount_credit_pct as number),
      discountInvoicePct: patch.discountInvoicePct ?? (stored.discount_invoice_pct as number),
      gender: patch.gender !== undefined ? patch.gender : (stored.gender as CustomerInput['gender']),
      maritalStatus: patch.maritalStatus !== undefined ? patch.maritalStatus : (stored.marital_status as string | null),
      birthDate: patch.birthDate !== undefined ? patch.birthDate : (stored.birth_date as string | null),
      hasChildren: patch.hasChildren ?? flag(stored.has_children),
      childrenCount: patch.childrenCount !== undefined ? patch.childrenCount : (stored.children_count as number | null),
      notes: patch.notes !== undefined ? patch.notes : (stored.notes as string | null),
    };
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
      data.name.trim(),
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

/**
 * A customer who still owes (or is owed) money is not deactivated: it would
 * drop them out of every list while the debt is still real.
 */
export function deactivateCustomer(db: Db, id: number): void {
  const balance = getCustomerBalance(db, id);
  if (balance !== 0) {
    throw new DomainError('customer.hasBalance', `Customer ${id} has a non-zero balance (${balance})`, { balance });
  }
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
  if (!customer) throw new DomainError('customer.notFound', `Customer ${customerId} not found`);
  if (customer.isSuspended) {
    throw new DomainError(
      'customer.suspended',
      `Customer ${customer.name} (#${customer.code}) is suspended — cannot extend credit`,
      { name: customer.name }
    );
  }

  const balanceBefore = getCustomerBalance(db, customerId);
  const balanceAfter = balanceBefore + amount;

  if (customer.creditLimit !== null && balanceAfter > customer.creditLimit) {
    throw new DomainError(
      'customer.creditLimit',
      `Credit limit exceeded for ${customer.name} (#${customer.code}): balance would be ` +
        `${balanceAfter}, limit is ${customer.creditLimit}`,
      { name: customer.name, balance: balanceAfter, limit: customer.creditLimit }
    );
  }

  db.prepare(
    `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, ref_table, ref_id, at)
     VALUES (?, 'sale', ?, 0, ?, 'sales_invoices', ?, ${NOW})`
  ).run(customerId, amount, balanceAfter, refId);
}

export interface PaymentOptions {
  /**
   * Cash paid at the counter enters the drawer: it is recorded as a cash-in
   * on the warehouse's open shift so shift close expects it (otherwise every
   * collected payment surfaced as an unexplained overage). Default true.
   */
  cash?: boolean;
  /** Warehouse whose open shift receives the cash; the default warehouse when omitted. */
  warehouseId?: number;
  userId?: number;
}

export function recordCustomerPayment(
  db: Db,
  customerId: number,
  amount: number,
  note?: string | null,
  options: PaymentOptions = {}
): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new DomainError('payment.amountInvalid', `Payment amount must be a positive integer, got ${amount}`);
  }
  db.transaction(() => {
    const customer = getCustomer(db, customerId);
    if (!customer) throw new DomainError('customer.notFound', `Customer ${customerId} not found`);
    const balanceAfter = getCustomerBalance(db, customerId) - amount;
    db.prepare(
      `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, note, at)
       VALUES (?, 'payment', 0, ?, ?, ?, ${NOW})`
    ).run(customerId, amount, balanceAfter, note ?? null);

    if (options.cash !== false) {
      const warehouseId = options.warehouseId ?? getDefaultWarehouse(db).id;
      const shift = getOpenShift(db, warehouseId);
      if (shift) {
        recordCashTransaction(db, shift.id, 'in', amount, 'customer_payment', `سداد ${customer.name} #${customer.code}`, options.userId ?? 1);
      }
    }
  })();
}

/**
 * Credit a customer's account for a sales return (refund method "على الحساب").
 * A distinct 'return' entry linked to the return — not disguised as a payment.
 */
export function postCustomerReturnCredit(db: Db, customerId: number, amount: number, returnId: number, note: string): void {
  if (amount <= 0) return;
  const balanceAfter = getCustomerBalance(db, customerId) - amount;
  db.prepare(
    `INSERT INTO customer_ledger (customer_id, entry_type, debit, credit, balance_after, ref_table, ref_id, note, at)
     VALUES (?, 'return', 0, ?, ?, 'sales_returns', ?, ?, ${NOW})`
  ).run(customerId, amount, balanceAfter, returnId, note);
}

export interface ReceivablesSummary {
  /** Sum of every active customer's current balance, floored at 0 per
      customer — a customer in credit (negative balance) owes nothing, so
      their balance does not offset what others owe (rule: this is what the
      pharmacy is still owed, not a net position). */
  totalOwed: number;
  /** Count of customers with a positive balance (deactivated ones included — their debt is still owed). */
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
