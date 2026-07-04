import { prisma } from '../lib/prisma';
export const userRepo = {
  create: () => prisma.user.create({ data: { subscription: { create: {} } } }),
  createWithAssessment: () => prisma.user.create({
    data: {
      subscription: { create: {} },
      assessments: { create: {} },
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
