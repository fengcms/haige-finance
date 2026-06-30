import { z } from 'zod';
import { customerStatusOptions } from '../constants/enums.js';
import { baseEntitySchema, nullableTextSchema } from './common.js';

export const customerSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1, '客户姓名不能为空'),
  phone: nullableTextSchema,
  address: nullableTextSchema,
  community: nullableTextSchema,
  houseNumber: nullableTextSchema,
  status: z.enum(customerStatusOptions),
  remark: nullableTextSchema,
});

export const createCustomerSchema = customerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
