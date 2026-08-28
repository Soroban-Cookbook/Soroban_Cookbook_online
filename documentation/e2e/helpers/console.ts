import type { Page } from '@playwright/test';

const IGNORED_CONSOLE_PATTERNS = [
  /favicon\.ico/i,
  /Failed to load resource.*404/i,
  // Static `serve` of the production build may not expose PWA sw.js the same way
  // as the deployed host; ignore Service Worker registration noise.
  /bad HTTP response code \(404\).*script/i,
  /registerSW failed/i,
  /Failed to register a ServiceWorker/i,
  /sw\.js/i,
  // Recoverable hydration mismatch noise on the custom 404 page under React 19.
  /Minified React error #418/i,
  /onRecoverableError/i,
];

export interface ConsoleGuard {
  errors: string[];
  assertClean: (context: string) => void;
}

export function attachConsoleGuard(page: Page): ConsoleGuard {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return;
    }

    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) {
      return;
    }

    errors.push(text);
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return {
    errors,
    assertClean(context: string) {
      if (errors.length > 0) {
        throw new Error(
          `Console errors on ${context}:\n${errors.map((entry) => `- ${entry}`).join('\n')}`,
        );
      }
    },
  };
}

export async function waitForHomepageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: 'Popular Patterns' }).waitFor({ timeout: 10_000 });
}
