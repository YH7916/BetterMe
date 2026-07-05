import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface CreatePaymentInput {
  userId: string;
  assessmentId: string;
  providerRef: string;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
}

export const paymentRepo = {
  findByIdempotencyKey: (idempotencyKey: string, db: DbClient = prisma) =>
    db.payment.findUnique({ where: { idempotencyKey } }),

  findLatestSucceededForAssessment: (userId: string, assessmentId: string, db: DbClient = prisma) =>
    db.payment.findFirst({
      where: { userId, assessmentId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' },
    }),

  createSucceeded: (input: CreatePaymentInput, db: DbClient = prisma) =>
    db.payment.create({
      data: {
        userId: input.userId,
        assessmentId: input.assessmentId,
        provider: 'mock',
        providerRef: input.providerRef,
        idempotencyKey: input.idempotencyKey,
        status: 'succeeded',
        amountCents: input.amountCents,
        currency: input.currency,
      },
    }),
};
