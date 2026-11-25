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
 * Extracts internal `/docs/...` links from a Docusaurus config file using
 * a text regex that matches all `to:` and `href:` string values in the file.
 * Matches single- or double-quoted string values for `to:` and `href:` keys.
 * External hrefs and non-doc paths are excluded automatically.
 *
 * NOTE: The regex is intentionally applied to the entire file, not scoped to
 * themeConfig.navbar/footer. This means `to:` destinations inside other plugin
 * blocks — including `plugin-client-redirects` — are also captured and
 * validated. All redirect `to:` paths should be valid routes by design, so
 * they will pass validation today. If a redirect destination becomes stale
 * (e.g. the target doc is deleted), the audit will correctly report it as a
 * broken config link, though the error will cite `docusaurus.config.ts` rather
 * than the specific redirect entry. The redirect `from:` paths (intentionally
 * stale legacy URLs) use the key `from:`, not `to:` or `href:`, so they are
 * not captured and do not generate false positives.
 *
 * @param {string} configText  raw text of docusaurus.config.ts
 * @returns {string[]}  deduplicated array of canonical /docs/... paths
 */
export function extractConfigLinks(configText) {
  const raw = [];
  // Match: to: '/docs/...' or to: "/docs/..." (and href: equivalents).
  // Applies to the full file — see JSDoc note above about redirect block scope.
  const re = /(?:to|href)\s*:\s*(['"])(\/[^'"]*)\1/g;
  let m;
  while ((m = re.exec(configText)) !== null) {
    raw.push(m[2]);
  }
  const normalized = raw
    .map(normalizeConfigLink)
    .filter((x) => x !== null);
  return [...new Set(normalized)];
}
