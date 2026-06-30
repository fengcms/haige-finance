import { z } from 'zod';
import { categoryStatusOptions, categoryTypeOptions, fundTypeOptions } from '../constants/enums.js';
import { baseEntitySchema, nullableTextSchema } from './common.js';

export const categorySchema = baseEntitySchema.extend({
  name: z.string().trim().min(1, '分类名称不能为空'),
  type: z.enum(categoryTypeOptions),
  fundType: z.enum(fundTypeOptions).nullable().optional(),
  affectsReceivable: z.boolean(),
  affectsProjectProfit: z.boolean(),
  sortOrder: z.number().int().min(0),
  status: z.enum(categoryStatusOptions),
  remark: nullableTextSchema,
});

export const createCategorySchema = categorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
