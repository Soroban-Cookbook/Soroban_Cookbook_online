import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

import ScrollSpyActivator from './ScrollSpyActivator';

// ─── Controllable IntersectionObserver mock ─────────────────────────────────
//
// vitest.setup.ts installs a no-op IntersectionObserver stub. Scroll spy needs
// to actually deliver entries, so this file swaps in an instrumented double
// that records observed targets and lets tests fire intersection callbacks.

interface ObserverHandle {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[];
  disconnect: ReturnType<typeof vi.fn>;
}

let observers: ObserverHandle[];
let originalIntersectionObserver: typeof window.IntersectionObserver;

function installObserverMock() {
  observers = [];

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin: string;
    readonly thresholds: ReadonlyArray<number> = [];
    private handle: ObserverHandle;

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.rootMargin = options?.rootMargin ?? '';
      this.handle = { callback, options, observed: [], disconnect: vi.fn() };
      observers.push(this.handle);
    }

    observe(el: Element) {
      this.handle.observed.push(el);
    }
    unobserve() {}
    disconnect() {
      this.handle.disconnect();
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  window.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof window.IntersectionObserver;
}

/** Deliver intersection entries to the observer created by the hook. */
function intersect(entries: Array<{ id: string; isIntersecting: boolean }>) {
  const observer = observers[0];
  if (!observer) throw new Error('IntersectionObserver was never constructed');
  const records = entries.map(({ id, isIntersecting }) => ({
    target: document.getElementById(id) as Element,
    isIntersecting,
  })) as unknown as IntersectionObserverEntry[];
  observer.callback(records, {} as IntersectionObserver);
}

// ─── DOM fixture ────────────────────────────────────────────────────────────

/**
 * Builds the page shape the hook expects: an `<article>` holding headings with
 * ids, plus a Docusaurus sidebar container holding anchors to those ids.
 */
function renderPage({
  headingIds = ['setup', 'usage', 'testing'],
  withArticle = true,
  withSidebar = true,
}: { headingIds?: string[]; withArticle?: boolean; withSidebar?: boolean } = {}) {
  if (withArticle) {
    const article = document.createElement('article');
    article.innerHTML = headingIds.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
    document.body.appendChild(article);
  }

  if (withSidebar) {
    const sidebar = document.createElement('div');
    sidebar.className = 'theme-doc-sidebar-container';
    sidebar.innerHTML = `<ul>${headingIds
      .map((id) => `<li><a href="#${id}">${id}</a></li>`)
      .join('')}</ul>`;
    document.body.appendChild(sidebar);
  }
}

function sidebarLink(id: string): HTMLAnchorElement {
  const link = document.querySelector<HTMLAnchorElement>(
    `.theme-doc-sidebar-container a[href="#${id}"]`,
  );
  if (!link) throw new Error(`No sidebar link for #${id}`);
  return link;
}

function activeLinkHrefs(): string[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>('.scroll-spy-active')).map(
    (el) => el.getAttribute('href') ?? '',
  );
}

beforeEach(() => {
  originalIntersectionObserver = window.IntersectionObserver;
  installObserverMock();
  document.body.innerHTML = '';
});

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ScrollSpyActivator', () => {
  it('renders nothing', () => {
    renderPage();
    const { container } = render(<ScrollSpyActivator />);
    expect(container.innerHTML).toBe('');
  });

  it('observes every heading in the article', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    expect(observers).toHaveLength(1);
    expect(observers[0].observed.map((el) => el.id)).toEqual(['setup', 'usage', 'testing']);
  });

  it('marks the sidebar link active when its heading intersects', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    intersect([{ id: 'usage', isIntersecting: true }]);

    expect(sidebarLink('usage')).toHaveClass('scroll-spy-active');
    expect(sidebarLink('setup')).not.toHaveClass('scroll-spy-active');
  });

  it('marks ancestor list items so nested menus can be styled', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    intersect([{ id: 'usage', isIntersecting: true }]);

    expect(sidebarLink('usage').closest('li')).toHaveClass('scroll-spy-active-parent');
  });

  it('activates the topmost visible heading, not the last reported one', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    // Entries arrive out of DOM order; "setup" is still the topmost visible.
    intersect([
      { id: 'testing', isIntersecting: true },
      { id: 'setup', isIntersecting: true },
    ]);

    expect(activeLinkHrefs()).toEqual(['#setup']);
  });

  it('keeps exactly one active link as the reader scrolls down', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    intersect([{ id: 'setup', isIntersecting: true }]);
    expect(activeLinkHrefs()).toEqual(['#setup']);

    // Reader scrolls: "setup" leaves the top band, "usage" enters it.
    intersect([
      { id: 'setup', isIntersecting: false },
      { id: 'usage', isIntersecting: true },
    ]);
    expect(activeLinkHrefs()).toEqual(['#usage']);
  });

  it('keeps the last active heading when nothing is visible', () => {
    renderPage();
    render(<ScrollSpyActivator />);

    intersect([{ id: 'usage', isIntersecting: true }]);
    intersect([{ id: 'usage', isIntersecting: false }]);

    // Sidebar must not go blank mid-page.
    expect(activeLinkHrefs()).toEqual(['#usage']);
  });

  it('ignores headings that have no matching sidebar link', () => {
    renderPage({ headingIds: ['setup'] });
    const orphan = document.createElement('h2');
    orphan.id = 'appendix';
    document.querySelector('article')!.appendChild(orphan);

    render(<ScrollSpyActivator />);
    intersect([{ id: 'appendix', isIntersecting: true }]);

    expect(activeLinkHrefs()).toEqual([]);
  });

  it('disconnects the observer and clears classes on unmount', () => {
    renderPage();
    const { unmount } = render(<ScrollSpyActivator />);

    intersect([{ id: 'usage', isIntersecting: true }]);
    expect(activeLinkHrefs()).toEqual(['#usage']);

    unmount();

    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(activeLinkHrefs()).toEqual([]);
    expect(document.querySelectorAll('.scroll-spy-active-parent')).toHaveLength(0);
  });

  it('does nothing when the page has no article', () => {
    renderPage({ withArticle: false });
    render(<ScrollSpyActivator />);
    expect(observers).toHaveLength(0);
  });

  it('does nothing when the page has no sidebar', () => {
    renderPage({ withSidebar: false });
    render(<ScrollSpyActivator />);
    expect(observers).toHaveLength(0);
  });

  it('does nothing when the article has no headings', () => {
    renderPage({ headingIds: [] });
    render(<ScrollSpyActivator />);
    expect(observers).toHaveLength(0);
  });
});
