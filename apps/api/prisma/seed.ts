import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Idempotency guard: check if seed user already exists
  const existingUser = await prisma.user.findFirst({
    where: { subscription: { paymentRef: 'seed-paid' } },
    include: { assessments: true },
  });

  if (existingUser) {
    console.log('Seed user already exists — skipping creation.');
    console.log('PAID_TEST_USER_ID=', existingUser.id);
    console.log('PAID_TEST_ASSESSMENT_ID=', existingUser.assessments[0]?.id);
    return;
  }

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
              targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), algorithmVersion: 'v1',
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
