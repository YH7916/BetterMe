import { AppError } from '../lib/errors';
import { resultRepo } from '../repositories/result.repository';
import { subscriptionService } from './subscription.service';
import { serializeResult } from '../lib/serializers';

export const resultService = {
  async getResult(assessmentId: string, userId: string) {
    const r = await resultRepo.findByAssessment(assessmentId);
    if (!r) throw AppError.notFound('result not ready');
    const member = await subscriptionService.isMember(userId);
    return { member, result: serializeResult(r, member) };
  },
};
