import { z } from 'zod';
import { supplierStatusOptions, supplierTypeOptions } from '../constants/enums.js';
import { baseEntitySchema, nullableTextSchema } from './common.js';

export const supplierSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1, '供应商名称不能为空'),
  contactName: nullableTextSchema,
  phone: nullableTextSchema,
  address: nullableTextSchema,
  type: z.enum(supplierTypeOptions),
  status: z.enum(supplierStatusOptions),
  remark: nullableTextSchema,
});

export const createSupplierSchema = supplierSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
