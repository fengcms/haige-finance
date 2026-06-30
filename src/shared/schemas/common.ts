import { z } from 'zod';

export const idSchema = z.string().min(1);
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');
export const nullableTextSchema = z.string().trim().optional().nullable();
export const amountCentsSchema = z.number().int().min(0);

export const baseEntitySchema = z.object({
  id: idSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable().optional(),
});
