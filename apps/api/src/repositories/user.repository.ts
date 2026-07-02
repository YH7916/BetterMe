import { prisma } from '../lib/prisma';
export const userRepo = {
  create: () => prisma.user.create({ data: { subscription: { create: {} } } }),
};
