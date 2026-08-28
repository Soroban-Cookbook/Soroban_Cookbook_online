import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser smoke-test configuration.
 *
 * Targets: Chromium (Chrome/Edge), Firefox, WebKit (Safari).
 * Tests live in documentation/e2e/ and run against the pre-built static site
 * served by `docusaurus serve` on port 3000.
 *
 * Usage:
 *   bun run build && bun run e2e              # all browsers
 *   bun run e2e:chromium                      # single browser
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run */
  timeout: 30_000,
  /* Fail the run as soon as one test fails in CI */
  forbidOnly: !!process.env.CI,
  /* No retries locally; 1 retry in CI to absorb flakiness */
  retries: process.env.CI ? 1 : 0,
  /* Parallelise across workers */
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'on-failure', outputFolder: 'playwright-report' }]],

  webServer: {
    command: 'bun run serve -- --port 3000 --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    // CI workflow starts `bun run serve` before Playwright; always reuse when present.
    // CI workflow pre-serves the build; reuse that server instead of failing on port 3000.
    // CI workflows pre-start `docusaurus serve` on :3000; always reuse when present.
    reuseExistingServer: true,
    timeout: 120_000,
  },

  use: {
    /* Base URL – served by `bun run serve` or the CI serve step */
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    /* Capture trace on first retry to aid debugging */
    trace: 'on-first-retry',
    /* Screenshots only on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});