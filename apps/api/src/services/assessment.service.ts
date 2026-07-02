import type { StepUpdate } from '@betterme/shared';
import { AppError } from '../lib/errors';
import { userRepo } from '../repositories/user.repository';
import { assessmentRepo } from '../repositories/assessment.repository';

export const assessmentService = {
  async start() {
    const user = await userRepo.create();
    const a = await assessmentRepo.create(user.id);
    return { userId: user.id, assessmentId: a.id, currentStep: a.currentStep };
  },
  async getProgress(id: string) {
    const a = await assessmentRepo.findById(id);
    if (!a) throw AppError.notFound('assessment not found');
    return a;
  },
  async saveStep(id: string, data: StepUpdate) {
    await assessmentRepo.patch(id, data);
    return assessmentRepo.findById(id);
  },
};
