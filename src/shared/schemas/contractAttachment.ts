import { z } from 'zod';
import { contractAttachmentFileTypeOptions, contractAttachmentSourceTypeOptions } from '../constants/enums.js';
import { baseEntitySchema, idSchema, nullableTextSchema } from './common.js';

export const contractAttachmentSchema = baseEntitySchema.extend({
  contractId: idSchema,
  fileType: z.enum(contractAttachmentFileTypeOptions),
  sourceType: z.enum(contractAttachmentSourceTypeOptions),
  originalName: z.string().trim().min(1),
  storedName: z.string().trim().min(1),
  storedPath: z.string().trim().min(1),
  mimeType: nullableTextSchema,
  sortOrder: z.number().int().min(0),
});

export const reorderContractAttachmentsSchema = z.object({
  contractId: idSchema,
  orderedIds: z.array(idSchema).min(1),
});

export const renameContractAttachmentSchema = z.object({
  id: idSchema,
  originalName: z.string().trim().min(1, '附件名称不能为空').max(200, '附件名称不能超过 200 个字符'),
});
