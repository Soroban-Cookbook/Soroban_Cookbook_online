import { test, expect } from '@playwright/test';

/**
 * Pixel baselines for the two highest-traffic pages.
 *
 * Chromium only. Screenshot baselines are rendering-engine specific — Firefox
 * and WebKit produce different text metrics and antialiasing for identical
 * markup, so a shared baseline is impossible and a per-engine set triples the
 * maintenance for no extra signal. Cross-browser coverage comes from the
 * functional specs in this directory; this suite guards against unintended
 * visual drift. (search.a11y.spec.ts is scoped the same way.)
 *
 * Tolerances are deliberately loose: font hinting and antialiasing differ
 * between a contributor's machine and the CI runner, so an exact-pixel match
 * would fail constantly. `threshold` absorbs per-pixel colour differences and
 * `maxDiffPixelRatio` absorbs the small share of pixels that still differ,
 * while remaining tight enough to catch a real layout or colour regression.
 */

const SNAPSHOT_OPTIONS = {
  fullPage: true,
  animations: 'disabled' as const,
  threshold: 0.3,
  maxDiffPixelRatio: 0.05,
};

test.describe('Visual Regression Tests', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Pixel baselines are captured for Chromium only',
  );

  test('homepage visual appearance matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage.png', SNAPSHOT_OPTIONS);
  });

  test('setup documentation page visual appearance matches baseline', async ({ page }) => {
    await page.goto('/docs/getting-started/setup');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('setup-doc-page.png', SNAPSHOT_OPTIONS);
  });
});
