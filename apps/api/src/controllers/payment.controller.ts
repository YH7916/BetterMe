import type { Context } from 'hono';
import type { PayRequest } from '@betterme/shared';
import { subscriptionService } from '../services/subscription.service';
import type { AppVariables } from '../app';

type AppContext = Context<{ Variables: AppVariables }>;

export const paymentController = {
  async pay(c: AppContext) {
    const { assessmentId, idempotencyKey } = c.get('body') as PayRequest;
    const userId = c.get('userId')!;
    return c.json(await subscriptionService.pay(userId, assessmentId, idempotencyKey));
  },
};
