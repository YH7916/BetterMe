import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Must run before test files import src/lib/prisma.ts so DATABASE_URL is
    // already set when the PrismaClient singleton is created.
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
  },
});
