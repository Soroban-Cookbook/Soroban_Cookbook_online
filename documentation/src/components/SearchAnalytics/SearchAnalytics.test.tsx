import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// ─── Control values for the @docusaurus/router mock ─────────────────────────

import { mockLocation } from '../../../__mocks__/docusaurus-router';

// ─── Mocks for analytics modules ─────────────────────────────────────────────

let mockConsented = false;

vi.mock('@site/src/utils/analytics', () => ({
  trackSearch: vi.fn(),
  SEARCH_EVENTS: { search: 'search', noResults: 'search_no_results' },
}));

vi.mock('@site/src/utils/analyticsConsent', () => ({
  CONSENT_CHANGE_EVENT: 'sc-consent-change',
  hasConsent: () => mockConsented,
}));

// ─── MutationObserver Mock ──────────────────────────────────────────────────

interface MockObserverInstance {
  callback: MutationCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;
  trigger: (mutations?: Partial<MutationRecord>[]) => void;
}

let observerInstances: MockObserverInstance[] = [];

class MockMutationObserver {
  callback: MutationCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(cb: MutationCallback) {
    this.callback = cb;
    observerInstances.push(this);
  }

  trigger(mutations: Partial<MutationRecord>[] = []) {
    this.callback(mutations as MutationRecord[], this as unknown as MutationObserver);
  }
}

function getLatestObserver(): MockObserverInstance {
  const latest = observerInstances[observerInstances.length - 1];
  if (!latest) throw new Error('MutationObserver was never instantiated');
  return latest;
}

function setArticleCount(count: number) {
  document.querySelectorAll = vi.fn(
    () =>
      ({
        length: count,
        item: () => null,
        [Symbol.iterator]: function* () {},
      }) as unknown as NodeListOf<Element>,
  );
}

// ─── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  observerInstances = [];
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockConsented = false;

  setArticleCount(0);

  // Install Mock MutationObserver
  window.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
  globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Import after mocks are set up.
import SearchAnalytics from './SearchAnalytics';
import { trackSearch } from '@site/src/utils/analytics';
import { CONSENT_CHANGE_EVENT } from '@site/src/utils/analyticsConsent';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SearchAnalytics', () => {
  describe('rendering', () => {
    it('renders nothing (returns null)', () => {
      const { container } = render(<SearchAnalytics />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('consent change listener', () => {
    it('registers a consent change listener on mount and updates on event', async () => {
      let listener: (() => void) | null = null;
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = vi.fn((event, cb) => {
        if (event === CONSENT_CHANGE_EVENT) {
          listener = cb as () => void;
        }
        originalAddEventListener.call(window, event, cb);
      });

      mockLocation.pathname = '/search';
      mockLocation.search = '?q=stellar';
      setArticleCount(4);

      render(<SearchAnalytics />);
      expect(window.addEventListener).toHaveBeenCalledWith(
        CONSENT_CHANGE_EVENT,
        expect.any(Function),
      );

      // Initially not consented -> no trackSearch
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(trackSearch).not.toHaveBeenCalled();

      // Consent event occurs
      mockConsented = true;
      act(() => {
        if (listener) listener();
      });

      // Now observer is active, debounce settles
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledWith('stellar', 4);

      window.addEventListener = originalAddEventListener;
    });

    it('removes listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<SearchAnalytics />);
      unmount();
      expect(removeSpy).toHaveBeenCalledWith(CONSENT_CHANGE_EVENT, expect.any(Function));
    });
  });

  describe('route handling', () => {
    it('does not start observing when not consented', () => {
      mockConsented = false;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=hello';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(0);
      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('does not observe when consented but not on /search', () => {
      mockConsented = true;
      mockLocation.pathname = '/docs/getting-started/setup';
      mockLocation.search = '';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(0);
      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('does not observe when on /search with no query param', () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(0);
      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('does not observe when query param is whitespace only', () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=   ';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(0);
      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('starts observing when on /search with a valid query term', () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=soroban+testing';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(1);
      expect(observerInstances[0].observe).toHaveBeenCalled();
    });

    it('handles /search/ (trailing slash) as search route', () => {
      mockConsented = true;
      mockLocation.pathname = '/search/';
      mockLocation.search = '?q=trailing';

      render(<SearchAnalytics />);

      expect(observerInstances.length).toBe(1);
      expect(observerInstances[0].observe).toHaveBeenCalled();
    });
  });

  describe('observation and debounce behavior', () => {
    beforeEach(() => {
      mockConsented = true;
      mockLocation.pathname = '/search';
    });

    it('tracks search after debounce settling with same result count', () => {
      mockLocation.search = '?q=soroban+testing';
      setArticleCount(5);

      render(<SearchAnalytics />);
      const observer = getLatestObserver();
      expect(observer.observe).toHaveBeenCalled();

      // Before debounce settles
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(trackSearch).not.toHaveBeenCalled();

      // Settle after 250ms
      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(trackSearch).toHaveBeenCalledWith('soroban testing', 5);
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it('resets debounce timer when mutations occur', () => {
      mockLocation.search = '?q=soroban+contracts';
      setArticleCount(2);

      render(<SearchAnalytics />);
      const observer = getLatestObserver();

      // Advance 200ms (not yet settled)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(trackSearch).not.toHaveBeenCalled();

      // Mutation arrives, updating result count
      setArticleCount(6);
      act(() => {
        observer.trigger();
      });

      // Advance another 200ms (total 400ms from start, but only 200ms from mutation -> still waiting)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(trackSearch).not.toHaveBeenCalled();

      // Complete 250ms debounce from mutation
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(trackSearch).toHaveBeenCalledWith('soroban contracts', 6);
      expect(trackSearch).toHaveBeenCalledTimes(1);
    });

    it('tracks zero results for a term with no hits', () => {
      mockLocation.search = '?q=missingpage';
      setArticleCount(0);

      render(<SearchAnalytics />);
      const observer = getLatestObserver();

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledWith('missingpage', 0);
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it('does not double-report the same query', () => {
      mockLocation.search = '?q=hello';
      setArticleCount(3);

      const { rerender } = render(<SearchAnalytics />);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledTimes(1);
      expect(trackSearch).toHaveBeenCalledWith('hello', 3);

      // Component re-renders with same query
      rerender(<SearchAnalytics />);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(trackSearch).toHaveBeenCalledTimes(1);
    });

    it('reports after max timeout even if mutations keep occurring', () => {
      mockLocation.search = '?q=flaky';
      let count = 0;

      render(<SearchAnalytics />);
      const observer = getLatestObserver();

      // Continuous mutations every 150ms prevent debounce from ever finishing normally
      for (let time = 0; time < 5850; time += 150) {
        act(() => {
          vi.advanceTimersByTime(150);
          count++;
          setArticleCount(count);
          observer.trigger();
        });
        expect(trackSearch).not.toHaveBeenCalled();
      }

      // Advance past max timeout (6000ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(trackSearch).toHaveBeenCalledWith('flaky', expect.any(Number));
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it('re-tracks after navigating away and back to /search', () => {
      mockLocation.search = '?q=hello';
      setArticleCount(2);

      const { rerender } = render(<SearchAnalytics />);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledTimes(1);

      // Navigate away
      mockLocation.pathname = '/docs';
      mockLocation.search = '';
      rerender(<SearchAnalytics />);

      // Navigate back
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=hello';
      rerender(<SearchAnalytics />);

      expect(observerInstances.length).toBeGreaterThanOrEqual(2);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledTimes(2);
    });

    it('falls back gracefully when MutationObserver is not defined', () => {
      // Temporarily remove MutationObserver
      const originalMO = window.MutationObserver;
      // @ts-expect-error testing undefined environment
      delete window.MutationObserver;
      // @ts-expect-error testing undefined environment
      delete globalThis.MutationObserver;

      mockLocation.search = '?q=noobserver';
      setArticleCount(3);

      render(<SearchAnalytics />);

      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(trackSearch).toHaveBeenCalledWith('noobserver', 3);

      window.MutationObserver = originalMO;
      globalThis.MutationObserver = originalMO;
    });

    it('cleans up observer and timers on unmount before debounce', () => {
      mockLocation.search = '?q=cleanup';
      setArticleCount(2);

      const { unmount } = render(<SearchAnalytics />);
      const observer = getLatestObserver();

      unmount();
      expect(observer.disconnect).toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(trackSearch).not.toHaveBeenCalled();
    });
  });
});
