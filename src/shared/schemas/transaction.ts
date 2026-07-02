import { z } from 'zod';
import { fundTypeOptions, transactionDirectionOptions, transactionStatusOptions } from '../constants/enums.js';
import { maxPageSize } from '../constants/pagination.js';
import { amountCentsSchema, baseEntitySchema, dateStringSchema, idSchema, nullableTextSchema } from './common.js';

export const transactionSchema = baseEntitySchema.extend({
  transactionNo: nullableTextSchema,
  direction: z.enum(transactionDirectionOptions),
  amountCents: amountCentsSchema,
  occurredDate: dateStringSchema,
  accountId: idSchema,
  categoryId: idSchema,
  fundType: z.enum(fundTypeOptions),
  isCompanyFund: z.boolean(),
  affectsReceivable: z.boolean(),
  affectsProjectProfit: z.boolean(),
  customerId: idSchema.nullable().optional(),
  projectId: idSchema.nullable().optional(),
  employeeId: idSchema.nullable().optional(),
  status: z.enum(transactionStatusOptions),
  voidedAt: z.number().int().nullable().optional(),
  voidReason: nullableTextSchema,
  remark: nullableTextSchema,
});

export const createTransactionSchema = transactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  status: true,
  voidedAt: true,
  voidReason: true,
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionListQuerySchema = z
  .object({
    keyword: z.string().optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(maxPageSize).optional(),
    direction: z.enum(transactionDirectionOptions).optional(),
    status: z.enum(transactionStatusOptions).optional(),
    accountId: idSchema.optional(),
    categoryId: idSchema.optional(),
    customerId: idSchema.optional(),
    projectId: idSchema.optional(),
    employeeId: idSchema.optional(),
    fundType: z.enum(fundTypeOptions).optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
  })
  .optional();

export const voidTransactionSchema = z.object({
  id: idSchema,
  reason: z.string().trim().min(1, '请输入作废原因').max(200, '作废原因不能超过 200 个字符'),
});
