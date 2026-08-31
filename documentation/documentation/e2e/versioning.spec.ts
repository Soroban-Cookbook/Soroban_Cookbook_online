import { test, expect } from '@playwright/test';

test.describe('Docs version switcher', () => {
  test('should switch between Next and 22.0 versions', async ({ browser }) => {
    const context = await browser.newContext({
      bypassCSP: true,
    });
    const page = await context.newPage();

    await page.goto('/');

    // Locate the version dropdown (adjust selector if needed)
    const dropdown = page.locator('.navbar__item .dropdown--version');
    await expect(dropdown).toBeVisible();

    // Switch to 22.0
    await dropdown.click();
    await page.locator('text=22.0').click();
    await expect(page).toHaveURL(/\/22\.0\//);
    await expect(page.locator('h1')).toBeVisible();

    // Switch back to Next
    await page.locator('.navbar__item .dropdown--version').click();
    await page.locator('text=Next').click();
    await expect(page).not.toHaveURL(/\/22\.0\//);
    await expect(page.locator('h1')).toBeVisible();

    await context.close();
  });
});