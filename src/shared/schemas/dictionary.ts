import { z } from 'zod';
import { dictionaryStatusOptions, dictionaryTypeOptions } from '../constants/dictionaries.js';
import { idSchema, nullableTextSchema } from './common.js';

export const dictionaryQuerySchema = z
  .object({
    dictType: z.enum(dictionaryTypeOptions).optional(),
  })
  .optional();

export const updateDictionaryItemSchema = z.object({
  name: z.string().trim().min(1, '字典名称不能为空').max(100, '字典名称不能超过 100 个字符').optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.enum(dictionaryStatusOptions).optional(),
  remark: nullableTextSchema,
});

export const updateDictionaryItemPayloadSchema = z.object({
  id: idSchema,
  input: updateDictionaryItemSchema,
});
