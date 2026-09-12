import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice, confirmSalesInvoice } from './sales';
import {
  createCustomer,
  updateCustomer,
  getCustomer,
  getCustomerBalance,
  getCustomerAddresses,
  getCustomerTags,
  searchCustomers,
  listCustomers,
  suspendCustomer,
  unsuspendCustomer,
  deactivateCustomer,
  postCreditSale,
  recordCustomerPayment,
  getCustomerLedger,
} from './customers';

let db: Db;
let itemId: number;
let unitId: number;
let supplierId: number;
let warehouseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));

  itemId = createItem(db, { nameAr: 'صنف للعميل' });
  unitId = Number(
    db.prepare('INSERT INTO item_units (item_id, name_ar, factor, sale_price, is_base) VALUES (?, ?, 1, 100, 1)')
      .run(itemId, 'قرص').lastInsertRowid
  );
  supplierId = createSupplier(db, { nameAr: 'مورد للعميل' });
  warehouseId = getDefaultWarehouse(db).id;
});

function stockUp(qtyBase: number, unitCost: number) {
  const id = createPurchaseInvoice(db, {
    supplierInvoiceNo: `SUP-${Math.random()}`,
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [{ lineNo: 1, itemId, unitId, qtyInUnit: qtyBase, qtyBase, unitPurchasePrice: unitCost }],
  });
  confirmPurchaseInvoice(db, id);
}

describe('createCustomer', () => {
  it('assigns a sequential code from the seeded sequence', () => {
    const id = createCustomer(db, { name: 'عميل أ', mobile1: '0101234567' });
    expect(getCustomer(db, id)?.code).toBe(60001);
  });

  it('posts an opening balance to the ledger', () => {
    const id = createCustomer(db, { name: 'عميل برصيد', mobile1: '0101234568', openingBalance: 5000 });
    expect(getCustomerBalance(db, id)).toBe(5000);
  });

  it('stores addresses and tags', () => {
    const id = createCustomer(db, {
      name: 'عميل بعنوان',
      mobile1: '0101234569',
      addresses: [{ deliveryAddress: 'شارع الهرم', area: 'الجيزة' }],
      tags: ['VIP', 'صيدلية'],
    });
    expect(getCustomerAddresses(db, id)).toHaveLength(1);
    expect(getCustomerTags(db, id)).toEqual(['VIP', 'صيدلية']);
  });

  it('deduplicates tags', () => {
    const id = createCustomer(db, {
      name: 'عميل تاجات مكررة',
      mobile1: '0101234570',
      tags: ['a', 'a', 'b'],
    });
    expect(getCustomerTags(db, id)).toEqual(['a', 'b']);
  });
});

describe('search', () => {
  it('finds a customer typed without hamza', () => {
    createCustomer(db, { name: 'أحمد للبحث', mobile1: '0101111111' });
    expect(searchCustomers(db, 'احمد للبحث').some((c) => c.name === 'أحمد للبحث')).toBe(true);
  });

  it('finds a customer by mobile number', () => {
    createCustomer(db, { name: 'عميل بالموبايل', mobile1: '01099998888' });
    expect(searchCustomers(db, '01099998888')).toHaveLength(1);
  });

  it('excludes a deactivated customer from search and list', () => {
    const id = createCustomer(db, { name: 'عميل موقوف', mobile1: '0102222222' });
    deactivateCustomer(db, id);
    expect(listCustomers(db).some((c) => c.id === id)).toBe(false);
    expect(searchCustomers(db, 'عميل موقوف')).toHaveLength(0);
  });
});

describe('updateCustomer', () => {
  it('refreshes the normalized name on rename', () => {
    const id = createCustomer(db, { name: 'اسم قديم للعميل', mobile1: '0103333333' });
    updateCustomer(db, id, { name: 'اسم جديد للعميل', mobile1: '0103333333' });
    expect(searchCustomers(db, 'جديد للعميل')).toHaveLength(1);
  });

  it('replaces addresses rather than accumulating them', () => {
    const id = createCustomer(db, {
      name: 'عميل عناوين',
      mobile1: '0104444444',
      addresses: [{ area: 'عنوان أول' }],
    });
    updateCustomer(db, id, { name: 'عميل عناوين', mobile1: '0104444444', addresses: [{ area: 'عنوان ثانٍ' }] });
    const addresses = getCustomerAddresses(db, id) as Array<{ area: string }>;
    expect(addresses).toHaveLength(1);
    expect(addresses[0]!.area).toBe('عنوان ثانٍ');
  });
});

describe('suspend / unsuspend / deactivate', () => {
  it('suspends without deleting (rule 9)', () => {
    const id = createCustomer(db, { name: 'عميل للإيقاف', mobile1: '0105555555' });
    suspendCustomer(db, id);
    expect(getCustomer(db, id)!.isSuspended).toBe(1);
    unsuspendCustomer(db, id);
    expect(getCustomer(db, id)!.isSuspended).toBe(0);
  });
});

describe('postCreditSale / getCustomerBalance', () => {
  it('increases the balance by the sale amount', () => {
    const id = createCustomer(db, { name: 'عميل آجل', mobile1: '0106666666' });
    postCreditSale(db, id, 10000, 1);
    expect(getCustomerBalance(db, id)).toBe(10000);
  });

  it('enforces the credit limit', () => {
    const id = createCustomer(db, { name: 'عميل بحد ائتمان', mobile1: '0107777777', creditLimit: 5000 });
    expect(() => postCreditSale(db, id, 6000, 1)).toThrow(/Credit limit exceeded/);
  });

  it('allows a sale that exactly reaches the credit limit', () => {
    const id = createCustomer(db, { name: 'عميل عند الحد', mobile1: '0107777778', creditLimit: 5000 });
    expect(() => postCreditSale(db, id, 5000, 1)).not.toThrow();
  });

  it('accumulates across multiple credit sales toward the limit', () => {
    const id = createCustomer(db, { name: 'عميل تراكمي', mobile1: '0107777779', creditLimit: 5000 });
    postCreditSale(db, id, 3000, 1);
    expect(() => postCreditSale(db, id, 3000, 2)).toThrow(/Credit limit exceeded/);
  });

  it('refuses credit to a suspended customer regardless of limit', () => {
    const id = createCustomer(db, { name: 'عميل موقوف للائتمان', mobile1: '0108888888', creditLimit: 100000 });
    suspendCustomer(db, id);
    expect(() => postCreditSale(db, id, 100, 1)).toThrow(/suspended/);
  });

  it('a customer with no credit limit set can be extended any amount', () => {
    const id = createCustomer(db, { name: 'عميل بلا حد', mobile1: '0109999999' });
    expect(() => postCreditSale(db, id, 1000000, 1)).not.toThrow();
  });
});

describe('recordCustomerPayment', () => {
  it('reduces the balance', () => {
    const id = createCustomer(db, { name: 'عميل سداد', mobile1: '0111111111' });
    postCreditSale(db, id, 10000, 1);
    recordCustomerPayment(db, id, 4000);
    expect(getCustomerBalance(db, id)).toBe(6000);
  });

  it('rejects a non-positive payment', () => {
    const id = createCustomer(db, { name: 'عميل سداد سالب', mobile1: '0111111112' });
    expect(() => recordCustomerPayment(db, id, 0)).toThrow(RangeError);
    expect(() => recordCustomerPayment(db, id, -100)).toThrow(RangeError);
  });

  it('appears in the ledger history', () => {
    const id = createCustomer(db, { name: 'عميل سجل', mobile1: '0111111113' });
    postCreditSale(db, id, 5000, 1);
    recordCustomerPayment(db, id, 2000, 'دفعة نقدية');
    const ledger = getCustomerLedger(db, id) as Array<{ entryType: string }>;
    expect(ledger.map((l) => l.entryType)).toEqual(['payment', 'sale']);
  });
});

describe('confirmSalesInvoice integration: credit sales post to the customer ledger', () => {
  it('refuses to confirm a credit invoice with no customer', () => {
    stockUp(100, 50);
    const id = createSalesInvoice(db, {
      warehouseId,
      invoiceType: 'credit',
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 5, unitPrice: 200 }],
    });
    expect(() => confirmSalesInvoice(db, id)).toThrow(/must have a customer/);
  });

  it('posts the invoice total to the customer ledger on confirm, not on draft', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل لفاتورة آجلة', mobile1: '0112222222' });
    const id = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'credit',
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 200 }],
    });
    expect(getCustomerBalance(db, customerId)).toBe(0); // draft: nothing posted yet

    confirmSalesInvoice(db, id);
    expect(getCustomerBalance(db, customerId)).toBe(2000); // 10 * 200
  });

  it('blocks confirmation entirely if it would exceed the credit limit', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, {
      name: 'عميل حد ائتمان صارم',
      mobile1: '0112222223',
      creditLimit: 1000,
    });
    const id = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'credit',
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 200 }], // 2000, over the 1000 limit
    });
    expect(() => confirmSalesInvoice(db, id)).toThrow(/Credit limit exceeded/);

    // And the whole transaction must have rolled back: no stock decrement,
    // no ledger entry, invoice still draft.
    const status = db.prepare('SELECT status FROM sales_invoices WHERE id = ?').get(id) as { status: string };
    expect(status.status).toBe('draft');
    expect(getCustomerBalance(db, customerId)).toBe(0);
  });

  it('a cash sale never touches the customer ledger even with a customer attached', () => {
    stockUp(100, 50);
    const customerId = createCustomer(db, { name: 'عميل كاش', mobile1: '0112222224' });
    const id = createSalesInvoice(db, {
      warehouseId,
      customerId,
      invoiceType: 'cash',
      paidCash: 2000,
      lines: [{ lineNo: 1, itemId, unitId, unitFactor: 1, qtyInUnit: 10, unitPrice: 200 }],
    });
    confirmSalesInvoice(db, id);
    expect(getCustomerBalance(db, customerId)).toBe(0);
  });
});
