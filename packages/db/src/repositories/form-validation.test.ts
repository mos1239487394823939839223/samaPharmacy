import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createCustomer, getCustomer, updateCustomer } from './customers';
import { getDefaultWarehouse } from './warehouses';
import { openShift, recordCashTransaction } from './shifts';

let db: Db;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
});

describe('customer edit keeps fields the form does not send', () => {
  it('insurance number, birth date, sell-at-cost, owner and notes survive a name change', () => {
    const id = createCustomer(db, {
      name: 'صيدلية النور',
      mobile1: '01000000000',
      accountType: 'pharmacy',
      pharmacyOwnerName: 'د. أحمد',
      pharmacyPhone: '0223456789',
      insuranceNumber: 'INS-7',
      birthDate: '1980-01-02',
      sellAtCost: true,
      notes: 'يدفع أول الشهر',
    });
    updateCustomer(db, id, { name: 'صيدلية النور الجديدة', mobile1: '01000000000' });
    const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Record<string, unknown>;
    expect(row.name).toBe('صيدلية النور الجديدة');
    expect(row.pharmacy_owner_name).toBe('د. أحمد');
    expect(row.pharmacy_phone).toBe('0223456789');
    expect(row.insurance_number).toBe('INS-7');
    expect(row.birth_date).toBe('1980-01-02');
    expect(row.sell_at_cost).toBe(1);
    expect(row.notes).toBe('يدفع أول الشهر');
    expect(row.account_type).toBe('pharmacy');
    expect(getCustomer(db, id)!.pharmacyPhone).toBe('0223456789');
  });

  it('an explicit null still clears a field', () => {
    const id = createCustomer(db, { name: 'أ', mobile1: '01000000000', notes: 'x' });
    updateCustomer(db, id, { name: 'أ', mobile1: '01000000000', notes: null });
    expect(getCustomer(db, id)!.notes).toBeNull();
  });
});

describe('cash out of the drawer', () => {
  it('cannot exceed the cash the drawer holds', () => {
    const shift = openShift(db, getDefaultWarehouse(db)!.id, 10000);
    expect(() => recordCashTransaction(db, shift, 'out', 10001)).toThrow(
      expect.objectContaining({ code: 'shift.insufficientCash' })
    );
    expect(() => recordCashTransaction(db, shift, 'out', 10000)).not.toThrow();
    recordCashTransaction(db, shift, 'in', 500);
    expect(() => recordCashTransaction(db, shift, 'out', 500)).not.toThrow();
  });
});
