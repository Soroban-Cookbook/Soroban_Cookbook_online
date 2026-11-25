import { defineConfig, devices } from '@playwright/test';

/** process.env with undefined values dropped, for Playwright's env typing. */
function stringEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

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
    command: 'bun run serve --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  use: {
    /* Base URL – served by `bun run serve` or the CI serve step */
    // E2E_BASE_URL, not BASE_URL: the latter is Docusaurus's site baseUrl.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
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
