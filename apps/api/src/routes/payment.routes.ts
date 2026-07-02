import { Hono } from 'hono';
import { paySchema } from '@betterme/shared';
import { validateBody } from '../middlewares/validate';
import { paymentController } from '../controllers/payment.controller';
import type { AppVariables } from '../app';

export const paymentRoutes = new Hono<{ Variables: AppVariables }>();
paymentRoutes.post('/', validateBody(paySchema), paymentController.pay);
