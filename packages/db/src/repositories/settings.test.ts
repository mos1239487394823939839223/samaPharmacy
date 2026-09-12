import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import {
  getSettings,
  updateSettings,
  getExpiryBucketDays,
  getSalesReturnWindowDays,
  DEFAULT_EXPIRY_BUCKET_DAYS,
  DEFAULT_SALES_RETURN_WINDOW_DAYS,
} from './settings';

let db: Db;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
});

describe('getSettings / defaults', () => {
  it('returns the documented defaults before anything is ever written', () => {
    const s = getSettings(db);
    expect(s.expiryBucketDays).toEqual(DEFAULT_EXPIRY_BUCKET_DAYS);
    expect(s.salesReturnWindowDays).toBe(DEFAULT_SALES_RETURN_WINDOW_DAYS);
  });

  it('getExpiryBucketDays and getSalesReturnWindowDays match getSettings', () => {
    expect(getExpiryBucketDays(db)).toEqual(getSettings(db).expiryBucketDays);
    expect(getSalesReturnWindowDays(db)).toBe(getSettings(db).salesReturnWindowDays);
  });
});

describe('updateSettings', () => {
  it('persists expiry bucket days and returns them from a fresh read', () => {
    updateSettings(db, { expiryBucketDays: { d30: 15, d60: 45, d90: 75, d180: 150 } });
    expect(getExpiryBucketDays(db)).toEqual({ d30: 15, d60: 45, d90: 75, d180: 150 });
  });

  it('persists the sales return window', () => {
    updateSettings(db, { salesReturnWindowDays: 30 });
    expect(getSalesReturnWindowDays(db)).toBe(30);
  });

  it('updating one setting does not disturb the other', () => {
    updateSettings(db, { salesReturnWindowDays: 7 });
    expect(getExpiryBucketDays(db)).toEqual(DEFAULT_EXPIRY_BUCKET_DAYS);
  });

  it('a second update overwrites the first rather than erroring on the existing key', () => {
    updateSettings(db, { salesReturnWindowDays: 7 });
    updateSettings(db, { salesReturnWindowDays: 21 });
    expect(getSalesReturnWindowDays(db)).toBe(21);
  });

  it('rejects non-increasing expiry bucket days', () => {
    expect(() => updateSettings(db, { expiryBucketDays: { d30: 90, d60: 60, d90: 30, d180: 180 } })).toThrow();
  });

  it('rejects a zero or negative d30', () => {
    expect(() => updateSettings(db, { expiryBucketDays: { d30: 0, d60: 60, d90: 90, d180: 180 } })).toThrow();
  });

  it('a rejected expiry update leaves the previously stored value intact', () => {
    updateSettings(db, { expiryBucketDays: { d30: 20, d60: 50, d90: 80, d180: 160 } });
    expect(() =>
      updateSettings(db, { expiryBucketDays: { d30: 90, d60: 60, d90: 30, d180: 180 } })
    ).toThrow();
    expect(getExpiryBucketDays(db)).toEqual({ d30: 20, d60: 50, d90: 80, d180: 160 });
  });

  it('rejects a non-positive return window', () => {
    expect(() => updateSettings(db, { salesReturnWindowDays: 0 })).toThrow();
    expect(() => updateSettings(db, { salesReturnWindowDays: -5 })).toThrow();
  });

  it('rejects a fractional return window', () => {
    expect(() => updateSettings(db, { salesReturnWindowDays: 14.5 })).toThrow();
  });
});
