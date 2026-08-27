/**
 * sanitizeUrl.ts
 *
 * Blocks URLs that could execute JavaScript (javascript:, data:, vbscript:).
 * Returns the original URL when it is safe, or '#' (a no-op anchor) when it
 * is not, so callers always receive a string and never crash.
 */

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'livescript:'];

const SAFE_SCHEME_PREFIXES = ['https://', 'http://', 'mailto:', 'tel:'];

const RELATIVE_RE = /^(\/|\.\/|\.\.\/|\?|#)/;

export function sanitizeUrl(url: string | null | undefined): string {
  if (url == null || url.trim() === '') {
    return '#';
  }

  // eslint-disable-next-line no-control-regex -- intentional: strips control chars used to bypass scheme checks
  const normalised = url.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();

  if (DANGEROUS_SCHEMES.some((scheme) => normalised.startsWith(scheme))) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[sanitizeUrl] Blocked potentially dangerous URL: "${url}". Replaced with '#'.`);
    }
    return '#';
  }

  if (SAFE_SCHEME_PREFIXES.some((prefix) => normalised.startsWith(prefix))) {
    return url;
  }

  if (RELATIVE_RE.test(url.trim())) {
    return url;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[sanitizeUrl] Unknown URL scheme in "${url}". Replaced with '#'.`);
  }
  return '#';
}

export function isHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
