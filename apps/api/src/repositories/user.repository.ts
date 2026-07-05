import { prisma } from '../lib/prisma';

interface NewSession {
  token: string;
  expiresAt: Date;
}

export const userRepo = {
  create: () => prisma.user.create({ data: { subscription: { create: {} } } }),
  createWithAssessment: (session: NewSession) => prisma.user.create({
    data: {
      subscription: { create: {} },
      assessments: { create: {} },
      sessions: { create: { token: session.token, expiresAt: session.expiresAt } },
    },
    select: {
      id: true,
      assessments: {
        select: { id: true, currentStep: true },
        take: 1,
      },
    },
  }),
};
