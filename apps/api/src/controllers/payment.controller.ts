import type { Context } from 'hono';
import type { PayRequest } from '@betterme/shared';
import { subscriptionService } from '../services/subscription.service';
import { AppError } from '../lib/errors';
import type { AppVariables } from '../app';

type AppContext = Context<{ Variables: AppVariables }>;

export const paymentController = {
  async pay(c: AppContext) {
    const { userId } = c.get('body') as PayRequest;
    const caller = c.req.header('x-user-id');
    if (!caller || caller !== userId) {
      throw AppError.forbidden('cannot pay for another user');
    }
    return c.json(await subscriptionService.pay(userId));
  },
};
