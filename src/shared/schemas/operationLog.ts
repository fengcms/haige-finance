import { z } from 'zod';
import { operationActionOptions } from '../constants/enums.js';
import { idSchema, nullableTextSchema } from './common.js';

export const operationLogSchema = z.object({
  id: idSchema,
  entityType: z.string().trim().min(1),
  entityId: idSchema.nullable().optional(),
  action: z.enum(operationActionOptions),
  detail: nullableTextSchema,
  createdAt: z.number().int(),
});
