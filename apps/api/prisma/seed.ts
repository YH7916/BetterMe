import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paidUser = await prisma.user.create({
    data: {
      subscription: { create: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: 'seed-paid' } },
      assessments: {
        create: {
          gender: 'female', primaryGoal: 'lose_weight', age: 28,
          heightCm: 165, weightKg: 70, targetWeightKg: 60,
          workoutFrequency: 'light', currentStep: 4, status: 'completed',
          result: {
            create: {
              bmi: 25.71, bmiCategory: 'overweight', dailyCalorieIntake: 1680,
              targetDate: new Date('2026-06-01'), algorithmVersion: 'v1',
            },
          },
        },
      },
    },
    include: { assessments: true },
  });
  console.log('PAID_TEST_USER_ID=', paidUser.id);
  console.log('PAID_TEST_ASSESSMENT_ID=', paidUser.assessments[0].id);
}
main().finally(() => prisma.$disconnect());
