import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The shared package is pure logic (health algorithm + zod contracts) with
    // no I/O, so it can hold a real coverage gate.
    coverage: {
      provider: 'v8',
      include: ['src/health/**', 'src/schemas/**'],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
