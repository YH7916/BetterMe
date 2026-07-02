import type { Context } from 'hono';
import type { StepUpdate } from '@betterme/shared';
import { assessmentService } from '../services/assessment.service';
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
    const a = await assessmentService.getProgress(c.req.param('id'));
    return c.json(toProgressDTO(a));
  },
  async patch(c: AppContext) {
    const body = c.get('body') as StepUpdate;
    const a = await assessmentService.saveStep(c.req.param('id'), body);
    return c.json(toProgressDTO(a!));
  },
};
