import { z } from 'zod';
import { projectExpenseOrderStatusOptions, projectExpenseTypeOptions } from '../constants/enums.js';
import { amountCentsSchema, dateStringSchema, idSchema, nullableTextSchema } from './common.js';

export const projectExpenseOrderListQuerySchema = z
  .object({
    projectId: idSchema.optional(),
    status: z.enum(projectExpenseOrderStatusOptions).optional(),
  })
  .optional();

export const createProjectExpenseOrderSchema = z.object({
  projectId: idSchema,
  supplierId: idSchema.optional().nullable(),
  expenseType: z.enum(projectExpenseTypeOptions),
  occurredDate: dateStringSchema,
  accountId: idSchema.optional().nullable(),
  remark: nullableTextSchema,
});

export const updateProjectExpenseOrderSchema = createProjectExpenseOrderSchema.partial();

export const createProjectExpenseItemSchema = z.object({
  orderId: idSchema,
  name: z.string().trim().min(1, '明细名称不能为空'),
  spec: nullableTextSchema,
  quantity: z.number().min(0),
  unit: nullableTextSchema,
  unitPriceCents: amountCentsSchema,
  amountCents: amountCentsSchema.optional(),
  remark: nullableTextSchema,
});

export const updateProjectExpenseItemSchema = createProjectExpenseItemSchema.omit({ orderId: true }).partial();

export const createProjectExpenseItemsBatchSchema = z.object({
  orderId: idSchema,
  items: z.array(createProjectExpenseItemSchema.omit({ orderId: true })).min(1, '请至少新增一条费用明细'),
});

export const idPayloadSchema = z.object({ id: idSchema });

export const updateProjectExpenseOrderPayloadSchema = z.object({
  id: idSchema,
  input: updateProjectExpenseOrderSchema,
});

export const updateProjectExpenseItemPayloadSchema = z.object({
  id: idSchema,
  input: updateProjectExpenseItemSchema,
});

export const confirmProjectExpenseOrderSchema = z.object({
  id: idSchema,
  accountId: idSchema,
});

export const voidProjectExpenseOrderSchema = z.object({
  id: idSchema,
  reason: z.string().trim().min(1, '请输入作废原因').max(200, '作废原因不能超过 200 个字符'),
});
