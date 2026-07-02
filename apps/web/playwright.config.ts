import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @betterme/api dev',
      port: 8787,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @betterme/web dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
