import { test, expect } from '@playwright/test';

const GITHUB_URL = 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online';

test.describe('desktop navigation', () => {
  test('home to Docs to pattern page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Soroban Cookbook/);

    // Navbar "Docs" link leads to the docs section
    await page.getByRole('link', { name: 'Docs' }).first().click();
    await expect(page).toHaveURL(/\/docs\//);

    // Navigate to a pattern page via the sidebar
    await page.getByRole('link', { name: 'Patterns' }).first().click();
    // Expand if collapsed (Docusaurus category may be a button)
    const overviewLink = page.getByRole('link', { name: 'Overview' });
    if (await overviewLink.isVisible()) {
      await overviewLink.click();
    }
    await expect(page).toHaveURL(/\/docs\/patterns/);
  });

  test('GitHub navbar link points to correct repo', async ({ page }) => {
    await page.goto('/');

    // Multiple "GitHub" links can exist (navbar + footer); assert the first matching href.
    const githubLink = page.getByRole('link', { name: 'GitHub' }).first();
    await expect(githubLink).toHaveAttribute('href', GITHUB_URL);
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function openMobileSidebar(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const toggle = page.locator('button.navbar__toggle').first();
    await expect(toggle).toBeVisible();

    // Docusaurus 3.x sets navbar-sidebar--show on the parent <nav>, and
    // hydration must complete before the toggle handler is live.
    await expect(async () => {
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
        await toggle.click();
      }
      await expect(page.locator('nav.navbar.navbar-sidebar--show')).toBeVisible({
        timeout: 2_000,
      });
      await expect(page.locator('.navbar-sidebar--show .navbar-sidebar')).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 15_000 });

    return page.locator('.navbar-sidebar--show .navbar-sidebar');
  }

  test('hamburger opens nav and Docs link is reachable', async ({ page }) => {
    const sidebar = await openMobileSidebar(page);

    const docsLink = sidebar.getByRole('link', { name: 'Docs' }).first();
    await expect(docsLink).toBeVisible();
    await docsLink.click();
    await expect(page).toHaveURL(/\/docs\//);
  });

  test('mobile menu contains GitHub link', async ({ page }) => {
    const sidebar = await openMobileSidebar(page);

    const githubLink = sidebar.getByRole('link', { name: 'GitHub' }).first();
    await expect(githubLink).toBeVisible();
  });
});
