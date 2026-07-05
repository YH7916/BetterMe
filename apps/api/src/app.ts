import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { swaggerUI } from '@hono/swagger-ui';
import { rateLimiter } from 'hono-rate-limiter';
import { env } from './config/env';
import { errorHandler } from './middlewares/error-handler';
import { requestIdMiddleware, requestContext } from './middlewares/request-context';
import { api } from './routes';
import { prisma } from './lib/prisma';
import { getOpenApiDocument } from './lib/openapi';
import { renderApiDashboard } from './lib/dashboard';
import type { Logger } from './lib/logger';
import type { assessmentRepo } from './repositories/assessment.repository';

export type AppVariables = {
  requestId: string;
  log?: Logger;
  userId?: string;
  body: unknown;
  assessment?: NonNullable<Awaited<ReturnType<typeof assessmentRepo.findOwnerById>>>;
};

type ReadinessCheck = () => Promise<void>;

type CreateAppOptions = {
  readinessCheck?: ReadinessCheck;
};

const MAX_BODY_BYTES = 16 * 1024;

function getCorsOrigin() {
  // Read at createApp() time (not import time) so per-app overrides work.
  // env.ts already fails fast at boot if WEB_ORIGIN is missing in production,
  // so this wildcard fallback only ever applies in local development / tests.
  const origins = process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  if (!origins?.length) return '*';
  return origins.length === 1 ? origins[0] : origins;
}

/** Rate-limit key: first client IP behind the proxy, falling back to a shared bucket. */
const clientKey = (c: Context) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'anonymous';

async function defaultReadinessCheck() {
  await prisma.$queryRaw`SELECT 1`;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<{ Variables: AppVariables }>();
  const readinessCheck = options.readinessCheck ?? defaultReadinessCheck;

  app.onError(errorHandler);
  app.use('*', requestIdMiddleware);
  app.use('*', requestContext);

  app.use('/api/*', cors({
    origin: getCorsOrigin(),
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use('/api/*', bodyLimit({ maxSize: MAX_BODY_BYTES }));

  // General throttle for the whole API, plus a stricter one for the two
  // resource-creating / state-changing endpoints. Disabled under test so the
  // suite's shared client key is not throttled.
  if (env.NODE_ENV !== 'test') {
    app.use('/api/*', rateLimiter({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-6', keyGenerator: clientKey }));
    app.on('POST', ['/api/v1/assessments', '/api/v1/pay'],
      rateLimiter({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-6', keyGenerator: clientKey }));
  }

  app.get('/', (c) => c.html(renderApiDashboard()));
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.get('/api/ready', async (c) => {
    const startedAt = Date.now();
    try {
      await readinessCheck();
      return c.json({ status: 'ok', checks: { database: 'ok' }, latency_ms: Date.now() - startedAt });
    } catch {
      return c.json({ status: 'error', checks: { database: 'error' }, latency_ms: Date.now() - startedAt }, 503);
    }
  });

  // Machine-readable contract + interactive docs.
  app.get('/api/v1/openapi.json', (c) => c.json(getOpenApiDocument()));
  app.get('/api/v1/docs', swaggerUI({ url: '/api/v1/openapi.json' }));

  app.route('/api/v1', api);
  return app;
}
