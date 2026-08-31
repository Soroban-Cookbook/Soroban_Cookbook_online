import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Dynamically generate the list of pattern page paths
const patternsDir = path.join(__dirname, '../docs/patterns');
const files = fs.readdirSync(patternsDir);
const patternPaths = files
  .filter(file => file.endsWith('.md') || file.endsWith('.mdx'))
  .filter(file => file !== 'overview.module.css') // exclude CSS file
  .map(file => `/docs/patterns/${file.replace(/\.mdx?$/, '')}`);

test.describe('Pattern pages smoke test', () => {
  // Bypass CSP to avoid eval errors in development
  test.use({ bypassCSP: true });

  for (const path of patternPaths) {
    test(`should load ${path} without errors`, async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // Assert the page loaded (no 404) – check for h1
      await expect(page.locator('h1')).toBeVisible();

      // If the page has a "Not Found" heading, fail
      await expect(page.locator('h1')).not.toHaveText('404');

      // No console errors
      expect(consoleErrors).toEqual([]);
    });
  }
});