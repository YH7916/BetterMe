import { Hono } from 'hono';
import { assessmentRoutes } from './assessment.routes';
import type { AppVariables } from '../app';

export const api = new Hono<{ Variables: AppVariables }>();
api.route('/assessments', assessmentRoutes);
