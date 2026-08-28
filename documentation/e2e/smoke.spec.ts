import { test, expect } from '@playwright/test';

/**
 * Cross-browser smoke tests for the Soroban Cookbook.
 *
 * These tests verify that critical pages load and render core content across
 * Chromium, Firefox, and WebKit. They run against the built static site
 * (`bun run build && bun run serve`).
 */

test.describe('Homepage', () => {
  test('loads and renders the site title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Soroban Cookbook/i);
  });

  test('navbar is visible', async ({ page }) => {
    await page.goto('/');
    const navbar = page.getByRole('navigation');
    await expect(navbar).toBeVisible();
  });

  test('Docs nav link is present', async ({ page }) => {
    await page.goto('/');
    const docsLink = page.getByRole('link', { name: /docs/i }).first();
    await expect(docsLink).toBeVisible();
  });
});

test.describe('Docs – Getting Started', () => {
  test('setup page loads', async ({ page }) => {
    await page.goto('/docs/getting-started/setup');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page).toHaveTitle(/setup/i);
  });

  test('first contract page loads', async ({ page }) => {
    await page.goto('/docs/getting-started/first-contract');
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Docs – Core Concepts', () => {
  test('introduction page loads', async ({ page }) => {
    await page.goto('/docs/concepts/introduction');
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Redirects', () => {
  test('/docs/intro redirects to /docs/concepts/introduction', async ({ page }) => {
    await page.goto('/docs/intro');
    await expect(page).toHaveURL(/\/docs\/concepts\/introduction/);
  });

  test('/docs/setup redirects to /docs/getting-started/setup', async ({ page }) => {
    await page.goto('/docs/setup');
    await expect(page).toHaveURL(/\/docs\/getting-started\/setup/);
  });
});

test.describe('Search page', () => {
  test('search results page loads and shows the search input', async ({ page }) => {
    await page.goto('/search?q=hello');
    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible();
    // Local-search plugin input (SSR or hydrated); avoid requiring a <main>
    // landmark — the search layout uses theme-layout-main without role=main.
    const searchInput = page.locator('input[name="q"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('search page has the site title in head', async ({ page }) => {
    await page.goto('/search?q=soroban');
    // Plugin sets document title to the search page heading.
    await expect(page).toHaveTitle(/search/i);
  });
});

test.describe('404 page', () => {
  test('unknown route serves the 404 page with correct heading', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('main')).toBeVisible();
    // Custom 404 page renders "Page Not Found" as the h1.
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  });

  test('404 page has a link back to Home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    const homeLink = page.getByRole('link', { name: /back to home/i });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');
  });

  test('404 page contains recovery navigation links', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    // The recovery nav has Documentation and Pattern Library links.
    await expect(page.getByRole('link', { name: /documentation/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /pattern library/i }).first()).toBeVisible();
  });
});

test.describe('Accessibility – basic', () => {
  test('homepage has exactly one <h1>', async ({ page }) => {
    await page.goto('/');
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('all images on homepage have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Evaluate once — iterating nth(i) races with lazy-loaded/detached images.
    const missing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map((img, i) => ({ i, alt: img.getAttribute('alt'), src: img.getAttribute('src') }))
        .filter((x) => x.alt === null),
    );
    expect(missing, `Images missing alt: ${JSON.stringify(missing)}`).toEqual([]);
    // Snapshot alts in one evaluate to avoid flaky nth() on lazy/detached imgs
    const images = await page.locator('img').evaluateAll((imgs) =>
      imgs.map((img) => ({
        src: img.getAttribute('src') ?? '',
        alt: img.getAttribute('alt'),
      })),
    );
    expect(images.length).toBeGreaterThan(0);
    for (const { src, alt } of images) {
      expect(alt, `Image ${src || '(no src)'} is missing alt text`).not.toBeNull();
    }

    // Single evaluate avoids flaky per-image locator timeouts on lazy/detached nodes.
    const missingAlts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .filter((img) => !img.hasAttribute('alt'))
        .map((img) => img.getAttribute('src') || img.outerHTML.slice(0, 120)),
    );

    expect(missingAlts, `Images missing alt: ${missingAlts.join(', ')}`).toEqual([]);
  });
});