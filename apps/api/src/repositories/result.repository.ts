import { prisma } from '../lib/prisma';
import type { BmiCategory } from '@betterme/shared';

export interface ResultData {
  bmi: number; bmiCategory: BmiCategory; dailyCalorieIntake: number;
  targetDate: Date; algorithmVersion: string;
}
export const resultRepo = {
  upsert: (assessmentId: string, d: ResultData) =>
    prisma.assessmentResult.upsert({
      where: { assessmentId },
      create: { assessmentId, ...d },
      update: d,
    }),
  findByAssessment: (assessmentId: string) => prisma.assessmentResult.findUnique({ where: { assessmentId } }),
};
