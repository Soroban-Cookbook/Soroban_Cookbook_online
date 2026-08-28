import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage visual appearance matches baseline', async ({ page }) => {
    await page.goto('/');
    // Wait for fonts to load and animations to stabilize
    await page.waitForLoadState('networkidle');
    // Take screenshot of the entire viewport and assert
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // allow minor rendering differences
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
