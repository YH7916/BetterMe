import { Hono } from 'hono';
import { stepUpdateSchema } from '@betterme/shared';
import { validateBody } from '../middlewares/validate';
import { requireOwnership } from '../middlewares/ownership';
import { assessmentController } from '../controllers/assessment.controller';
import type { AppVariables } from '../app';

export const assessmentRoutes = new Hono<{ Variables: AppVariables }>();
assessmentRoutes.post('/', assessmentController.create);
assessmentRoutes.get('/:id', requireOwnership, assessmentController.get);
assessmentRoutes.patch('/:id', requireOwnership, validateBody(stepUpdateSchema), assessmentController.patch);
