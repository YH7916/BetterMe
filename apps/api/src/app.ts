import { Hono } from 'hono';
import { errorHandler } from './middlewares/error-handler';
import { api } from './routes';
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
  app.get('/api/health', (c) => c.json({ status: 'ok' }));
  app.route('/api', api);
  return app;
}
