import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().optional(),
    WEB_ORIGIN: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // In production we refuse to fall back to a wildcard CORS origin — an
    // explicit allow-list must be configured.
    if (val.NODE_ENV === 'production' && !val.WEB_ORIGIN?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['WEB_ORIGIN'],
        message: 'WEB_ORIGIN is required in production (comma-separated allowed origins)',
      });
    }
  });

export const env = schema.parse(process.env);
