import { test, expect } from '@playwright/test';

/**
 * Visual regression baselines are platform-specific (e.g. *-chromium-linux.png)
 * and are not committed yet. Skip until baselines are generated with:
 *   bunx playwright test e2e/visual-regression.spec.ts --update-snapshots
 */
test.describe('Visual Regression Tests', () => {
  test.skip(true, 'Visual baselines not committed for CI platforms yet');

  test('homepage visual appearance matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('setup documentation page visual appearance matches baseline', async ({ page }) => {
    await page.goto('/docs/getting-started/setup');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('setup-doc-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
