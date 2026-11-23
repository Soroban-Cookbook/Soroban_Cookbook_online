// @ts-check
/**
 * Shared helper logic for audit-internal-links.mjs and vitest tests.
 * Canonical source for config-link extraction and doc-file resolution.
 */
import fs from 'fs';
import path from 'path';

/**
 * Returns a canonical `/docs/...` path for internal doc links,
 * or null for external URLs, mailto links, anchors, and non-doc paths.
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeConfigLink(raw) {
  const target = raw.trim();
  if (
    target.startsWith('http') ||
    target.startsWith('#') ||
    target.startsWith('mailto:')
  ) {
    return null;
  }
  const stripped = target.split('#')[0].split('?')[0];
  if (!stripped) return null;
  if (stripped.startsWith('/docs/')) {
    return stripped.replace(/\/$/, '') || '/docs';
  }
  return null;
}

/**
 * Resolves a canonical `/docs/...` path to its source file on disk.
 * @param {string} docPath  e.g. "/docs/design-system/buttons"
 * @param {string} docsRoot  absolute path to docs/ directory
 * @returns {string | null}
 */
export function resolveDocFilePath(docPath, docsRoot) {
  if (docPath === '/docs' || docPath === '/docs/') {
    return fs.existsSync(path.join(docsRoot, 'index.md'))
      ? path.join(docsRoot, 'index.md')
      : null;
  }
  const slug = docPath.replace(/^\/docs\//, '');
  const candidates = [
    path.join(docsRoot, `${slug}.md`),
    path.join(docsRoot, `${slug}.mdx`),
    path.join(docsRoot, slug, 'index.md'),
    path.join(docsRoot, slug, 'index.mdx'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/**
 * Extracts internal `/docs/...` links from a Docusaurus config file's
 * themeConfig.navbar and themeConfig.footer sections using text regex.
 * Only matches single-quoted string values for `to:` and `href:` keys.
 * External hrefs and non-doc paths are excluded automatically.
 * @param {string} configText  raw text of docusaurus.config.ts
 * @returns {string[]}  deduplicated array of canonical /docs/... paths
 */
export function extractConfigLinks(configText) {
  const raw = [];
  // Match: to: '/docs/...' or href: '/docs/...'
  const re = /(?:to|href)\s*:\s*'(\/[^']*)'/g;
  let m;
  while ((m = re.exec(configText)) !== null) {
    raw.push(m[1]);
  }
  const normalized = raw
    .map(normalizeConfigLink)
    .filter((x) => x !== null);
  return [...new Set(normalized)];
}
