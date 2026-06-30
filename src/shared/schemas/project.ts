import { z } from 'zod';
import { projectStatusOptions, projectTypeOptions } from '../constants/enums.js';
import { baseEntitySchema, idSchema, nullableTextSchema } from './common.js';

export const projectSchema = baseEntitySchema.extend({
  customerId: idSchema,
  name: z.string().trim().min(1, '项目名称不能为空'),
  community: nullableTextSchema,
  address: nullableTextSchema,
  projectType: z.enum(projectTypeOptions).nullable().optional(),
  status: z.enum(projectStatusOptions),
  remark: nullableTextSchema,
});

export const createProjectSchema = projectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
