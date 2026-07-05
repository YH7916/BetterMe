import type { Context, Next } from 'hono';
import { requestId } from 'hono/request-id';
import { logger } from '../lib/logger';
import type { AppVariables } from '../app';

/** Hono's request-id middleware — generates/propagates `X-Request-Id`. */
export const requestIdMiddleware = requestId();

/**
 * Attaches a per-request child logger (bound to the request id) and logs a
 * single structured line per request with method, path, status and duration.
 */
export async function requestContext(c: Context<{ Variables: AppVariables }>, next: Next) {
  const start = Date.now();
  const reqId = c.get('requestId');
  const log = logger.child({ requestId: reqId });
  c.set('log', log);
  await next();
  log.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: Date.now() - start,
  });
}
