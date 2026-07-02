import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Must run before test files import src/lib/prisma.ts so DATABASE_URL is
    // already set when the PrismaClient singleton is created.
    setupFiles: ['./tests/setup.ts'],
    environment: 'node',
    // Integration tests hit a remote Supabase (ap-southeast-2). Connection
    // setup + per-test resetDb round-trips exceed Vitest's 5s default, so
    // give DB-backed tests and their beforeEach hooks generous timeouts.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
