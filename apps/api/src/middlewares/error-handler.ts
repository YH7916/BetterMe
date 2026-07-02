import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: err.issues[0]?.message ?? 'invalid' } }, 400);
  }
  return c.json({ error: { code: 'INTERNAL', message: 'internal error' } }, 500);
}
