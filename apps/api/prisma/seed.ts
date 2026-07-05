import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PAID_USER_ID = '8404579c-776a-44ec-a2fe-74389b54bcc1';
const PAID_ASSESSMENT_ID = 'ef0e9e76-0322-45af-89cc-f4b785c7b264';
const PAID_PAYMENT_REF = 'seed-paid';
const PAID_PAYMENT_IDEMPOTENCY_KEY = `seed_checkout:${PAID_USER_ID}:${PAID_ASSESSMENT_ID}`;

async function main() {
  const now = new Date();
  const targetDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: PAID_USER_ID },
      create: { id: PAID_USER_ID },
      update: {},
    });

    await tx.subscription.upsert({
      where: { userId: PAID_USER_ID },
      create: {
        userId: PAID_USER_ID,
        status: 'active',
        plan: 'pro',
        activatedAt: now,
        paymentRef: PAID_PAYMENT_REF,
      },
      update: {
        status: 'active',
        plan: 'pro',
        activatedAt: now,
        paymentRef: PAID_PAYMENT_REF,
      },
    });

    await tx.assessment.upsert({
      where: { id: PAID_ASSESSMENT_ID },
      create: {
        id: PAID_ASSESSMENT_ID,
        userId: PAID_USER_ID,
        gender: 'female',
        primaryGoal: 'lose_weight',
        age: 28,
        heightCm: 165,
        weightKg: 70,
        targetWeightKg: 60,
        workoutFrequency: 'light',
        currentStep: 4,
        status: 'completed',
      },
      update: {
        gender: 'female',
        primaryGoal: 'lose_weight',
        age: 28,
        heightCm: 165,
        weightKg: 70,
        targetWeightKg: 60,
        workoutFrequency: 'light',
        currentStep: 4,
        status: 'completed',
      },
    });

    await tx.assessmentResult.upsert({
      where: { assessmentId: PAID_ASSESSMENT_ID },
      create: {
        assessmentId: PAID_ASSESSMENT_ID,
        bmi: 25.71,
        bmiCategory: 'overweight',
        dailyCalorieIntake: 1680,
        targetDate,
        algorithmVersion: 'v1',
      },
      update: {
        bmi: 25.71,
        bmiCategory: 'overweight',
        dailyCalorieIntake: 1680,
        targetDate,
        algorithmVersion: 'v1',
      },
    });

    await tx.payment.upsert({
      where: { idempotencyKey: PAID_PAYMENT_IDEMPOTENCY_KEY },
      create: {
        userId: PAID_USER_ID,
        assessmentId: PAID_ASSESSMENT_ID,
        provider: 'mock',
        providerRef: PAID_PAYMENT_REF,
        idempotencyKey: PAID_PAYMENT_IDEMPOTENCY_KEY,
        status: 'succeeded',
        amountCents: 1900,
        currency: 'CNY',
      },
      update: {
        status: 'succeeded',
        amountCents: 1900,
        currency: 'CNY',
      },
    });
  });

  console.log('Seed demo session is ready.');
  console.log('PAID_TEST_USER_ID=', PAID_USER_ID);
  console.log('PAID_TEST_ASSESSMENT_ID=', PAID_ASSESSMENT_ID);
  console.log('PAID_TEST_TARGET_DATE=', targetDate.toISOString().slice(0, 10));
}
void main().finally(() => prisma.$disconnect());
