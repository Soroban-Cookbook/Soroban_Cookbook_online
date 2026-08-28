import { test, expect } from '@playwright/test';

/**
 * Phase 6 (#350) — Offline behavior testing.
 *
 * Pre-PWA: assert the OfflineNotice banner. Post-PWA (#326) should extend this
 * file with cache-hit and offline-404 fallback assertions.
 */

test.describe('Offline notice (pre-PWA)', () => {
  test('shows an offline banner when the browser goes offline', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('offline-notice')).toHaveCount(0);

    await context.setOffline(true);
    // Dispatch is usually automatic with setOffline; nudge for reliability.
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    const notice = page.getByTestId('offline-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/you are offline/i);

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(notice).toHaveCount(0);
  });

  test('keeps already-loaded homepage content available while offline', async ({
    page,
    context,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Soroban Cookbook/i);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByTestId('offline-notice')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });
});
