import { expect, test } from '@playwright/test';

test('copy button copies the visible code block content', async ({ page, browserName }) => {
  // Playwright only supports clipboard permissions reliably on Chromium.
  // WebKit throws: Unknown permission: clipboard-write
  test.skip(
    browserName !== 'chromium',
    'Clipboard permissions are Chromium-only in Playwright',
  );

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/docs/getting-started/setup');

  const codeBlock = page.locator('pre').filter({ has: page.locator('code') }).first();
  await expect(codeBlock).toBeVisible();

  const expectedText = (await codeBlock.innerText()).trim();
  const copyButton = page
    .getByRole('button', { name: /copy code|copy to clipboard|copy/i })
    .first();

  await expect(copyButton).toBeVisible();
  await copyButton.click();

  // Docusaurus may flash "Copied" via text or aria-label; assert clipboard as source of truth.
  await expect
    .poll(async () => (await page.evaluate(() => navigator.clipboard.readText())).trim())
    .toBe(expectedText);
});
