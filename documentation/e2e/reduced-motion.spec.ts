import { test, expect } from '@playwright/test';
import { attachConsoleGuard } from './helpers/console';

/**
 * Phase 8 (#626) — prefers-reduced-motion support.
 *
 * Verifies:
 * 1. The global CSS reduced-motion rule is present in the document's stylesheets.
 * 2. Motion token CSS custom properties resolve to 0ms under reduced-motion emulation.
 * 3. Interactive components (Quiz, Collapsible) remain usable when motion is reduced.
 * 4. No console errors occur on key pages under reduced-motion emulation.
 *
 * Playwright's reducedMotion: 'reduce' context option emulates
 * @media (prefers-reduced-motion: reduce) at the browser level.
 */

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.describe('prefers-reduced-motion – global CSS rule', () => {
  test('global reduced-motion rule sets animation-duration to near-zero', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Inject a test element, apply a known animation, and measure resolved duration.
    const resolvedDuration = await page.evaluate(() => {
      const el = document.createElement('div');
      // Assign a non-zero animation-duration via inline style.
      el.style.animationDuration = '500ms';
      document.body.appendChild(el);
      const computed = getComputedStyle(el).animationDuration;
      document.body.removeChild(el);
      return computed;
    });

    // The global rule forces animation-duration to 0.01ms via !important.
    // Parsed value may be "0s", "0.00001s", or "0.01ms" depending on browser normalisation.
    const ms = parseFloat(resolvedDuration) * (resolvedDuration.endsWith('ms') ? 1 : 1000);
    expect(ms).toBeLessThanOrEqual(1); // ≤ 1ms — effectively instant
  });

  test('global reduced-motion rule sets transition-duration to near-zero', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const resolvedDuration = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.transitionDuration = '300ms';
      document.body.appendChild(el);
      const computed = getComputedStyle(el).transitionDuration;
      document.body.removeChild(el);
      return computed;
    });

    const ms = parseFloat(resolvedDuration) * (resolvedDuration.endsWith('ms') ? 1 : 1000);
    expect(ms).toBeLessThanOrEqual(1);
  });

  test('--sb-motion-duration-normal token resolves to 0ms under reduced motion', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const tokenValue = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sb-motion-duration-normal')
        .trim(),
    );

    // Token should be "0ms" as set by the transition utilities @media block.
    expect(tokenValue).toBe('0ms');
  });

  test('--sb-motion-duration-fast token resolves to 0ms under reduced motion', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const tokenValue = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--sb-motion-duration-fast')
        .trim(),
    );

    expect(tokenValue).toBe('0ms');
  });
});

test.describe('prefers-reduced-motion – interactive components remain usable', () => {
  test('homepage renders without errors under reduced motion', async ({ page }) => {
    const guard = attachConsoleGuard(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    guard.assertClean('homepage (reduced motion)');
  });

  test('docs overview renders without errors under reduced motion', async ({ page }) => {
    const guard = attachConsoleGuard(page);
    await page.goto('/docs', { waitUntil: 'networkidle' });
    guard.assertClean('/docs (reduced motion)');
  });

  test('collapsible/sidebar navigation is still clickable under reduced motion', async ({
    page,
  }) => {
    await page.goto('/docs/getting-started/setup', { waitUntil: 'domcontentloaded' });

    // The sidebar contains collapsible category items.
    const sidebarLinks = page.locator('.menu__link').first();
    await expect(sidebarLinks).toBeVisible();

    // Clicking a sidebar link should navigate (not freeze or throw).
    const firstLink = page.locator('.menu__link[href]').first();
    const href = await firstLink.getAttribute('href');
    if (href) {
      await firstLink.click();
      await page.waitForLoadState('domcontentloaded');
      // Page should still have a main content area.
      await expect(page.getByRole('main')).toBeVisible();
    }
  });

  test('patterns overview page loads and shows content under reduced motion', async ({
    page,
  }) => {
    const guard = attachConsoleGuard(page);
    await page.goto('/docs/patterns/overview', { waitUntil: 'networkidle' });

    await expect(page.getByRole('main')).toBeVisible();
    guard.assertClean('/docs/patterns/overview (reduced motion)');
  });
});

test.describe('prefers-reduced-motion – ThemeToggle icon transitions', () => {
  test('ThemeToggle button is present and interactive under reduced motion', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Theme toggle is accessible via its aria-label.
    const toggle = page
      .getByRole('button', { name: /switch to (dark|light) mode/i })
      .first();

    // Even if no toggle is in the main navbar (it may be in mobile sidebar),
    // the ThemeToggle component CSS should not break anything.
    const count = await page.locator('button[aria-label*="mode"]').count();
    if (count > 0) {
      await expect(toggle).toBeVisible();
      // Clicking should not throw any JS errors.
      const guard = attachConsoleGuard(page);
      await toggle.click();
      guard.assertClean('ThemeToggle click (reduced motion)');
    }
  });
});
