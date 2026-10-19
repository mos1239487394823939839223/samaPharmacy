import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { migrate, createItem, listAudit, type Db } from '@pharmacy/db';
import { auditRequest, isMutation, OPERATOR_ID } from './access';

let db: Db;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../../../packages/db/migrations'));
});

describe('audit trail', () => {
  it('records every write under the single operator with before/after, and never records reads', () => {
    const id = createItem(db, { nameAr: 'صنف' });
    auditRequest(db, { kind: 'items.update', id, input: { nameAr: 'جديد' } }, undefined, { nameAr: 'صنف' });
    auditRequest(db, { kind: 'items.list' }, [], undefined);
    const rows = listAudit(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'items.update', userId: OPERATOR_ID, entityId: id });
    expect(rows[0]!.beforeJson).toContain('صنف');
    expect(rows[0]!.afterJson).toContain('جديد');
  });

  it('uses the returned id for creates', () => {
    auditRequest(db, { kind: 'items.create', input: { nameAr: 'x' } }, 42);
    expect(listAudit(db)[0]!.entityId).toBe(42);
  });

  it('classifies reads and writes', () => {
    expect(isMutation('sales.checkout')).toBe(true);
    expect(isMutation('narcotics.fix')).toBe(true);
    expect(isMutation('sales.search')).toBe(false);
    expect(isMutation('insurance.claims')).toBe(false);
    expect(isMutation('ping')).toBe(false);
  });
});
