import { z } from 'zod';

export const pingResultSchema = z.object({
  message: z.string(),
  appName: z.string(),
  timestamp: z.string(),
  database: z.object({
    ok: z.boolean(),
    path: z.string(),
  }),
});
