import { z } from 'zod';

export const expiryBucketDaysSchema = z.object({
  d30: z.number().int().positive(),
  d60: z.number().int().positive(),
  d90: z.number().int().positive(),
  d180: z.number().int().positive(),
});
export type ExpiryBucketDays = z.infer<typeof expiryBucketDaysSchema>;

export const pharmacySettingsInputSchema = z.object({
  expiryBucketDays: expiryBucketDaysSchema.optional(),
  salesReturnWindowDays: z.number().int().positive().optional(),
});
export type PharmacySettingsInput = z.infer<typeof pharmacySettingsInputSchema>;

export interface PharmacySettings {
  expiryBucketDays: ExpiryBucketDays;
  salesReturnWindowDays: number;
}
