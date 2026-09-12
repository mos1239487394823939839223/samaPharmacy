/**
 * Pharmacy-wide configuration — backed by the generic `settings` key/value
 * table (schema since M0, never previously read or written). Each business
 * setting gets its own typed key here rather than one JSON blob, so a
 * missing or corrupt individual key falls back to its documented default
 * instead of losing every setting at once.
 *
 * Every getter is defensive against a missing row (first run, before anyone
 * has opened the settings screen) and returns the same default that used to
 * be hardcoded at the call site — this file replaces those literals, not
 * introduces new behavior.
 */

import type { Db } from '../connection';

const KEYS = {
  expiryD30: 'expiry.bucket.d30',
  expiryD60: 'expiry.bucket.d60',
  expiryD90: 'expiry.bucket.d90',
  expiryD180: 'expiry.bucket.d180',
  salesReturnWindowDays: 'sales.returnWindowDays',
} as const;

export interface ExpiryBucketDays {
  d30: number;
  d60: number;
  d90: number;
  d180: number;
}

export const DEFAULT_EXPIRY_BUCKET_DAYS: ExpiryBucketDays = { d30: 30, d60: 60, d90: 90, d180: 180 };
export const DEFAULT_SALES_RETURN_WINDOW_DAYS = 14;

export interface PharmacySettings {
  expiryBucketDays: ExpiryBucketDays;
  salesReturnWindowDays: number;
}

function getRaw(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function getInt(db: Db, key: string, fallback: number): number {
  const raw = getRaw(db, key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getExpiryBucketDays(db: Db): ExpiryBucketDays {
  return {
    d30: getInt(db, KEYS.expiryD30, DEFAULT_EXPIRY_BUCKET_DAYS.d30),
    d60: getInt(db, KEYS.expiryD60, DEFAULT_EXPIRY_BUCKET_DAYS.d60),
    d90: getInt(db, KEYS.expiryD90, DEFAULT_EXPIRY_BUCKET_DAYS.d90),
    d180: getInt(db, KEYS.expiryD180, DEFAULT_EXPIRY_BUCKET_DAYS.d180),
  };
}

export function getSalesReturnWindowDays(db: Db): number {
  return getInt(db, KEYS.salesReturnWindowDays, DEFAULT_SALES_RETURN_WINDOW_DAYS);
}

export function getSettings(db: Db): PharmacySettings {
  return {
    expiryBucketDays: getExpiryBucketDays(db),
    salesReturnWindowDays: getSalesReturnWindowDays(db),
  };
}

function setRaw(db: Db, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value);
}

/**
 * Bucket days must strictly increase (d30 < d60 < d90 < d180) — the expiry
 * report's bucketing logic assumes ascending cutoffs, and a misconfigured
 * inversion would silently misclassify batches rather than error, which is
 * worse than rejecting the write up front.
 */
function validateExpiryBucketDays(days: ExpiryBucketDays): void {
  if (!(days.d30 > 0 && days.d30 < days.d60 && days.d60 < days.d90 && days.d90 < days.d180)) {
    throw new Error('Expiry bucket days must be positive and strictly increasing (d30 < d60 < d90 < d180)');
  }
}

export function updateSettings(db: Db, input: Partial<PharmacySettings>): PharmacySettings {
  const run = db.transaction((data: Partial<PharmacySettings>) => {
    if (data.expiryBucketDays) {
      validateExpiryBucketDays(data.expiryBucketDays);
      setRaw(db, KEYS.expiryD30, String(data.expiryBucketDays.d30));
      setRaw(db, KEYS.expiryD60, String(data.expiryBucketDays.d60));
      setRaw(db, KEYS.expiryD90, String(data.expiryBucketDays.d90));
      setRaw(db, KEYS.expiryD180, String(data.expiryBucketDays.d180));
    }
    if (data.salesReturnWindowDays !== undefined) {
      if (!(Number.isInteger(data.salesReturnWindowDays) && data.salesReturnWindowDays > 0)) {
        throw new Error('Sales return window must be a positive whole number of days');
      }
      setRaw(db, KEYS.salesReturnWindowDays, String(data.salesReturnWindowDays));
    }
  });

  run(input);
  return getSettings(db);
}
