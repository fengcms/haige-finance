import { z } from 'zod';
import { accountStatusOptions, accountTypeOptions } from '../constants/enums.js';
import { amountCentsSchema, baseEntitySchema, nullableTextSchema } from './common.js';

export const accountSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1, '账户名称不能为空'),
  type: z.enum(accountTypeOptions),
  status: z.enum(accountStatusOptions),
  openingBalanceCents: amountCentsSchema,
  remark: nullableTextSchema,
});

export const createAccountSchema = accountSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
