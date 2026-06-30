import { z } from 'zod';
import { contractStatusOptions } from '../constants/enums.js';
import { amountCentsSchema, baseEntitySchema, dateStringSchema, idSchema, nullableTextSchema } from './common.js';

export const contractSchema = baseEntitySchema.extend({
  customerId: idSchema,
  projectId: idSchema,
  contractNo: nullableTextSchema,
  name: z.string().trim().min(1, '合同名称不能为空'),
  amountCents: amountCentsSchema,
  signedDate: dateStringSchema.nullable().optional(),
  status: z.enum(contractStatusOptions),
  remark: nullableTextSchema,
  attachmentPath: nullableTextSchema,
});

export const createContractSchema = contractSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
