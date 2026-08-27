import { test } from '@playwright/test';
import { attachConsoleGuard, waitForHomepageReady } from './helpers/console';

const smokePaths = [
  {
    name: 'homepage',
    path: '/',
    ready: waitForHomepageReady,
  },
  {
    name: 'docs welcome',
    path: '/docs',
  },
  {
    name: 'hello world pattern',
    path: '/docs/patterns/hello-world',
  },
  {
    name: 'patterns overview',
    path: '/docs/patterns/overview',
  },
  {
    name: 'search results',
    path: '/search?q=hello',
  },
  {
    name: '404 page',
    path: '/this-route-does-not-exist',
  },
];

for (const route of smokePaths) {
  test(`no console errors on ${route.name}`, async ({ page }) => {
    const guard = attachConsoleGuard(page);

    await page.goto(route.path, { waitUntil: 'networkidle' });

    if (route.ready) {
      await route.ready(page);
    }

    guard.assertClean(route.path);
  });
}
