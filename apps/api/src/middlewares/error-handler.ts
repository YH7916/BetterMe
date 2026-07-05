import type { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import type { AppVariables } from '../app';

export function errorHandler(err: Error, c: Context<{ Variables: AppVariables }>) {
  const requestId = c.get('requestId');
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message }, request_id: requestId }, err.status);
  }
  if (err instanceof ZodError) {
    const fields = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return c.json({
      error: { code: 'VALIDATION_ERROR', message: 'request validation failed', fields },
      request_id: requestId,
    }, 400);
  }
  // Unexpected failure: log the full error server-side (this is the only place
  // it is visible) while returning an opaque message plus a correlation id.
  (c.get('log') ?? logger).error({ err, requestId }, 'unhandled error');
  return c.json({ error: { code: 'INTERNAL', message: 'internal error' }, request_id: requestId }, 500);
}
