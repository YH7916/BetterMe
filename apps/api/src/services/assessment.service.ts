import type { StepUpdate } from '@betterme/shared';
import { submitSchema, calcBmi, bmiCategory, calcDailyCalories, predictTargetDate, ALGORITHM_VERSION } from '@betterme/shared';
import { AppError } from '../lib/errors';
import { userRepo } from '../repositories/user.repository';
import { assessmentRepo } from '../repositories/assessment.repository';
import { resultRepo } from '../repositories/result.repository';

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
    await resultRepo.upsert(id, {
      bmi,
      bmiCategory: bmiCategory(bmi),
      dailyCalorieIntake: calcDailyCalories({ gender: d.gender, age: d.age, heightCm: d.height_cm, weightKg: d.weight_kg, frequency: d.workout_frequency, goal: d.primary_goal }),
      targetDate: predictTargetDate(d.weight_kg, d.target_weight_kg, new Date()),
      algorithmVersion: ALGORITHM_VERSION,
    });
    await assessmentRepo.markCompleted(id);
    return { status: 'completed' as const };
  },
};
