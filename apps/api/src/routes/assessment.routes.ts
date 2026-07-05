import { Hono } from 'hono';
import { stepUpdateSchema } from '@betterme/shared';
import { validateBody } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { requireOwnership } from '../middlewares/ownership';
import { assessmentController } from '../controllers/assessment.controller';
import type { AppVariables } from '../app';

export const assessmentRoutes = new Hono<{ Variables: AppVariables }>();
assessmentRoutes.post('/', assessmentController.create);
assessmentRoutes.get('/:id', authenticate, requireOwnership, assessmentController.get);
assessmentRoutes.patch('/:id', authenticate, requireOwnership, validateBody(stepUpdateSchema), assessmentController.patch);
assessmentRoutes.post('/:id/submit', authenticate, requireOwnership, assessmentController.submit);
assessmentRoutes.get('/:id/result', authenticate, requireOwnership, assessmentController.result);
assessmentRoutes.delete('/:id', authenticate, requireOwnership, assessmentController.remove);
