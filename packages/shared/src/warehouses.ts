import { z } from 'zod';

export const warehouseInputSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  isDefault: z.boolean().optional(),
});
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;

export interface WarehouseRow {
  id: number;
  nameAr: string;
  isDefault: number;
  isActive: number;
}
