import { Hono } from 'hono';
import { errorHandler } from './middlewares/error-handler';

// Typed context variables to satisfy TypeScript strict mode.
// This is a minor deviation from the plan's untyped Hono instance.
export type AppVariables = { body: unknown };

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.onError(errorHandler);
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  return app;
}
