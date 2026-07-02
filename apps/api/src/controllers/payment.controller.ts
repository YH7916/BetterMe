import type { Context } from 'hono';
import type { PayRequest } from '@betterme/shared';
import { subscriptionService } from '../services/subscription.service';
import type { AppVariables } from '../app';

type AppContext = Context<{ Variables: AppVariables }>;

export const paymentController = {
  async pay(c: AppContext) {
    const { userId } = c.get('body') as PayRequest;
    return c.json(await subscriptionService.pay(userId));
  },
};
