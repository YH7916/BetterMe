import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PAID_USER_ID = '8404579c-776a-44ec-a2fe-74389b54bcc1';
const PAID_ASSESSMENT_ID = 'ef0e9e76-0322-45af-89cc-f4b785c7b264';

async function main() {
  // Idempotency guard: check if seed user already exists by fixed id
  const existingUser = await prisma.user.findUnique({
    where: { id: PAID_USER_ID },
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
      id: PAID_USER_ID,
      subscription: { create: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: 'seed-paid' } },
      assessments: {
        create: {
          id: PAID_ASSESSMENT_ID,
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
