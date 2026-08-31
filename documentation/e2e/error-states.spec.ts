import { test, expect } from '@playwright/test';

/**
 * Phase 6 (#348) — Error message / error-state coverage.
 *
 * Verifies graceful UI for 404, search no-results, and newsletter validation.
 * Newsletter HTTP/network failures are covered by Vitest unit tests
 * (`NewsletterSignup.test.tsx`) because demo builds omit NEWSLETTER_ENDPOINT.
 *
 * Runs against the built static site (`bun run build && bun run serve`).
 */

test.describe('404 page', () => {
  test('renders custom not-found UI with recovery links', async ({ page }) => {
    await page.goto('/this-route-does-not-exist', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();

    const recovery = page.getByRole('navigation', { name: /recovery navigation/i });
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole('link', { name: /documentation/i })).toBeVisible();
    await expect(recovery.getByRole('link', { name: /pattern library/i })).toBeVisible();
    await expect(recovery.getByRole('link', { name: /github/i })).toBeVisible();
  });
});

test.describe('Search no-results', () => {
  test('shows an empty-state message for unmatched queries', async ({ page }) => {
    const nonsense = 'zzzxnonexistentquery999xyz';
    await page.goto(`/search?q=${nonsense}`, { waitUntil: 'networkidle' });

    // Local search renders results asynchronously — wait until the list settles.
    await expect
      .poll(async () => page.locator('.container.margin-vert--lg article').count(), {
        timeout: 10_000,
      })
      .toBe(0);

    const emptyHint = page
      .getByText(/no documents were found|no results|nothing found|0 results/i)
      .first();
    await expect(emptyHint).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Newsletter validation errors', () => {
  test('shows validation error for empty email', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // NewsletterSignup is lazy-mounted once it scrolls into view, so bring it
    // into the viewport before asserting on it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const section = page.locator('section').filter({ hasText: /stay in the loop/i });
    await expect(section.first()).toBeVisible({ timeout: 15_000 });

    await section.first().getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByRole('alert')).toContainText(/enter an email/i);
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // NewsletterSignup is lazy-mounted once it scrolls into view, so bring it
    // into the viewport before asserting on it.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const section = page.locator('section').filter({ hasText: /stay in the loop/i });
    await expect(section.first()).toBeVisible({ timeout: 15_000 });

    await section.first().locator('input[type="email"]').fill('not-an-email');
    await section.first().getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByRole('alert')).toContainText(/valid email/i);
  });
});
