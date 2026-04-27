import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end tests.
 *
 * Runs against `PLAYWRIGHT_BASE_URL` (Vercel preview URL on CI) when set, or
 * the local dev server (`http://localhost:3000`) by default.
 *
 * Specs live under `tests/e2e/`. Vitest unit tests under `tests/**.test.ts`
 * are excluded via `testDir` and `testMatch` to avoid double-running.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: useLocalServer
    ? {
        command: 'npm run start',
        url: baseURL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NODE_ENV: 'production',
        },
      }
    : undefined,
});
