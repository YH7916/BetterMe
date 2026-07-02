import type { Context, Next } from 'hono';
import type { ZodSchema } from 'zod';
import type { AppVariables } from '../app';

export function validateBody(schema: ZodSchema) {
  return async (c: Context<{ Variables: AppVariables }>, next: Next) => {
    const raw = await c.req.json().catch(() => ({}));
    c.set('body', schema.parse(raw)); // throws ZodError -> errorHandler
    await next();
  };
}
