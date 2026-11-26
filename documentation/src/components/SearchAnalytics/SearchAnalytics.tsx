import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { trackSearch } from '@site/src/utils/analytics';
import { CONSENT_CHANGE_EVENT, hasConsent } from '@site/src/utils/analyticsConsent';

/**
 * Reports site-search queries and their result counts to GA4 (issue #358, #1515).
 *
 * Renders nothing. Rather than polling the DOM with setInterval, this watches
 * the `/search` route and uses a MutationObserver to observe DOM changes in the
 * search results container, settling with a debounce before counting rendered
 * result articles.
 */

const SEARCH_ROUTE = '/search';
/** Results render asynchronously; debounce observation until DOM mutations pause. */
const SETTLE_DEBOUNCE_MS = 250;
const SETTLE_MAX_MS = 6000;

function countResults(): number {
  // The plugin renders one <article> per hit inside the search page container.
  return document.querySelectorAll('.container.margin-vert--lg article').length;
}

export default function SearchAnalytics(): null {
  const { pathname, search } = useLocation();
  const [consented, setConsented] = useState(false);
  // Guards against double-reporting the same query when React re-renders or the
  // result list mutates after settling.
  const reportedRef = useRef<string | null>(null);

  useEffect(() => {
    setConsented(hasConsent());
    const onChange = () => setConsented(hasConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!consented) return;
    if (pathname.replace(/\/$/, '') !== SEARCH_ROUTE) {
      reportedRef.current = null;
      return;
    }

    const term = new URLSearchParams(search).get('q')?.trim();
    if (!term) return;

    const key = term;
    if (reportedRef.current === key) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;

    const report = () => {
      if (reportedRef.current !== key) {
        reportedRef.current = key;
        trackSearch(term, countResults());
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (maxTimer) {
        clearTimeout(maxTimer);
        maxTimer = null;
      }
    };

    const scheduleDebounce = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(report, SETTLE_DEBOUNCE_MS);
    };

    if (typeof MutationObserver === 'undefined') {
      debounceTimer = setTimeout(report, SETTLE_DEBOUNCE_MS);
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }

    let lastCount = countResults();
    observer = new MutationObserver(() => {
      const next = countResults();
      if (next === lastCount) return;
      lastCount = next;
      scheduleDebounce();
    });

    const target =
      (typeof document !== 'undefined' &&
        (document.querySelector('.container.margin-vert--lg') || document.body)) ||
      null;

    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }

    // Schedule initial debounce settling (for pre-rendered results or zero-hit queries where no mutations occur)
    scheduleDebounce();

    // Fallback timer: report after max elapsed time even if mutations keep occurring continuously
    maxTimer = setTimeout(report, SETTLE_MAX_MS);

    return () => {
      if (observer) observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };
  }, [consented, pathname, search]);

  return null;
}
