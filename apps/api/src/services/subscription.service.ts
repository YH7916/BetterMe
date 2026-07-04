import { AppError } from '../lib/errors';
import { assessmentRepo } from '../repositories/assessment.repository';
import { subscriptionRepo } from '../repositories/subscription.repository';

export const subscriptionService = {
  async isMember(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    return s?.status === 'active';
  },
  async pay(userId: string, assessmentId: string) {
    const owner = await assessmentRepo.findOwnerById(assessmentId);
    if (!owner) throw AppError.notFound('assessment not found');
    if (owner.userId !== userId) throw AppError.forbidden('assessment does not belong to user');

    const s = await subscriptionRepo.findByUser(userId);
    if (!s) throw AppError.notFound('subscription not found');
    if (s.status === 'active') return { status: 'active' as const };
    await subscriptionRepo.activate(userId, `pay_${Date.now()}`);
    return { status: 'active' as const };
  },
};
