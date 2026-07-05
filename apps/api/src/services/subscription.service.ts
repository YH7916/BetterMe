import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { assessmentRepo } from '../repositories/assessment.repository';
import { paymentRepo } from '../repositories/payment.repository';
import { subscriptionRepo } from '../repositories/subscription.repository';
import { createHash } from 'node:crypto';

const MOCK_PAYMENT_AMOUNT_CENTS = 1900;
const MOCK_PAYMENT_CURRENCY = 'CNY';

function defaultIdempotencyKey(userId: string, assessmentId: string) {
  return `mock_checkout:${userId}:${assessmentId}`;
}

function providerRefFor(idempotencyKey: string) {
  const digest = createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32);
  return `mock_${digest}`;
}

function serializePayment(payment: Awaited<ReturnType<typeof paymentRepo.createSucceeded>> | null) {
  if (!payment) return null;
  return {
    id: payment.id,
    provider: payment.provider,
    provider_ref: payment.providerRef,
    status: payment.status,
    amount_cents: payment.amountCents,
    currency: payment.currency,
  };
}

export const subscriptionService = {
  async isMember(userId: string) {
    const s = await subscriptionRepo.findByUser(userId);
    return s?.status === 'active';
  },
  async pay(userId: string, assessmentId: string, idempotencyKey?: string) {
    const owner = await assessmentRepo.findOwnerById(assessmentId);
    if (!owner) throw AppError.notFound('assessment not found');
    if (owner.userId !== userId) throw AppError.forbidden('assessment does not belong to user');

    const s = await subscriptionRepo.findByUser(userId);
    if (!s) throw AppError.notFound('subscription not found');

    const key = idempotencyKey ?? defaultIdempotencyKey(userId, assessmentId);
    const existingPayment = await paymentRepo.findLatestSucceededForAssessment(userId, assessmentId);
    if (s.status === 'active') {
      return { status: 'active' as const, payment: serializePayment(existingPayment) };
    }

    const paymentForKey = await paymentRepo.findByIdempotencyKey(key);
    if (paymentForKey) {
      if (paymentForKey.userId !== userId || paymentForKey.assessmentId !== assessmentId) {
        throw AppError.badRequest('idempotency key belongs to another checkout', 'IDEMPOTENCY_CONFLICT');
      }
      if (paymentForKey.status !== 'succeeded') {
        throw AppError.badRequest('payment did not succeed', 'PAYMENT_NOT_SUCCEEDED');
      }
      await subscriptionRepo.activate(userId, paymentForKey.providerRef);
      return { status: 'active' as const, payment: serializePayment(paymentForKey) };
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await paymentRepo.createSucceeded({
        userId,
        assessmentId,
        providerRef: providerRefFor(key),
        idempotencyKey: key,
        amountCents: MOCK_PAYMENT_AMOUNT_CENTS,
        currency: MOCK_PAYMENT_CURRENCY,
      }, tx);
      await subscriptionRepo.activate(userId, created.providerRef, tx);
      return created;
    });

    return { status: 'active' as const, payment: serializePayment(payment) };
  },
};
