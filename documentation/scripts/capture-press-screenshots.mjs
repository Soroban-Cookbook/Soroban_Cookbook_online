#!/usr/bin/env node
/**
 * Regenerates the press kit screenshots in static/img/press/ (issue #367).
 *
 * Requires a built site being served locally:
 *   bun run build && bun run serve -- --port 3000 --host 127.0.0.1
 *   node scripts/capture-press-screenshots.mjs
 *
 * Override the target with BASE_URL=https://soroban-cookbook.dev to capture
 * against production instead.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../static/img/press',
);

// All shots are captured in light mode: the site's dark theme currently leaves
// heading/navbar colors at their light values, which makes the homepage h1
// unreadable against the dark hero. Add dark variants here once that is fixed.
const shots = [
  { name: 'homepage', path: '/' },
  { name: 'docs-getting-started', path: '/docs/getting-started/setup' },
  { name: 'pattern-hello-world', path: '/docs/patterns/hello-world' },
  { name: 'homepage-mobile', path: '/', viewport: { width: 390, height: 844 } },
];

const THEME = 'light';

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

try {
  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: shot.viewport ?? DESKTOP_VIEWPORT,
      deviceScaleFactor: 2,
      colorScheme: THEME,
    });
    const page = await context.newPage();

    // Docusaurus reads the stored theme before paint, so seed it to guarantee
    // the screenshot matches the requested mode rather than the OS default.
    await page.addInitScript((theme) => {
      window.localStorage.setItem('theme', theme);
    }, THEME);

    await page.goto(`${baseUrl}${shot.path}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`) });
    console.log(`captured ${shot.name}.png`);

    await context.close();
  }
} finally {
  await browser.close();
}
