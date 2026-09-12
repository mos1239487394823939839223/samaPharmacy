import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from './connection';

const M1 = join(__dirname, '../migrations/0001-initial-schema.sql');
const M2 = join(__dirname, '../migrations/0002-seed-system-user.sql');

describe('migration 0002', () => {
  it('seeds the system user with no FK violations', () => {
    const db = new Database(':memory:') as Db;
    db.pragma('foreign_keys = ON');
    db.exec(readFileSync(M1, 'utf8'));
    db.exec(readFileSync(M2, 'utf8'));

    const user = db.prepare('SELECT id, username, role FROM users WHERE id = 1').get() as
      | { id: number; username: string; role: string }
      | undefined;
    expect(user).toEqual({ id: 1, username: 'system', role: 'owner' });
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
  });

  it('applies through the real migration runner in order', async () => {
    const { migrate } = await import('./migrate');
    const db = new Database(':memory:') as Db;
    db.pragma('foreign_keys = ON');
    const { applied } = migrate(db, join(__dirname, '../migrations'));
    expect(applied).toEqual([1, 2]);
    const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
    expect(user).toBeDefined();
    db.close();
  });
});
