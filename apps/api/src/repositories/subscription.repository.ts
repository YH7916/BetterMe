import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | typeof prisma;

export const subscriptionRepo = {
  findByUser: (userId: string) => prisma.subscription.findUnique({ where: { userId } }),
  activate: (userId: string, ref: string, db: DbClient = prisma) =>
    db.subscription.update({
      where: { userId },
      data: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: ref },
    }),
};
