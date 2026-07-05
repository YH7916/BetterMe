import { prisma } from '../lib/prisma';

export const sessionRepo = {
  /** Resolve a bearer token to its owning user, only if the session has not expired. */
  findValid: (token: string) =>
    prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      select: { userId: true },
    }),
};
