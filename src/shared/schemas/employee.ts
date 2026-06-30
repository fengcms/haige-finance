import { z } from 'zod';
import { employeeStatusOptions } from '../constants/enums.js';
import { baseEntitySchema, dateStringSchema, nullableTextSchema } from './common.js';

export const employeeSchema = baseEntitySchema.extend({
  name: z.string().trim().min(1, '员工姓名不能为空'),
  phone: nullableTextSchema,
  position: nullableTextSchema,
  entryDate: dateStringSchema.nullable().optional(),
  status: z.enum(employeeStatusOptions),
  remark: nullableTextSchema,
});

export const createEmployeeSchema = employeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
