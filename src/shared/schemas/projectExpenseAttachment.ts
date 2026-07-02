import { z } from 'zod';
import { projectExpenseAttachmentSourceTypeOptions } from '../constants/enums.js';
import { baseEntitySchema, idSchema } from './common.js';

export const projectExpenseAttachmentSchema = baseEntitySchema.extend({
  orderId: idSchema,
  sourceType: z.enum(projectExpenseAttachmentSourceTypeOptions),
  originalName: z.string().trim().min(1),
  storedName: z.string().trim().min(1),
  storedPath: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
});

export const projectExpenseOrderIdPayloadSchema = z.object({
  orderId: idSchema,
});

export const createProjectExpenseAttachmentFromDataUrlSchema = z.object({
  orderId: idSchema,
  dataUrl: z.string().startsWith('data:image/', '请粘贴图片'),
  originalName: z.string().trim().min(1).max(200).optional(),
});

export const projectExpenseAttachmentIdPayloadSchema = z.object({
  id: idSchema,
});
