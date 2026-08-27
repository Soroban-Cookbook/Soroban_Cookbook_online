import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { trackSearch } from '@site/src/utils/analytics';
import { CONSENT_CHANGE_EVENT, hasConsent } from '@site/src/utils/analyticsConsent';

/**
 * Reports site-search queries and their result counts to GA4 (issue #358).
 *
 * Renders nothing. Rather than hooking the search plugin's internals (whose
 * component names and CSS-module hashes change between releases), this watches
 * the `/search` route — where every submitted query lands, whether typed in the
 * navbar or arrived at from a link — and counts the rendered result articles.
 */

const SEARCH_ROUTE = '/search';
/** Results render asynchronously; poll until the count stops changing. */
const SETTLE_INTERVAL_MS = 250;
const SETTLE_STABLE_TICKS = 2;
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

    const key = `${term}`;
    if (reportedRef.current === key) return;

    let cancelled = false;
    let elapsed = 0;
    let lastCount = -1;
    let stableTicks = 0;

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const count = countResults();

      if (count === lastCount) {
        stableTicks += 1;
      } else {
        // First observation establishes the baseline and already counts as
        // one "stable reading"; this matches the test contract (and the
        // intuitive reading of SETTLE_STABLE_TICKS=2) so that two ticks of
        // the same result count settle the loop ~250ms sooner.
        lastCount = count;
        stableTicks = 1;
      }

      elapsed += SETTLE_INTERVAL_MS;
      const settled = stableTicks >= SETTLE_STABLE_TICKS;

      if (settled || elapsed >= SETTLE_MAX_MS) {
        window.clearInterval(timer);
        if (reportedRef.current !== key) {
          reportedRef.current = key;
          trackSearch(term, count);
        }
      }
    }, SETTLE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [consented, pathname, search]);

  return null;
}
