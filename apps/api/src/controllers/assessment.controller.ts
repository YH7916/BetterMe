import type { Context } from 'hono';
import { stepUpdateSchema } from '@betterme/shared';
import { assessmentService } from '../services/assessment.service';
import { AppError } from '../lib/errors';
import { resultService } from '../services/result.service';
import type { AppVariables } from '../app';

type AppContext = Context<{ Variables: AppVariables }>;

function toProgressDTO(a: NonNullable<Awaited<ReturnType<typeof assessmentService.getProgress>>>) {
  return {
    assessmentId: a.id,
    userId: a.userId,
    gender: a.gender,
    primary_goal: a.primaryGoal,
    age: a.age,
    height_cm: a.heightCm ? Number(a.heightCm) : null,
    weight_kg: a.weightKg ? Number(a.weightKg) : null,
    target_weight_kg: a.targetWeightKg ? Number(a.targetWeightKg) : null,
    workout_frequency: a.workoutFrequency,
    current_step: a.currentStep,
    status: a.status,
  };
}

export const assessmentController = {
  async create(c: AppContext) {
    return c.json(await assessmentService.start(), 201);
  },
  async get(c: AppContext) {
    return c.json(toProgressDTO(c.get('assessment')!));
  },
  async patch(c: AppContext) {
    const body = stepUpdateSchema.parse(c.get('body'));
    const a = await assessmentService.saveStep(c.req.param('id'), body);
    if (!a) throw AppError.notFound('assessment not found');
    return c.json(toProgressDTO(a));
  },
  async submit(c: AppContext) {
    return c.json(await assessmentService.submit(c.req.param('id')));
  },
  async result(c: AppContext) {
    const assessment = c.get('assessment')!;
    return c.json(await resultService.getResult(c.req.param('id'), assessment.userId));
  },
};
