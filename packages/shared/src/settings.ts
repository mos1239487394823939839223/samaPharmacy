import { z } from 'zod';

export const expiryBucketDaysSchema = z.object({
  d30: z.number().int().positive(),
  d60: z.number().int().positive(),
  d90: z.number().int().positive(),
  d180: z.number().int().positive(),
});
export type ExpiryBucketDays = z.infer<typeof expiryBucketDaysSchema>;

export const backupSettingsSchema = z.object({
  /** A second backup destination (USB stick, network share). Empty = local only. */
  secondaryDir: z.string().max(500).optional(),
  keep: z.number().int().min(1).max(365).optional(),
  intervalHours: z.number().int().min(1).max(24).optional(),
});

export const pharmacyProfileSchema = z.object({
  name: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(60).optional(),
  taxNumber: z.string().max(60).optional(),
  licenseNo: z.string().max(60).optional(),
  receiptFooter: z.string().max(300).optional(),
});

export const printerSettingsSchema = z.object({
  mode: z.enum(['none', 'system', 'network', 'share']).optional(),
  deviceName: z.string().max(200).optional(),
  host: z.string().max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  shareName: z.string().max(200).optional(),
  paperWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  format: z.enum(['receipt', 'a5']).optional(),
  copies: z.number().int().min(1).max(5).optional(),
  autoPrint: z.boolean().optional(),
  openDrawer: z.boolean().optional(),
  drawerPin: z.union([z.literal(2), z.literal(5), z.literal('auto')]).optional(),
});

export const pharmacySettingsInputSchema = z.object({
  expiryBucketDays: expiryBucketDaysSchema.optional(),
  salesReturnWindowDays: z.number().int().positive().max(365).optional(),
  backup: backupSettingsSchema.optional(),
  pharmacy: pharmacyProfileSchema.optional(),
  printer: printerSettingsSchema.optional(),
});
export type PharmacySettingsInput = z.infer<typeof pharmacySettingsInputSchema>;

export interface BackupSettings {
  secondaryDir: string;
  keep: number;
  intervalHours: number;
}

export interface PharmacyProfile {
  name: string;
  address: string;
  phone: string;
  taxNumber: string;
  licenseNo: string;
  receiptFooter: string;
}

export interface PrinterSettings {
  mode: 'none' | 'system' | 'network' | 'share';
  deviceName: string;
  host: string;
  port: number;
  shareName: string;
  paperWidth: 58 | 80;
  format: 'receipt' | 'a5';
  copies: number;
  autoPrint: boolean;
  openDrawer: boolean;
  drawerPin: 2 | 5 | 'auto';
}

export interface PrinterStatus {
  pending: number;
  failed: Array<{ id: string; lastError: string; createdAt: string }>;
  lastMessage: string | null;
}

export interface PharmacySettings {
  expiryBucketDays: ExpiryBucketDays;
  salesReturnWindowDays: number;
  backup: BackupSettings;
  pharmacy: PharmacyProfile;
  printer: PrinterSettings;
}

export interface BackupFile {
  name: string;
  path: string;
  dir: string;
  size: number;
  takenAt: string;
  reason: string;
}

export interface BackupStatus {
  /** Primary (local) backup folder. */
  primaryDir: string;
  backups: BackupFile[];
  /** Backups found in the second destination, when one is configured and reachable. */
  secondaryBackups: BackupFile[];
  lastError: string | null;
}
