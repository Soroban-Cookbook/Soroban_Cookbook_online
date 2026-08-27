/**
 * Swizzled SearchPage wrapper (Issue #153)
 *
 * Wraps the @easyops-cn/docusaurus-search-local SearchPage with a
 * SearchFilters panel. Because the plugin renders its results as plain DOM
 * <article> elements inside `.container.margin-vert--lg section`, we use a
 * MutationObserver + filter state to show/hide articles that don't match the
 * active filters, without re-running the Lunr search.
 *
 * Architecture:
 *  1. Render <OriginalSearchPage /> inside a wrapper div.
 *  2. After mount, insert <SearchFilters /> above the results via a React portal.
 *  3. On every filter change, walk the rendered articles and toggle
 *     `data-filter-hidden` + `visibility: hidden` on non-matching ones.
 *  4. A MutationObserver re-applies the filter whenever new articles arrive
 *     (the plugin loads results asynchronously).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OriginalSearchPage from '@theme-original/SearchPage';
import { SearchFilters, type SearchFilterState } from '@site/src/components/SearchFilters';
import { matchesFilters } from '@site/src/utils/searchFilterUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

/** The plugin renders one <article> per hit inside this selector. */
const RESULTS_SELECTOR = '.container.margin-vert--lg section';

/**
 * Walk every <article> in the results section and hide those that don't match
 * the active filters. Articles without a detectable URL are always shown.
 */
function applyFilters(filters: SearchFilterState): void {
  const section = document.querySelector(RESULTS_SELECTOR);
  if (!section) return;

  const articles = section.querySelectorAll('article');
  let visibleCount = 0;

  articles.forEach((article) => {
    // The plugin renders the doc URL as an <a> href inside each article.
    const link = article.querySelector('a[href]');
    const href = link?.getAttribute('href') ?? '';

    const visible = matchesFilters(href, filters);
    if (visible) {
      article.removeAttribute('data-filter-hidden');
      (article as HTMLElement).style.removeProperty('display');
      visibleCount++;
    } else {
      article.setAttribute('data-filter-hidden', 'true');
      (article as HTMLElement).style.display = 'none';
    }
  });

  // Update or create a "no results after filtering" notice.
  updateEmptyNotice(section as HTMLElement, visibleCount, articles.length);
}

function updateEmptyNotice(section: HTMLElement, visible: number, total: number): void {
  const NOTICE_ID = 'sb-filter-empty-notice';
  let notice = document.getElementById(NOTICE_ID);

  if (visible === 0 && total > 0) {
    if (!notice) {
      notice = document.createElement('p');
      notice.id = NOTICE_ID;
      notice.style.cssText =
        'padding: 1rem 0; color: var(--ifm-color-content-secondary); font-size: 0.95rem;';
      section.appendChild(notice);
    }
    notice.textContent = 'No results match the active filters. Try adjusting your selection.';
  } else if (notice) {
    notice.remove();
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SearchPage(props: Record<string, unknown>): React.JSX.Element {
  const [filters, setFilters] = useState<SearchFilterState>({
    categories: [],
    difficulty: [],
    tags: [],
  });

  // Stable ref so the MutationObserver closure always reads the latest filters.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Portal target: the container rendered by the original search page.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Find the container once the original page has mounted.
  useEffect(() => {
    // Give the plugin one tick to render its markup.
    const id = window.setTimeout(() => {
      const container = document.querySelector<HTMLElement>('.container.margin-vert--lg');
      if (container) setPortalTarget(container);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Watch for async result updates and re-apply filters each time.
  useEffect(() => {
    const section = document.querySelector(RESULTS_SELECTOR);
    if (!section) return;

    const observer = new MutationObserver(() => {
      applyFilters(filtersRef.current);
    });

    observer.observe(section, { childList: true, subtree: true });
    // Apply immediately for results already in the DOM.
    applyFilters(filtersRef.current);

    return () => observer.disconnect();
  }, [portalTarget]); // re-attach when the portal target is resolved

  const handleFilterChange = useCallback((next: SearchFilterState) => {
    setFilters(next);
    applyFilters(next);
  }, []);

  return (
    <>
      <OriginalSearchPage {...props} />

      {/* Inject the filter panel into the search page container via a portal
          so it sits visually above the result list without restructuring the
          plugin's own DOM. */}
      {portalTarget &&
        createPortal(
          <div
            style={{ marginBottom: '1rem' }}
            data-testid="search-filters-portal"
            aria-label="Search filters">
            <SearchFilters onFilterChange={handleFilterChange} />
          </div>,
          // Insert before the first child so the filter appears above the input
          // and results, not appended at the bottom.
          portalTarget,
          'sb-search-filters',
        )}
    </>
  );
}
