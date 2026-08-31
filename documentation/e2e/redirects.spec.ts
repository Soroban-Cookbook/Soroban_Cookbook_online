import { test } from '@playwright/test';

const redirects = [
  { from: '/patterns', to: '/docs/patterns/' },
  { from: '/patterns/overview', to: '/docs/patterns/overview/' },
];

const normalizePath = (pathname: string) => pathname.replace(/\/$/, '') || '/';

for (const { from, to } of redirects) {
  test(`redirects ${from} -> ${to} `, async ({ page }) => {
    await page.goto(from);
    await page.waitForURL((url) => normalizePath(url.pathname) === normalizePath(to));
  });
}
