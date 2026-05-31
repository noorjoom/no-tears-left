import { defineConfig, devices } from '@playwright/test';
import { readEnvFile } from './tests/e2e/helpers/load-env';

// E2E env is committed and test-only. Load it so webServer (build + start) bakes
// the right NEXT_PUBLIC_* values and shares AUTH_SECRET with the cookie minter.
const e2eEnv = readEnvFile('.env.e2e');
const baseURL = e2eEnv.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // Seeds the DB and mints per-role auth cookies before any test runs.
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    // Explicit env so `next build` bakes test NEXT_PUBLIC_* and the server
    // decodes cookies with the same AUTH_SECRET the minter used.
    env: e2eEnv,
  },
});
