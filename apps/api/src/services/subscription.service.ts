import { AppError } from '../lib/errors';
import { subscriptionRepo } from '../repositories/subscription.repository';

export const subscriptionService = {
  async isMember(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    return s?.status === 'active';
  },
  async pay(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    if (!s) throw AppError.notFound('subscription not found');
    await subscriptionRepo.activate(userId, `pay_${Date.now()}`);
    return { status: 'active' as const };
  },
};
