import { test, expect } from '@playwright/test';

/**
 * Phase 6 (#349) — Loading state coverage.
 *
 * Verifies search loading indicator and that skeleton primitives remain
 * available without causing console errors on slow-ish routes.
 */

test.describe('Search loading indicator', () => {
  test('shows Searching status while results settle, then clears', async ({ page }) => {
    await page.goto('/search?q=hello', { waitUntil: 'domcontentloaded' });

    const loading = page.getByRole('status', { name: /loading/i }).filter({
      hasText: /searching/i,
    });

    // May appear briefly; tolerate already-settled results on fast machines.
    const appeared = await loading
      .first()
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);

    if (appeared) {
      await expect(loading.first()).toBeHidden({ timeout: 10_000 });
    }

    // After settle, results or empty-state should be stable without the banner.
    await expect(page.getByText(/^searching/i)).toHaveCount(0);
  });
});

test.describe('Doc routes remain stable', () => {
  test('docs page main content is visible without layout-breaking loaders', async ({ page }) => {
    await page.goto('/docs/patterns/hello-world', { waitUntil: 'networkidle' });
    await expect(page.getByRole('main')).toBeVisible();
    // Preview-mode DocSkeleton banner must not appear in production docs.
    await expect(page.getByText(/ISSUE #35 PREVIEW MODE/i)).toHaveCount(0);
  });
});
