import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middlewares/error-handler';
import { api } from './routes';
import { prisma } from './lib/prisma';
import { renderApiDashboard } from './lib/dashboard';
import type { assessmentRepo } from './repositories/assessment.repository';

export type AppVariables = {
  body: unknown;
  assessment?: NonNullable<Awaited<ReturnType<typeof assessmentRepo.findOwnerById>>>;
};

type ReadinessCheck = () => Promise<void>;

type CreateAppOptions = {
  readinessCheck?: ReadinessCheck;
};

function getCorsOrigin() {
  const origins = process.env.WEB_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!origins?.length) {
    return '*';
  }
  return origins.length === 1 ? origins[0] : origins;
}

async function defaultReadinessCheck() {
  await prisma.$queryRaw`SELECT 1`;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<{ Variables: AppVariables }>();
  const readinessCheck = options.readinessCheck ?? defaultReadinessCheck;
  app.onError(errorHandler);
  app.use('/api/*', cors({
    origin: getCorsOrigin(),
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-user-id'],
  }));
  app.get('/', (c) => c.html(renderApiDashboard()));
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.get('/api/ready', async (c) => {
    const startedAt = Date.now();
    try {
      await readinessCheck();
      return c.json({
        status: 'ok',
        checks: { database: 'ok' },
        latency_ms: Date.now() - startedAt,
      });
    } catch {
      return c.json({
        status: 'error',
        checks: { database: 'error' },
        latency_ms: Date.now() - startedAt,
      }, 503);
    }
  });
  app.route('/api', api);
  return app;
}
