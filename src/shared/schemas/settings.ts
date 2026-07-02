import { z } from 'zod';
import { pageSizeOptions } from '../constants/pagination.js';

export const pageSizeSchema = z.union(
  pageSizeOptions.map((value) => z.literal(value)) as [
    z.ZodLiteral<10>,
    z.ZodLiteral<20>,
    z.ZodLiteral<50>,
    z.ZodLiteral<100>,
  ],
);

export const updateAppSettingsSchema = z.object({
  defaultPageSize: pageSizeSchema.optional(),
});
