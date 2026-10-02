import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility scan of the /search page using @axe-core/playwright.
 *
 * Restricted to Chromium because axe-core runs the full DOM and a
 * significant number of style- and layout-dependent rules (color-contrast,
 * visual-order). Chromium gives the most reliable results; Firefox and
 * WebKit frequently introduce their own false positives on search pages
 * whose layout is provided by a third-party plugin.
 *
 * We pre-wait for the search input to mount before scanning so we don't
 * catch an intermediate "plugin is hydrating" frame.
 *
 * Three page-level axe rules are disabled because the /search page
 * intentionally does not own a heading hierarchy of its own or a landmark
 * tree of its own — the host Docusaurus layout does, and we are scanning
 * the plugin's contribution only.
 */
const DISABLED_AXE_RULES = ['page-has-heading-one', 'landmark-one-main', 'region'];

test.describe('search page a11y (chromium)', () => {
  test('/search?q=setup has no axe-core violations', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'axe-core scan is chromium only');
    await page.goto('/search?q=setup');

    const input = page.locator('.main-wrapper .container.margin-vert--lg input[name="q"]');
    await expect(input).toBeVisible({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .disableRules(DISABLED_AXE_RULES)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/search empty state has no axe-core violations', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'axe-core scan is chromium only');
    await page.goto('/search?q=zzznoresultssurelymissingzzz');

    const input = page.locator('.main-wrapper .container.margin-vert--lg input[name="q"]');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Confirm we are actually in the zero-results state before scanning.
    await expect
      .poll(
        async () => await page.locator('.main-wrapper .container.margin-vert--lg article').count(),
        { timeout: 10_000 },
      )
      .toBe(0);

    const results = await new AxeBuilder({ page })
      .disableRules(DISABLED_AXE_RULES)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
