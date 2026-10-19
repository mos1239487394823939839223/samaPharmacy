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

import { DomainError } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';

const KEYS = {
  expiryD30: 'expiry.bucket.d30',
  expiryD60: 'expiry.bucket.d60',
  expiryD90: 'expiry.bucket.d90',
  expiryD180: 'expiry.bucket.d180',
  salesReturnWindowDays: 'sales.returnWindowDays',
  backupSecondaryDir: 'backup.secondaryDir',
  backupKeep: 'backup.keep',
  backupIntervalHours: 'backup.intervalHours',
  pharmacy: 'pharmacy.profile',
  printer: 'printer.config',
} as const;

/** Receipt header/footer (spec M11 settings). */
export interface PharmacyProfile {
  name: string;
  address: string;
  phone: string;
  taxNumber: string;
  licenseNo: string;
  receiptFooter: string;
}

export const DEFAULT_PHARMACY_PROFILE: PharmacyProfile = {
  name: 'صيدلية',
  address: '',
  phone: '',
  taxNumber: '',
  licenseNo: '',
  receiptFooter: 'شكراً لزيارتكم',
};

/**
 * Receipt printer. 'system' prints through the Windows driver of a named
 * printer (thermal or A5/A4 laser) — Chromium shapes the Arabic. 'network'
 * and 'share' send ESC/POS raster directly (decision D2), which also allows
 * opening the cash drawer.
 */
export interface PrinterSettings {
  mode: 'none' | 'system' | 'network' | 'share';
  deviceName: string;
  host: string;
  port: number;
  shareName: string;
  paperWidth: 58 | 80;
  /** 'receipt' = roll paper; 'a5' = page printer. */
  format: 'receipt' | 'a5';
  copies: number;
  autoPrint: boolean;
  openDrawer: boolean;
  drawerPin: 2 | 5 | 'auto';
}

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  mode: 'none',
  deviceName: '',
  host: '',
  port: 9100,
  shareName: '',
  paperWidth: 80,
  format: 'receipt',
  copies: 1,
  autoPrint: true,
  openDrawer: false,
  drawerPin: 'auto',
};

function getJson<T extends object>(db: Db, key: string, fallback: T): T {
  const raw = getRaw(db, key);
  if (!raw) return { ...fallback };
  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return { ...fallback };
  }
}

export function getPharmacyProfile(db: Db): PharmacyProfile {
  return getJson(db, KEYS.pharmacy, DEFAULT_PHARMACY_PROFILE);
}

export function getPrinterSettings(db: Db): PrinterSettings {
  return getJson(db, KEYS.printer, DEFAULT_PRINTER_SETTINGS);
}

export interface BackupSettings {
  /** A second destination (USB stick, network share). Empty = local only. */
  secondaryDir: string;
  /** How many backups to keep in each destination. */
  keep: number;
  /** Automatic backup every N hours while the app is open (plus one on every close). */
  intervalHours: number;
}

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = { secondaryDir: '', keep: 30, intervalHours: 4 };

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
  backup: BackupSettings;
  pharmacy: PharmacyProfile;
  printer: PrinterSettings;
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

export function getBackupSettings(db: Db): BackupSettings {
  return {
    secondaryDir: getRaw(db, KEYS.backupSecondaryDir) ?? DEFAULT_BACKUP_SETTINGS.secondaryDir,
    keep: getInt(db, KEYS.backupKeep, DEFAULT_BACKUP_SETTINGS.keep),
    intervalHours: getInt(db, KEYS.backupIntervalHours, DEFAULT_BACKUP_SETTINGS.intervalHours),
  };
}

export function getSettings(db: Db): PharmacySettings {
  return {
    expiryBucketDays: getExpiryBucketDays(db),
    salesReturnWindowDays: getSalesReturnWindowDays(db),
    backup: getBackupSettings(db),
    pharmacy: getPharmacyProfile(db),
    printer: getPrinterSettings(db),
  };
}

function setRaw(db: Db, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ${NOW})
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
    throw new DomainError('settings.expiryBuckets', 'Expiry bucket days must be positive and strictly increasing (d30 < d60 < d90 < d180)');
  }
}

export interface PharmacySettingsPatch {
  expiryBucketDays?: ExpiryBucketDays;
  salesReturnWindowDays?: number;
  backup?: Partial<BackupSettings>;
  pharmacy?: Partial<PharmacyProfile>;
  printer?: Partial<PrinterSettings>;
}

export function updateSettings(db: Db, input: PharmacySettingsPatch): PharmacySettings {
  const run = db.transaction((data: PharmacySettingsPatch) => {
    if (data.expiryBucketDays) {
      validateExpiryBucketDays(data.expiryBucketDays);
      setRaw(db, KEYS.expiryD30, String(data.expiryBucketDays.d30));
      setRaw(db, KEYS.expiryD60, String(data.expiryBucketDays.d60));
      setRaw(db, KEYS.expiryD90, String(data.expiryBucketDays.d90));
      setRaw(db, KEYS.expiryD180, String(data.expiryBucketDays.d180));
    }
    if (data.salesReturnWindowDays !== undefined) {
      if (!(Number.isInteger(data.salesReturnWindowDays) && data.salesReturnWindowDays > 0)) {
        throw new DomainError('settings.returnWindow', 'Sales return window must be a positive whole number of days');
      }
      setRaw(db, KEYS.salesReturnWindowDays, String(data.salesReturnWindowDays));
    }
    if (data.backup) {
      const b = data.backup;
      if (b.secondaryDir !== undefined) setRaw(db, KEYS.backupSecondaryDir, b.secondaryDir.trim());
      if (b.keep !== undefined) {
        if (!(Number.isInteger(b.keep) && b.keep >= 1 && b.keep <= 365)) {
          throw new DomainError('settings.backupKeep', 'Backups to keep must be between 1 and 365');
        }
        setRaw(db, KEYS.backupKeep, String(b.keep));
      }
      if (b.intervalHours !== undefined) {
        if (!(Number.isInteger(b.intervalHours) && b.intervalHours >= 1 && b.intervalHours <= 24)) {
          throw new DomainError('settings.backupInterval', 'Backup interval must be between 1 and 24 hours');
        }
        setRaw(db, KEYS.backupIntervalHours, String(b.intervalHours));
      }
    }
  });

  run(input);
  if (input.pharmacy) setRaw(db, KEYS.pharmacy, JSON.stringify({ ...getPharmacyProfile(db), ...input.pharmacy }));
  if (input.printer) setRaw(db, KEYS.printer, JSON.stringify({ ...getPrinterSettings(db), ...input.printer }));
  return getSettings(db);
}
