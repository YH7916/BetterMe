import { prisma } from '../lib/prisma';
import type { StepUpdate } from '@betterme/shared';

function mapPatch(data: StepUpdate) {
  const { primary_goal, height_cm, weight_kg, target_weight_kg, workout_frequency, current_step, ...rest } = data;
  return {
    ...rest,
    ...(primary_goal !== undefined && { primaryGoal: primary_goal }),
    ...(height_cm !== undefined && { heightCm: height_cm }),
    ...(weight_kg !== undefined && { weightKg: weight_kg }),
    ...(target_weight_kg !== undefined && { targetWeightKg: target_weight_kg }),
    ...(workout_frequency !== undefined && { workoutFrequency: workout_frequency }),
    ...(current_step !== undefined && { currentStep: current_step }),
  };
}

export const assessmentRepo = {
  create: (userId: string) => prisma.assessment.create({ data: { userId } }),
  findById: (id: string) => prisma.assessment.findUnique({ where: { id }, include: { result: true, user: { include: { subscription: true } } } }),
  patch: (id: string, data: StepUpdate) => prisma.assessment.update({ where: { id }, data: mapPatch(data) }),
  markCompleted: (id: string) => prisma.assessment.update({ where: { id }, data: { status: 'completed' } }),
};
