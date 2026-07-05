import type { StepUpdate } from '@betterme/shared';
import { submitSchema, calcBmi, bmiCategory, calcDailyCalories, predictTargetDate, ALGORITHM_VERSION } from '@betterme/shared';
import { randomBytes } from 'node:crypto';
import { AppError } from '../lib/errors';
import { userRepo } from '../repositories/user.repository';
import { assessmentRepo } from '../repositories/assessment.repository';
import { resultRepo } from '../repositories/result.repository';
import { prisma } from '../lib/prisma';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const assessmentService = {
  async start() {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const user = await userRepo.createWithAssessment({ token, expiresAt });
    const a = user.assessments[0];
    if (!a) throw new Error('assessment creation failed');
    return { token, assessmentId: a.id, currentStep: a.currentStep };
  },
  async getProgress(id: string) {
    const a = await assessmentRepo.findById(id);
    if (!a) throw AppError.notFound('assessment not found');
    return a;
  },
  async saveStep(id: string, data: StepUpdate) {
    return assessmentRepo.patch(id, data);
  },
  async submit(id: string) {
    const a = await assessmentRepo.findById(id);
    if (!a) throw AppError.notFound('assessment not found');
    const parsed = submitSchema.safeParse({
      gender: a.gender,
      primary_goal: a.primaryGoal,
      age: a.age,
      height_cm: a.heightCm ? Number(a.heightCm) : undefined,
      weight_kg: a.weightKg ? Number(a.weightKg) : undefined,
      target_weight_kg: a.targetWeightKg ? Number(a.targetWeightKg) : undefined,
      workout_frequency: a.workoutFrequency,
    });
    if (!parsed.success) throw AppError.badRequest('assessment data incomplete', 'INCOMPLETE');
    const d = parsed.data;
    const bmi = calcBmi(d.weight_kg, d.height_cm);
    const result = {
      bmi,
      bmiCategory: bmiCategory(bmi),
      dailyCalorieIntake: calcDailyCalories({ gender: d.gender, age: d.age, heightCm: d.height_cm, weightKg: d.weight_kg, frequency: d.workout_frequency, goal: d.primary_goal }),
      targetDate: predictTargetDate(d.weight_kg, d.target_weight_kg, new Date()),
      algorithmVersion: ALGORITHM_VERSION,
    };
    await prisma.$transaction(async (tx) => {
      await resultRepo.upsert(id, result, tx);
      await assessmentRepo.markCompleted(id, tx);
    });
    return { status: 'completed' as const };
  },
  /**
   * Permanently deletes an assessment and everything derived from it
   * (payments, computed result). Idempotent from the caller's perspective:
   * ownership is verified upstream, so a repeat call simply 404s.
   */
  async remove(id: string) {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { assessmentId: id } }),
      prisma.assessmentResult.deleteMany({ where: { assessmentId: id } }),
      prisma.assessment.delete({ where: { id } }),
    ]);
  },
};
