import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { Spinner } from '@site/src/components/Loading';
import styles from './SearchLoading.module.css';

const SEARCH_ROUTE = '/search';
const SETTLE_INTERVAL_MS = 200;
const SETTLE_STABLE_TICKS = 2;
const SETTLE_MAX_MS = 6000;

function countResults(): number {
  return document.querySelectorAll('.container.margin-vert--lg article').length;
}

/**
 * Shows a spinner while local search results are still settling on `/search`.
 * Mirrors the settle timing used by SearchAnalytics so loading and analytics
 * agree on when results are ready (Phase 6 / issue #349).
 */
export default function SearchLoading(): React.JSX.Element | null {
  const { pathname, search } = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname.replace(/\/$/, '') !== SEARCH_ROUTE) {
      setLoading(false);
      return;
    }

    const term = new URLSearchParams(search).get('q')?.trim();
    if (!term) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
        lastCount = count;
        stableTicks = 0;
      }

      elapsed += SETTLE_INTERVAL_MS;
      if (stableTicks >= SETTLE_STABLE_TICKS || elapsed >= SETTLE_MAX_MS) {
        window.clearInterval(timer);
        if (!cancelled) setLoading(false);
      }
    }, SETTLE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, search]);

  if (!loading) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite" aria-busy="true">
      <Spinner size={20} />
      <span className={styles.label}>Searching…</span>
    </div>
  );
}
