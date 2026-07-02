import { prisma } from '../lib/prisma';
export const subscriptionRepo = {
  findByUser: (userId: string) => prisma.subscription.findUnique({ where: { userId } }),
  activate: (userId: string, ref: string) =>
    prisma.subscription.update({
      where: { userId },
      data: { status: 'active', plan: 'pro', activatedAt: new Date(), paymentRef: ref },
    }),
};
