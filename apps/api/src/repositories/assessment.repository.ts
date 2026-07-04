import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { StepUpdate } from '@betterme/shared';

type DbClient = Prisma.TransactionClient | typeof prisma;

const progressSelect = {
  id: true,
  userId: true,
  gender: true,
  primaryGoal: true,
  age: true,
  heightCm: true,
  weightKg: true,
  targetWeightKg: true,
  workoutFrequency: true,
  currentStep: true,
  status: true,
};

function mapPatch(data: StepUpdate) {
  const {
    gender, age, primary_goal, height_cm, weight_kg,
    target_weight_kg, workout_frequency, current_step,
  } = data;
  return {
    ...(gender !== undefined && { gender }),
    ...(age !== undefined && { age }),
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
  findOwnerById: (id: string) => prisma.assessment.findUnique({ where: { id }, select: { id: true, userId: true } }),
  findById: (id: string) => prisma.assessment.findUnique({ where: { id }, select: progressSelect }),
  patch: (id: string, data: StepUpdate) => prisma.assessment.update({ where: { id }, data: mapPatch(data), select: progressSelect }),
  markCompleted: (id: string, db: DbClient = prisma) => db.assessment.update({ where: { id }, data: { status: 'completed' } }),
};
