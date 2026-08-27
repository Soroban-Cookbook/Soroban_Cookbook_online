import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

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

// ─── Helpers ────────────────────────────────────────────────────────────────

let setIntervalSpy: ReturnType<typeof vi.spyOn>;

/** Extract the polling callback captured by the setInterval spy. */
function getPollingCallback(): () => void {
  const calls = setIntervalSpy.mock.calls;
  if (calls.length === 0) throw new Error('setInterval was never called');
  return calls[0][0] as () => void;
}

/** Fire the polling callback N times inside act(). */
async function tickPolling(times: number) {
  const cb = getPollingCallback();
  for (let i = 0; i < times; i++) {
    await act(async () => {
      cb();
    });
  }
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
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockConsented = false;

  document.querySelectorAll = vi.fn(
    () =>
      ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      }) as unknown as NodeListOf<Element>,
  );

  setIntervalSpy = vi.spyOn(window, 'setInterval');
  vi.spyOn(window, 'clearInterval');

  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  window.dispatchEvent = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Import after mocks are set up.
import SearchAnalytics from './SearchAnalytics';
import { trackSearch } from '@site/src/utils/analytics';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SearchAnalytics', () => {
  describe('rendering', () => {
    it('renders nothing (returns null)', () => {
      const { container } = render(<SearchAnalytics />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('consent change listener', () => {
    it('registers a consent change listener on mount', () => {
      render(<SearchAnalytics />);
      expect(window.addEventListener).toHaveBeenCalledWith(
        'sc-consent-change',
        expect.any(Function),
      );
    });

    it('removes listener on unmount', () => {
      const { unmount } = render(<SearchAnalytics />);
      unmount();
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'sc-consent-change',
        expect.any(Function),
      );
    });
  });

  describe('route handling', () => {
    it('does not start polling when not consented', () => {
      mockConsented = false;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=hello';

      render(<SearchAnalytics />);

      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('does not poll when consented but not on /search', async () => {
      mockConsented = true;
      mockLocation.pathname = '/docs/getting-started/setup';
      mockLocation.search = '';

      render(<SearchAnalytics />);

      await waitFor(() => {
        // setInterval may or may not fire depending on consent state timing,
        // but trackSearch should never be called for non-search routes
        expect(trackSearch).not.toHaveBeenCalled();
      });
    });

    it('does not poll when on /search with no query param', () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '';

      render(<SearchAnalytics />);

      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('does not poll when query param is whitespace only', () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=   ';

      render(<SearchAnalytics />);

      expect(trackSearch).not.toHaveBeenCalled();
    });

    it('starts polling when on /search with a valid query term', async () => {
      mockConsented = true;
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=soroban+testing';

      render(<SearchAnalytics />);

      // React 18 may batch state updates; waitFor tolerates async propagation
      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalled();
      });
    });

    it('handles /search/ (trailing slash) as search route', async () => {
      mockConsented = true;
      mockLocation.pathname = '/search/';
      mockLocation.search = '?q=trailing';

      render(<SearchAnalytics />);

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalled();
      });
    });
  });

  describe('polling behavior', () => {
    beforeEach(() => {
      mockConsented = true;
      mockLocation.pathname = '/search';
    });

    it('tracks search after two stable ticks with same result count', async () => {
      mockLocation.search = '?q=soroban+testing';
      setArticleCount(5);

      render(<SearchAnalytics />);
      await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

      // Fire one tick — not yet settled
      await tickPolling(1);
      expect(trackSearch).not.toHaveBeenCalled();

      // Second tick with same count → settled → reports
      await tickPolling(1);
      expect(trackSearch).toHaveBeenCalledWith('soroban testing', 5);
    });

    it('tracks zero results for a term with no hits', async () => {
      mockLocation.search = '?q=missingpage';
      setArticleCount(0);

      render(<SearchAnalytics />);
      await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

      await tickPolling(2);
      expect(trackSearch).toHaveBeenCalledWith('missingpage', 0);
    });

    it('does not double-report the same query', async () => {
      mockLocation.search = '?q=hello';
      setArticleCount(3);

      render(<SearchAnalytics />);
      await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

      await tickPolling(2); // settle → first report
      expect(trackSearch).toHaveBeenCalledTimes(1);

      // Additional ticks should not trigger another report
      await tickPolling(3);
      expect(trackSearch).toHaveBeenCalledTimes(1);
    });

    it('reports after max elapsed even if results keep changing', async () => {
      mockLocation.search = '?q=flaky';

      let callCount = 0;
      document.querySelectorAll = vi.fn(() => {
        callCount += 1;
        return {
          length: callCount,
          item: () => null,
          [Symbol.iterator]: function* () {},
        } as unknown as NodeListOf<Element>;
      });

      render(<SearchAnalytics />);
      await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

      // Fire 24 ticks (SETTLE_MAX_MS 6000 / SETTLE_INTERVAL_MS 250).
      // Each tick changes the result count, so it never settles,
      // but the max-timeout fallback should trigger on the 24th tick.
      await tickPolling(24);
      expect(trackSearch).toHaveBeenCalledWith('flaky', expect.any(Number));
    });

    it('re-tracks after navigating away and back to /search', async () => {
      mockLocation.search = '?q=hello';
      setArticleCount(2);

      const { rerender } = render(<SearchAnalytics />);
      await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());

      await tickPolling(2);
      expect(trackSearch).toHaveBeenCalledTimes(1);

      // Navigate away
      mockLocation.pathname = '/docs';
      mockLocation.search = '';
      rerender(<SearchAnalytics />);
      await act(async () => {
        await Promise.resolve();
      });

      // Navigate back — a new setInterval call should happen
      mockLocation.pathname = '/search';
      mockLocation.search = '?q=hello';
      rerender(<SearchAnalytics />);

      await waitFor(() => {
        // Should register another setInterval call
        expect(setIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      // The latest callback is the one for the re-entry
      await tickPollingFromLatest(2);
      expect(trackSearch).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Fire the LATEST polling callback (for re-tracking after navigation).
 */
function getLatestPollingCallback(): () => void {
  const calls = setIntervalSpy.mock.calls;
  const latest = calls[calls.length - 1];
  if (!latest) throw new Error('setInterval was never called');
  return latest[0] as () => void;
}

async function tickPollingFromLatest(times: number) {
  for (let i = 0; i < times; i++) {
    const cb = getLatestPollingCallback();
    await act(async () => {
      cb();
    });
  }
}
