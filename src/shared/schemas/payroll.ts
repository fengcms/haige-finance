import { z } from 'zod';
import { payrollBatchStatusOptions } from '../constants/enums.js';
import { amountCentsSchema, dateStringSchema, idSchema, nullableTextSchema } from './common.js';

export const payrollMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, '月份格式应为 YYYY-MM');

export const payrollBatchListQuerySchema = z
  .object({
    month: payrollMonthSchema.optional(),
    status: z.enum(payrollBatchStatusOptions).optional(),
  })
  .optional();

export const createPayrollBatchSchema = z.object({
  month: payrollMonthSchema,
  name: z.string().trim().min(1, '工资批次名称不能为空'),
  payDate: dateStringSchema.optional().nullable(),
  accountId: idSchema.optional().nullable(),
  remark: nullableTextSchema,
});

export const updatePayrollBatchSchema = createPayrollBatchSchema.partial();

const payrollMoneySchema = amountCentsSchema.default(0);

export const createPayrollItemSchema = z.object({
  batchId: idSchema,
  employeeId: idSchema,
  baseSalaryCents: payrollMoneySchema,
  attendanceBonusCents: payrollMoneySchema,
  phoneAllowanceCents: payrollMoneySchema,
  bonusCents: payrollMoneySchema,
  commissionCents: payrollMoneySchema,
  deductionCents: payrollMoneySchema,
  socialInsuranceCents: payrollMoneySchema,
  housingFundCents: payrollMoneySchema,
  taxCents: payrollMoneySchema,
  remark: nullableTextSchema,
});

export const updatePayrollItemSchema = createPayrollItemSchema.omit({ batchId: true }).partial();

export const createPayrollItemsBatchSchema = z.object({
  batchId: idSchema,
  items: z.array(createPayrollItemSchema.omit({ batchId: true })).min(1, '请至少选择一名员工'),
});

export const idPayloadSchema = z.object({
  id: idSchema,
});

export const updatePayrollBatchPayloadSchema = z.object({
  id: idSchema,
  input: updatePayrollBatchSchema,
});

export const updatePayrollItemPayloadSchema = z.object({
  id: idSchema,
  input: updatePayrollItemSchema,
});

export const payPayrollBatchSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  payDate: dateStringSchema,
  remark: nullableTextSchema,
});

export const voidPayrollBatchSchema = z.object({
  id: idSchema,
  reason: z.string().trim().min(1, '请输入作废原因').max(200, '作废原因不能超过 200 个字符'),
});
