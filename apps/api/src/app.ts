import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './middlewares/error-handler';
import { api } from './routes';
import { env } from './config/env';
import type { assessmentRepo } from './repositories/assessment.repository';

// Typed context variables to satisfy TypeScript strict mode.
// `assessment` holds the Awaited return type of assessmentRepo.findById (non-null),
// set by the requireOwnership middleware after verifying ownership.
export type AppVariables = {
  body: unknown;
  assessment?: NonNullable<Awaited<ReturnType<typeof assessmentRepo.findById>>>;
};

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.onError(errorHandler);
  app.use('/api/*', cors({
    origin: env.WEB_ORIGIN ?? '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-user-id'],
  }));
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.route('/api', api);
  return app;
}
