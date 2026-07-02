import { z } from 'zod';
import { projectExpenseTypeOptions } from '../constants/enums.js';

export const supplierAnalysisQuerySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    supplierId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    expenseType: z.enum(projectExpenseTypeOptions).optional(),
  })
  .optional();
