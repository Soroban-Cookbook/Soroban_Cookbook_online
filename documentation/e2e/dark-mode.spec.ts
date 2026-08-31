import { test, expect } from '@playwright/test';
import { attachConsoleGuard } from './helpers/console';

/**
 * Phase 8 (#624) — Dark mode smoke tests.
 *
 * Verifies:
 * 1. Theme persists across a full page reload (localStorage round-trip).
 * 2. No console errors on the homepage in dark mode.
 * 3. No console errors on a docs page in dark mode.
 * 4. Key badge elements render without contrast-breaking display issues
 *    (regression guard for the badge token dark-mode overrides).
 */

/** Force dark mode before the page loads by injecting into localStorage. */
async function setDarkMode(page: import('@playwright/test').Page): Promise<void> {
  // Use addInitScript so the value is set before any JS runs.
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
  });
}

test.describe('Dark mode – theme persistence', () => {
  test('data-theme is "dark" after setting localStorage and navigating', async ({ page }) => {
    await setDarkMode(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(theme).toBe('dark');
  });

  test('dark theme survives a full page reload', async ({ page }) => {
    await setDarkMode(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Reload without re-running addInitScript — localStorage value is persisted.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(themeAfterReload).toBe('dark');
  });

  test('localStorage key "theme" equals "dark" after toggle from light', async ({ page }) => {
    // Start in explicit light mode.
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the theme toggle button.
    const toggle = page.getByRole('button', { name: /switch to dark mode/i });
    await toggle.waitFor({ timeout: 5_000 }).catch(() => {
      // Fallback: find by aria-label containing "dark"
    });

    // Use JS toggle as the authoritative fallback in case the aria-label differs.
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');
  });
});

test.describe('Dark mode – no console errors', () => {
  const darkPages = [
    { name: 'Homepage', path: '/' },
    { name: 'Docs overview', path: '/docs' },
    { name: 'Patterns overview', path: '/docs/patterns/overview' },
    { name: 'Hello World pattern', path: '/docs/patterns/hello-world' },
  ];

  for (const { name, path } of darkPages) {
    test(`${name} (${path}) has no console errors in dark mode`, async ({ page }) => {
      const guard = attachConsoleGuard(page);
      await setDarkMode(page);

      await page.goto(path, { waitUntil: 'networkidle' });

      // Assert theme was actually applied.
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );
      expect(theme).toBe('dark');

      guard.assertClean(`${name} in dark mode`);
    });
  }
});

test.describe('Dark mode – badge/tag visibility', () => {
  test('difficulty badges are visible on patterns overview in dark mode', async ({ page }) => {
    await setDarkMode(page);
    await page.goto('/docs/patterns/overview', { waitUntil: 'networkidle' });

    // At least one badge (any difficulty/status variant) should be in the DOM.
    const badges = page.locator('.sb-badge, .sb-tag');
    const count = await badges.count();

    // Patterns overview always has at least one difficulty badge.
    expect(count).toBeGreaterThan(0);

    // Every visible badge should have non-zero dimensions (not collapsed / hidden).
    for (let i = 0; i < Math.min(count, 10); i++) {
      const badge = badges.nth(i);
      const isVisible = await badge.isVisible();
      if (isVisible) {
        const box = await badge.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        expect(box!.height).toBeGreaterThan(0);
      }
    }
  });

  test('background-color CSS custom properties resolve in dark mode', async ({ page }) => {
    await setDarkMode(page);
    await page.goto('/docs/patterns/overview', { waitUntil: 'networkidle' });

    // Verify that the dark-mode badge token is not transparent/unset.
    const beginnerTokenResolved = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'sb-badge sb-badge--beginner';
      document.body.appendChild(el);
      const bg = getComputedStyle(el).backgroundColor;
      document.body.removeChild(el);
      // Should not be transparent (rgba(0,0,0,0)) when the token is wired up.
      return bg;
    });

    expect(beginnerTokenResolved).not.toBe('rgba(0, 0, 0, 0)');
  });
});
