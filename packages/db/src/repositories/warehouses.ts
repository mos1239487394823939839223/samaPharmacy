/**
 * Warehouse repository. المخازن — even one pharmacy has main store + front
 * counter, per blueprint build order screen 4.
 */

import type { Db } from '../connection';

export interface WarehouseRow {
  id: number;
  nameAr: string;
  isDefault: number;
  isActive: number;
}

export interface WarehouseInput {
  nameAr: string;
  isDefault?: boolean;
}

export function listWarehouses(db: Db, includeInactive = false): WarehouseRow[] {
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  return db
    .prepare(
      `SELECT id, name_ar AS nameAr, is_default AS isDefault, is_active AS isActive
       FROM warehouses ${where} ORDER BY is_default DESC, name_ar`
    )
    .all() as WarehouseRow[];
}

export function getWarehouse(db: Db, id: number): WarehouseRow | undefined {
  return db
    .prepare(
      `SELECT id, name_ar AS nameAr, is_default AS isDefault, is_active AS isActive
       FROM warehouses WHERE id = ?`
    )
    .get(id) as WarehouseRow | undefined;
}

export function getDefaultWarehouse(db: Db): WarehouseRow {
  const row = db
    .prepare(
      `SELECT id, name_ar AS nameAr, is_default AS isDefault, is_active AS isActive
       FROM warehouses WHERE is_default = 1 LIMIT 1`
    )
    .get() as WarehouseRow | undefined;
  if (!row) throw new Error('No default warehouse configured');
  return row;
}

export function createWarehouse(db: Db, input: WarehouseInput): number {
  const run = db.transaction((data: WarehouseInput) => {
    if (data.isDefault) {
      db.prepare('UPDATE warehouses SET is_default = 0').run();
    }
    const result = db
      .prepare('INSERT INTO warehouses (name_ar, is_default) VALUES (?, ?)')
      .run(data.nameAr, data.isDefault ? 1 : 0);
    return Number(result.lastInsertRowid);
  });
  return run(input);
}

export function updateWarehouse(db: Db, id: number, input: WarehouseInput): void {
  const run = db.transaction((data: WarehouseInput) => {
    if (data.isDefault) {
      db.prepare('UPDATE warehouses SET is_default = 0 WHERE id != ?').run(id);
    }
    db.prepare('UPDATE warehouses SET name_ar = ?, is_default = ? WHERE id = ?').run(
      data.nameAr,
      data.isDefault ? 1 : 0,
      id
    );
  });
  run(input);
}

/** Nothing is deleted (rule 9) — deactivate instead. */
export function deactivateWarehouse(db: Db, id: number): void {
  const warehouse = getWarehouse(db, id);
  if (warehouse?.isDefault) {
    throw new Error('Cannot deactivate the default warehouse');
  }
  db.prepare('UPDATE warehouses SET is_active = 0 WHERE id = ?').run(id);
}
