import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import type { AppVariables } from '../app';

export function errorHandler(err: Error, c: Context<{ Variables: AppVariables }>) {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const path = issue?.path.join('.') ?? '';
    const message = path ? `${path}: ${issue?.message}` : (issue?.message ?? 'invalid');
    return c.json({ error: { code: 'VALIDATION_ERROR', message } }, 400);
  }
  return c.json({ error: { code: 'INTERNAL', message: 'internal error' } }, 500);
}
