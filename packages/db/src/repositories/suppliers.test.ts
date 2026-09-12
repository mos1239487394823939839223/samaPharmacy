import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import {
  createSupplier,
  updateSupplier,
  getSupplier,
  getSupplierBalance,
  searchSuppliers,
  listSuppliers,
  deactivateSupplier,
} from './suppliers';

let db: Db;
const MIGRATION = join(__dirname, '../../migrations/0001-initial-schema.sql');

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(MIGRATION, 'utf8'));
});

describe('createSupplier', () => {
  it('assigns a sequential code starting at the seeded value', () => {
    const id = createSupplier(db, { nameAr: 'شركة الشراء الطبية' });
    expect(getSupplier(db, id)?.code).toBe(1001);
  });

  it('posts an opening balance to the ledger', () => {
    const id = createSupplier(db, { nameAr: 'مورد برصيد', openingBalance: 50000 });
    expect(getSupplierBalance(db, id)).toBe(50000);
  });

  it('has zero balance with no opening balance', () => {
    const id = createSupplier(db, { nameAr: 'مورد بدون رصيد' });
    expect(getSupplierBalance(db, id)).toBe(0);
  });
});

describe('search', () => {
  it('finds a supplier typed without hamza', () => {
    createSupplier(db, { nameAr: 'أدوية مصر' });
    expect(searchSuppliers(db, 'ادوية مصر').some((s) => s.nameAr === 'أدوية مصر')).toBe(true);
  });

  it('excludes deactivated suppliers from the list and search', () => {
    const id = createSupplier(db, { nameAr: 'مورد موقوف' });
    deactivateSupplier(db, id);
    expect(listSuppliers(db).some((s) => s.id === id)).toBe(false);
    expect(searchSuppliers(db, 'مورد موقوف')).toHaveLength(0);
  });
});

describe('updateSupplier', () => {
  it('refreshes the normalized search column on rename', () => {
    const id = createSupplier(db, { nameAr: 'اسم قديم' });
    updateSupplier(db, id, { nameAr: 'اسم جديد للمورد' });
    expect(searchSuppliers(db, 'جديد للمورد')).toHaveLength(1);
  });
});
