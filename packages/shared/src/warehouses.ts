import { z } from 'zod';

export const warehouseInputSchema = z.object({
  nameAr: z.string().min(1),
  isDefault: z.boolean().optional(),
});
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;

export interface WarehouseRow {
  id: number;
  nameAr: string;
  isDefault: number;
  isActive: number;
}
