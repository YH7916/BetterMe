import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { BmiCategory } from '@betterme/shared';

export interface ResultData {
  bmi: number; bmiCategory: BmiCategory; dailyCalorieIntake: number;
  targetDate: Date; algorithmVersion: string;
}
type DbClient = Prisma.TransactionClient | typeof prisma;

export const resultRepo = {
  upsert: (assessmentId: string, d: ResultData, db: DbClient = prisma) =>
    db.assessmentResult.upsert({
      where: { assessmentId },
      create: { assessmentId, ...d },
      update: d,
    }),
  findByAssessment: (assessmentId: string) => prisma.assessmentResult.findUnique({ where: { assessmentId } }),
};
