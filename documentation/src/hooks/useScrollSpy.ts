import { useEffect, useRef } from 'react';

/**
 * useScrollSpy — observes all heading elements rendered inside the doc article
 * and highlights the matching sidebar link by toggling a CSS class on it
 * (issue #133 / Phase 4).
 *
 * Strategy
 * ────────
 * • We query `h2, h3, h4` inside the article element once after mount, then
 *   watch them with an `IntersectionObserver`.
 * • The "active" heading is the topmost one currently visible in the upper
 *   40 % of the viewport.  When none is visible we keep the last active one
 *   so the sidebar never goes blank while the user reads dense content.
 * • For each heading we derive the expected sidebar link href
 *   (`#<heading-id>`) and toggle the `scroll-spy-active` class on the
 *   matching `<a>` element inside `.theme-doc-sidebar-container`.
 *
 * Why a plain DOM class instead of React state?
 * ─────────────────────────────────────────────
 * The sidebar is rendered by Docusaurus outside our React subtree, so we
 * cannot pass props into it.  Mutating its DOM directly through a class is the
 * standard approach used by Docusaurus itself for the built-in active-link
 * highlighting.
 *
 * SSR / hydration safety
 * ──────────────────────
 * Everything runs inside `useEffect`, so it only executes on the client.
 * No DOM references are read during render.
 */

const HEADING_SELECTOR = 'h2[id], h3[id], h4[id]';
const ARTICLE_SELECTOR = 'article';
const SIDEBAR_SELECTOR = '.theme-doc-sidebar-container';
const ACTIVE_CLASS = 'scroll-spy-active';

/** Fraction of the viewport considered "in view at the top". */
const TOP_MARGIN_FRACTION = 0.4;

function buildRootMargin(): string {
  // Fires when a heading enters the top 40 % of the viewport from below, or
  // leaves it toward the top.
  const pct = Math.round((1 - TOP_MARGIN_FRACTION) * 100);
  return `0px 0px -${pct}% 0px`;
}

function clearActiveClasses(sidebar: Element): void {
  sidebar.querySelectorAll<HTMLAnchorElement>(`.${ACTIVE_CLASS}`).forEach((el) => {
    el.classList.remove(ACTIVE_CLASS);
  });
}

function activateSidebarLink(sidebar: Element, id: string): void {
  // Match href exactly as `#<id>` or a full URL ending with `#<id>`.
  const link = sidebar.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(id)}"]`);
  if (link) {
    clearActiveClasses(sidebar);
    link.classList.add(ACTIVE_CLASS);
    // Also mark parent list items so nested menus can be styled.
    let parent = link.parentElement;
    while (parent && !parent.matches(SIDEBAR_SELECTOR)) {
      if (parent.matches('li')) {
        parent.classList.add(`${ACTIVE_CLASS}-parent`);
      }
      parent = parent.parentElement;
    }
  }
}

export function useScrollSpy(): void {
  // Stable ref so the effect does not re-run on renders.
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const article = document.querySelector<HTMLElement>(ARTICLE_SELECTOR);
    const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);

    if (!article || !sidebar) return;

    const headings = Array.from(article.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
    if (headings.length === 0) return;

    // Track which headings are currently intersecting.
    const visibleHeadings = new Set<string>();

    const pickActiveId = (): string | null => {
      // Return the first heading (in DOM order) that is currently visible.
      for (const h of headings) {
        if (h.id && visibleHeadings.has(h.id)) return h.id;
      }
      return null;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).id;
          if (!id) return;
          if (entry.isIntersecting) {
            visibleHeadings.add(id);
          } else {
            visibleHeadings.delete(id);
          }
        });

        const newId = pickActiveId();
        if (newId !== null && newId !== activeIdRef.current) {
          activeIdRef.current = newId;
          activateSidebarLink(sidebar, newId);
        }
      },
      {
        rootMargin: buildRootMargin(),
        threshold: 0,
      },
    );

    headings.forEach((h) => observer.observe(h));

    // Clean up parent classes on unmount / route change.
    return () => {
      observer.disconnect();
      clearActiveClasses(sidebar);
      sidebar
        .querySelectorAll<HTMLElement>(`.${ACTIVE_CLASS}-parent`)
        .forEach((el) => el.classList.remove(`${ACTIVE_CLASS}-parent`));
      activeIdRef.current = null;
    };
  }, []); // Run once per mount (route navigations re-mount DocItem/Content).
}

export default useScrollSpy;
