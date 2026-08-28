/**
 * Search Analytics — Phase 5 (issue #329)
 *
 * Provides anonymized telemetry for search queries and results, integrating
 * with the existing GA4 / `trackSearch` pipeline from `analytics.ts`.
 *
 * Design principles:
 *  - **No PII**: email addresses, tokens, and long numeric sequences are
 *    stripped before any term leaves this module.
 *  - **Normalised**: terms are lowercased and whitespace-collapsed so that
 *    "Soroban " and "soroban" are counted as the same query.
 *  - **Debounced**: `onQuery` is debounced so rapid keystroke events don't
 *    flood the analytics back-end — only the query the user "settled on"
 *    is recorded.
 *  - **Consent-aware**: delegates to `trackSearch` (analytics.ts) which is a
 *    no-op when `window.gtag` is absent (consent denied / IDs unset).
 */

import { trackSearch } from './analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum query length before we record a telemetry event. */
export const MIN_QUERY_LENGTH = 2;

/**
 * Debounce delay (ms) applied to `onQuery`.  Keeps event volume proportional
 * to deliberate searches rather than individual keystrokes.
 */
export const QUERY_DEBOUNCE_MS = 500;

// ─── Anonymisation ────────────────────────────────────────────────────────────

/**
 * Patterns that may contain PII.  Matched text is replaced with a placeholder
 * before the term is sent to the analytics back-end.
 */
const PII_PATTERNS: Array<[RegExp, string]> = [
  // Email addresses
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '<email>'],

  // Hex strings ≥ 32 chars (wallet addresses, API keys, tx hashes, …)
  [/\b[0-9a-f]{32,}\b/gi, '<token>'],
  // Long decimal numbers (≥ 10 digits; not typical doc search terms)
  [/\b\d{10,}\b/g, '<number>'],
];

/**
 * Normalises and anonymises a raw search term.
 *
 * Steps:
 * 1. Trim surrounding whitespace.
 * 2. Collapse internal runs of whitespace to a single space.
 * 3. Lowercase.
 * 4. Strip PII patterns.
 *
 * Returns `null` when the result is shorter than `MIN_QUERY_LENGTH` so
 * callers can skip telemetry for trivially short queries.
 */
export function sanitizeSearchTerm(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  let term = raw.trim().replace(/\s+/g, ' ').toLowerCase();

  for (const [pattern, placeholder] of PII_PATTERNS) {
    term = term.replace(pattern, placeholder);
  }

  return term.length >= MIN_QUERY_LENGTH ? term : null;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Handles a completed search query event.
 *
 * @param rawTerm   The raw string the user typed.
 * @param resultCount  Number of results the search engine returned.
 *
 * Fires:
 *  - `search` GA4 event for every valid query.
 *  - `search_no_results` GA4 event when `resultCount === 0`.
 */
export function onResult(rawTerm: string | null | undefined, resultCount: number): void {
  const term = sanitizeSearchTerm(rawTerm);
  if (term === null) return;
  trackSearch(term, resultCount);
}

/**
 * Handles a query-typed event (before results are known).
 *
 * This variant records the query itself so we can track what people *search
 * for*, independently of whether results are returned.  Use in conjunction
 * with `onResult` — `onResult` is the authoritative call for result counts.
 *
 * @param rawTerm  The raw string the user typed.
 */
export function onQuery(rawTerm: string | null | undefined): void {
  const term = sanitizeSearchTerm(rawTerm);
  if (term === null) return;
  // Record as a search with an unknown result count (-1 sentinel).
  // The `search_no_results` branch in trackSearch is guarded by `=== 0` so
  // this sentinel will never incorrectly fire that event.
  trackSearch(term, -1);
}

// ─── Debounce helper ─────────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays invocation by `wait` ms.
 * Each new call resets the timer.
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Returns a debounced `onQuery` handler ready to be attached to search input
 * events.  Uses `QUERY_DEBOUNCE_MS` as the delay.
 */
export function createDebouncedOnQuery(): (rawTerm: string | null | undefined) => void {
  return debounce(onQuery, QUERY_DEBOUNCE_MS);
}
