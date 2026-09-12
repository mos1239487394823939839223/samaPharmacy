import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import {
  listWarehouses,
  getWarehouse,
  getDefaultWarehouse,
  createWarehouse,
  updateWarehouse,
  deactivateWarehouse,
} from './warehouses';

let db: Db;
const MIGRATION = join(__dirname, '../../migrations/0001-initial-schema.sql');

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(MIGRATION, 'utf8'));
});

describe('seed', () => {
  it('ships with one default warehouse', () => {
    const list = listWarehouses(db);
    expect(list).toHaveLength(1);
    expect(list[0]!.nameAr).toBe('المخزن الرئيسي');
    expect(getDefaultWarehouse(db).nameAr).toBe('المخزن الرئيسي');
  });
});

describe('createWarehouse', () => {
  it('adds a second warehouse — front counter alongside main store', () => {
    const id = createWarehouse(db, { nameAr: 'كاونتر الصيدلية' });
    expect(listWarehouses(db)).toHaveLength(2);
    expect(getWarehouse(db, id)?.nameAr).toBe('كاونتر الصيدلية');
  });

  it('moves the default flag when a new default is created', () => {
    const id = createWarehouse(db, { nameAr: 'مخزن جديد', isDefault: true });
    expect(getDefaultWarehouse(db).id).toBe(id);
    expect(listWarehouses(db).filter((w) => w.isDefault)).toHaveLength(1);
  });
});

describe('updateWarehouse', () => {
  it('moves the default flag on update too', () => {
    const id = createWarehouse(db, { nameAr: 'فرع ٢' });
    updateWarehouse(db, id, { nameAr: 'فرع ٢', isDefault: true });
    expect(getDefaultWarehouse(db).id).toBe(id);
  });
});

describe('deactivateWarehouse', () => {
  it('refuses to deactivate the default warehouse', () => {
    const def = getDefaultWarehouse(db);
    expect(() => deactivateWarehouse(db, def.id)).toThrow(/default/);
  });

  it('deactivates a non-default warehouse without deleting it (rule 9)', () => {
    const id = createWarehouse(db, { nameAr: 'مخزن مؤقت' });
    deactivateWarehouse(db, id);
    expect(listWarehouses(db).some((w) => w.id === id)).toBe(false);
    expect(getWarehouse(db, id)).toBeDefined();
    expect(getWarehouse(db, id)!.isActive).toBe(0);
  });
});
