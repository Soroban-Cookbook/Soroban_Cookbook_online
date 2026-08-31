import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated Accessibility Audit Test Suite.
 * Uses @axe-core/playwright to scan static documentation pages for WCAG 2.1 A and AA compliance.
 * Fails on critical and serious accessibility violations.
 */

const PAGES_TO_TEST = [
  { name: 'Homepage', path: '/' },
  { name: '404 Error Page', path: '/404-nonexistent-page' },
  { name: 'Documentation Overview', path: '/docs' },
  { name: 'Pattern Library Overview', path: '/docs/patterns/overview' },
  { name: 'Getting Started Setup Guide', path: '/docs/getting-started/setup' },
  { name: 'Security Fundamentals', path: '/docs/security/fundamentals' },
];

test.describe('Automated Accessibility Audit (@axe-core)', () => {
  for (const { name, path } of PAGES_TO_TEST) {
    test(`${name} (${path}) should have no critical or serious accessibility violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Cards on these pages fade in. Scanning mid-transition samples
      // part-way-composited colours, which made this suite flaky and reported
      // contrast failures for colours that never actually render. Freeze
      // animations so axe sees the settled page.
      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }`,
      });
      await page.waitForTimeout(250);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalAndSeriousViolations = accessibilityScanResults.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious'
      );

      if (criticalAndSeriousViolations.length > 0) {
        console.error(
          `[a11y regression] ${name} (${path}) has ${criticalAndSeriousViolations.length} severe accessibility violations:`
        );
        for (const v of criticalAndSeriousViolations) {
          console.error(`- ${v.id} (${v.impact}): ${v.description} -> ${v.helpUrl}`);
        }
      }

      expect(criticalAndSeriousViolations).toEqual([]);
    });
  }
});
