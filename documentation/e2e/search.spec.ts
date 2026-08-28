import { test, expect } from '@playwright/test';
import { attachConsoleGuard } from './helpers/console';

/**
 * Cross-browser E2E coverage for the /search route rendered by
 * @easyops-cn/docusaurus-search-local.
 *
 * Selectors used here are deliberately stable hooks defined in
 * src/css/search-experience.css:
 *   - search input          → `input[name="q"]` inside `main .container.margin-vert--lg`
 *   - per-hit results       → `main .container.margin-vert--lg article`
 *
 * CSS-module-hashed class names from the plugin (e.g. `.aaBbCc`) are NOT
 * queried — they change between releases and would make these tests brittle.
 */

test.describe('search results page (/search)', () => {
  test('renders the search input on /search', async ({ page }) => {
    const guard = attachConsoleGuard(page);
    await page.goto('/search');
    const input = page.locator('main .container.margin-vert--lg input[name="q"]');
    await expect(input).toBeVisible();
    guard.assertClean('/search');
  });

  test('empty /search (no query param) renders no result articles', async ({ page }) => {
    await page.goto('/search');
    const articles = page.locator('main .container.margin-vert--lg article');
    // Allow a short settle window for the plugin to clear results.
    await expect.poll(async () => await articles.count(), { timeout: 10_000 }).toBe(0);
  });

  test('renders at least one result article for a populated query', async ({ page }) => {
    const guard = attachConsoleGuard(page);
    await page.goto('/search?q=setup');
    const articles = page.locator('main .container.margin-vert--lg article');
    await expect(articles.first()).toBeVisible({ timeout: 5000 });
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
    guard.assertClean('/search?q=setup');
  });

  test('first result link points to a real /docs/ page', async ({ page }) => {
    await page.goto('/search?q=hello');
    const firstResult = page.locator('main .container.margin-vert--lg article').first();
    await expect(firstResult).toBeVisible({ timeout: 5000 });
    const href = await firstResult.locator('a').first().getAttribute('href');
    expect(href, `first result href: ${href}`).toMatch(/^\/docs\//);
  });

  test('no-results query shows zero articles without throwing', async ({ page }) => {
    const guard = attachConsoleGuard(page);
    // A string that the lunr index can never contain.
    await page.goto('/search?q=zzzznosuchqueryzzzz');
    const articles = page.locator('main .container.margin-vert--lg article');
    await expect.poll(async () => await articles.count(), { timeout: 10_000 }).toBe(0);
    // The input is still there, so the user can refine.
    const input = page.locator('main .container.margin-vert--lg input[name="q"]');
    await expect(input).toBeVisible();
    guard.assertClean('/search (empty state)');
  });

  test('typing into the input and pressing Enter updates the URL', async ({ page }) => {
    await page.goto('/search');
    const input = page.locator('main .container.margin-vert--lg input[name="q"]');
    await input.fill('soroban testing');
    await input.press('Enter');
    await expect(page).toHaveURL(/q=soroban(\+|%20)testing/);
  });

  test('clicking a result article link navigates to a docs page that loads', async ({ page }) => {
    await page.goto('/search?q=setup');
    const firstLink = page
      .locator('main .container.margin-vert--lg article a')
      .first();
    await expect(firstLink).toBeVisible({ timeout: 5000 });
    await firstLink.click();
    await expect(page).toHaveURL(/\/docs\//);
    // The destination page should render an <h1> (any Docusaurus doc has one).
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
