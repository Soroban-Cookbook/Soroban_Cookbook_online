/**
 * Search Analytics Client Module — Phase 5 (issue #329)
 *
 * This Docusaurus client module is loaded on every page (registered via
 * `clientModules` in `docusaurus.config.ts`).  It observes the search input
 * rendered by `@easyops-cn/docusaurus-search-local` and dispatches analytics
 * events through the `searchAnalytics` utility.
 *
 * Strategy
 * ─────────
 * The plugin renders a search input whose wrapper carries
 * `data-search-input` or the class `.search-bar input`.  We use a
 * `MutationObserver` to detect when the input is mounted (Docusaurus renders
 * search asynchronously) and then attach:
 *
 *   - An `input` listener → debounced `onQuery` (tracks what users type).
 *   - A `keydown` listener for Enter → `onResult` with a result count read
 *     from the rendered dropdown.
 *
 * Result count detection
 * ──────────────────────
 * After the user presses Enter (or waits for the dropdown), we count the
 * `<li>` elements inside the `.search-result-items` / `.hits` container that
 * the plugin injects.  A `setTimeout(0)` ensures the DOM has updated before
 * we read the count.
 *
 * All logic is consent-aware: `trackSearch` (via `onResult`/`onQuery`) is a
 * no-op when `window.gtag` is absent.
 */

import { onResult, createDebouncedOnQuery } from '../utils/searchAnalytics';

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Input selector for @easyops-cn/docusaurus-search-local search bar. */
const SEARCH_INPUT_SELECTORS = [
  '.search-bar input[type="search"]',
  '.search-bar input',
  '[data-search-input]',
  'input[placeholder*="Search"]',
  'input[aria-label*="Search"]',
  'input[aria-label*="search"]',
];

/**
 * Selectors for the result-item container rendered by the search plugin.
 * We try them in order and pick the first match.
 */
const RESULT_CONTAINER_SELECTORS = [
  '.search-result-items li',
  '.DocSearch-Hits li',
  '.aa-List li',
  '[data-search-results] li',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findSearchInput(): HTMLInputElement | null {
  for (const selector of SEARCH_INPUT_SELECTORS) {
    const el = document.querySelector<HTMLInputElement>(selector);
    if (el) return el;
  }
  return null;
}

function countVisibleResults(): number {
  for (const selector of RESULT_CONTAINER_SELECTORS) {
    const items = document.querySelectorAll(selector);
    if (items.length > 0) return items.length;
  }
  return 0;
}

// ─── Module lifecycle ─────────────────────────────────────────────────────────

let attached = false;

function attachSearchObservers(input: HTMLInputElement): void {
  if (attached) return;
  attached = true;

  const debouncedOnQuery = createDebouncedOnQuery();

  // Track what the user types (debounced)
  input.addEventListener('input', () => {
    debouncedOnQuery(input.value);
  });

  // Track searches submitted via Enter — read result count after DOM settles
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const term = input.value;
      // Allow one tick for the plugin to render results before we count them
      setTimeout(() => {
        const count = countVisibleResults();
        onResult(term, count);
      }, 0);
    }
  });

  // Also track when the user clicks a result (focus leaves the input)
  // so we capture the final result state even without pressing Enter.
  input.addEventListener('blur', () => {
    const term = input.value;
    if (!term.trim()) return;
    setTimeout(() => {
      const count = countVisibleResults();
      onResult(term, count);
    }, 150); // slightly longer delay to let result items render
  });
}

/**
 * Uses a MutationObserver to wait for the search input to appear in the DOM
 * (Docusaurus hydrates components after the initial paint).
 */
function observeForSearchInput(): void {
  // Try immediately first (fast-path for pre-rendered content)
  const existing = findSearchInput();
  if (existing) {
    attachSearchObservers(existing);
    return;
  }

  const observer = new MutationObserver(() => {
    const input = findSearchInput();
    if (input) {
      observer.disconnect();
      attachSearchObservers(input);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ─── Docusaurus client module entry points ────────────────────────────────────

/** Called once when the module first loads (initial page visit). */
export function onRouteDidUpdate(): void {
  // Re-check on every navigation in case the search bar remounts
  attached = false;
  observeForSearchInput();
}

// Bootstrap on module load for the initial page
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeForSearchInput);
  } else {
    observeForSearchInput();
  }
}
