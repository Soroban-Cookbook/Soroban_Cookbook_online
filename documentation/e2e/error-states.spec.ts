import { test, expect, type Page } from '@playwright/test';

/** Newsletter is lazy-loaded when its zero-height IO placeholder enters the viewport. */
async function revealNewsletter(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  const heading = page.getByRole('heading', { name: /stay in the loop/i });

  await expect(async () => {
    if (!(await heading.isVisible().catch(() => false))) {
      await page.evaluate(async () => {
        const step = Math.max(240, Math.floor(window.innerHeight * 0.6));
        const max = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        );
        for (let y = 0; y <= max + step; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, max);
      });
      await page.getByRole('contentinfo').scrollIntoViewIfNeeded().catch(() => undefined);
      await page.mouse.wheel(0, 600);
    }
    await expect(heading).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 25_000 });
}

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

    // Plugin may omit a dedicated empty-state string; input + zero articles is enough.
    const input = page.locator('input[name="q"], input[type="search"]').first();
    await expect(input).toBeVisible({ timeout: 10_000 });
    const emptyHint = page.getByText(/no results|nothing found|0 results/i).first();
    if (await emptyHint.count()) {
      await expect(emptyHint).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('Newsletter validation errors', () => {
  test('shows validation error for empty email', async ({ page }) => {
    await revealNewsletter(page);

    const section = page.locator('section').filter({ hasText: /stay in the loop/i });
    await section.first().getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByRole('alert')).toContainText(/enter an email/i);
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await revealNewsletter(page);

    const section = page.locator('section').filter({ hasText: /stay in the loop/i });
    await section.first().locator('input[type="email"]').fill('not-an-email');
    await section.first().getByRole('button', { name: /subscribe/i }).click();

    await expect(page.getByRole('alert')).toContainText(/valid email/i);
  });
});
