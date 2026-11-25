/**
 * Canonical Content Security Policy (CSP) definition.
 * Single source of truth for:
 * - vercel.json (edge HTTP response headers)
 * - documentation/static/_headers (Netlify/Cloudflare Pages response headers)
 * - documentation/docusaurus.config.ts (HTML <meta> fallback for GitHub Pages)
 */

export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // SHA-256 hash of Docusaurus theme classic color mode initializer script:
    "'sha256-O8zYuOjyuzUZDv3fub7DKfAs5TEd1dG+fz+hCSCFmQA='",
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://www.clarity.ms',
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': [
    "'self'",
    'data:',
    'https://api.dicebear.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://c.clarity.ms',
    'https://c.bing.com',
  ],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://*.clarity.ms',
    'https://c.bing.com',
    'https://*.algolia.net',
    'https://*.algolianet.com',
    'https://api.sorobancookbook.org',
  ],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'worker-src': ["'self'"],
  // frame-ancestors is HTTP-header-only (browsers ignore/warn in <meta>):
  'frame-ancestors': ["'none'"],
};

/**
 * Builds a formatted CSP string.
 * @param {Object} [options]
 * @param {boolean} [options.isHeader=true] - Whether to include HTTP-header-only directives like frame-ancestors.
 * @param {string} [options.newsletterEndpoint=''] - Optional configured newsletter endpoint to allowlist origin.
 * @returns {string} Formatted CSP string.
 */
export function buildCSPString({ isHeader = true, newsletterEndpoint = '' } = {}) {
  const directives = { ...CSP_DIRECTIVES };

  if (!isHeader) {
    delete directives['frame-ancestors'];
  }

  const parts = [];
  for (const [key, values] of Object.entries(directives)) {
    const list = [...values];
    if (key === 'connect-src' && newsletterEndpoint) {
      try {
        const origin = new URL(newsletterEndpoint).origin;
        if (origin && !list.includes(origin)) {
          list.push(origin);
        }
      } catch {
        // ignore invalid URL
      }
    }
    parts.push(`${key} ${list.join(' ')}`);
  }

  return parts.join('; ');
}

export const CANONICAL_CSP_HEADER = buildCSPString({ isHeader: true });
export const CANONICAL_CSP_META = buildCSPString({ isHeader: false });
