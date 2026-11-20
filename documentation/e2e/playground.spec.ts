import { test, expect, type Page } from '@playwright/test';
import { attachConsoleGuard } from './helpers/console';

/**
 * E2E tests for the Code Playground page (`src/pages/playground.tsx`).
 *
 * The page loads the Monaco editor from the unpkg CDN at runtime and supports
 * sharing code through a `#code=<base64>` URL hash.
 */

const MONACO_TIMEOUT = 30_000;

async function waitForEditor(page: Page): Promise<void> {
  await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: MONACO_TIMEOUT });
  await expect(page.getByText('Ready', { exact: true })).toBeVisible({ timeout: MONACO_TIMEOUT });
}

test.describe('Playground', () => {
  test('loads without console errors', async ({ page }) => {
    const guard = attachConsoleGuard(page);

    await page.goto('/playground');
    await expect(page.getByRole('heading', { name: 'Code Playground' })).toBeVisible();
    await waitForEditor(page);

    guard.assertClean('playground');
  });

  test('renders the Monaco editor with the default template', async ({ page }) => {
    await page.goto('/playground');
    await waitForEditor(page);

    await expect(page.locator('.monaco-editor .view-lines')).toContainText('HelloContract');
  });

  test('Share button writes the code into the URL hash', async ({ page }) => {
    await page.goto('/playground');
    await waitForEditor(page);

    await page.getByRole('button', { name: 'Share' }).click();

    await expect(page).toHaveURL(/#code=.+/);
    await expect(
      page.getByText(/Share link copied|Share URL ready in the address bar/),
    ).toBeVisible();

    const hash = new URL(page.url()).hash.slice('#code='.length);
    expect(Buffer.from(decodeURIComponent(hash), 'base64').toString('utf8')).toContain(
      'HelloContract',
    );
  });

  test('loads a shared snippet from the URL hash', async ({ page }) => {
    const snippet = 'fn shared_snippet() {}';
    await page.goto(`/playground#code=${Buffer.from(snippet).toString('base64')}`);
    await waitForEditor(page);

    await expect(page.locator('.monaco-editor .view-lines')).toContainText('shared_snippet');
  });

  test('Reset Template restores the default template and clears the hash', async ({ page }) => {
    const snippet = 'fn shared_snippet() {}';
    await page.goto(`/playground#code=${Buffer.from(snippet).toString('base64')}`);
    await waitForEditor(page);
    await expect(page.locator('.monaco-editor .view-lines')).toContainText('shared_snippet');

    await page.getByRole('button', { name: 'Reset Template' }).click();

    await expect(page.locator('.monaco-editor .view-lines')).toContainText('HelloContract');
    await expect(page.locator('.monaco-editor .view-lines')).not.toContainText('shared_snippet');
    await expect(page).not.toHaveURL(/#code=/);
  });
});
