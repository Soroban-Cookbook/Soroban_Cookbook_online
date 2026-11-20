/**
 * Verification for issue #941: the cookie banner and the consent-gated
 * trackers share one consent store.
 *
 * The consent modules stay real — the banner's `writeConsent` must be what
 * enables or disables `FunnelTracker` and `SearchAnalytics`. Only the router
 * and the outbound analytics calls are stubbed.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';

const mockLocation = { pathname: '/', search: '', hash: '' };

vi.mock('@docusaurus/router', () => ({
  useLocation: () => ({ ...mockLocation }),
}));

vi.mock('@site/src/utils/analytics', () => ({
  trackEvent: vi.fn(),
  trackSearch: vi.fn(),
  FUNNEL_STEPS: {
    landingView: 'funnel_landing_view',
    ctaClick: 'funnel_cta_click',
    docsView: 'funnel_docs_view',
    githubClick: 'funnel_github_click',
  },
}));

import { clearConsent, writeConsent } from '../cookieConsent';
import { getConsent, hasConsent, setConsent } from '../analyticsConsent';
import FunnelTracker from '@site/src/components/FunnelTracker/FunnelTracker';
import SearchAnalytics from '@site/src/components/SearchAnalytics/SearchAnalytics';
import { trackEvent, trackSearch } from '@site/src/utils/analytics';

beforeEach(() => {
  mockLocation.pathname = '/';
  mockLocation.search = '';
  vi.mocked(trackEvent).mockClear();
  vi.mocked(trackSearch).mockClear();
});

afterEach(() => {
  clearConsent();
  vi.useRealTimers();
});

describe('analyticsConsent reads the banner store', () => {
  it('reports no consent before the banner is answered', () => {
    expect(getConsent()).toBeNull();
    expect(hasConsent()).toBe(false);
  });

  it('follows banner accept and reject', () => {
    writeConsent('accepted');
    expect(getConsent()).toBe('granted');
    expect(hasConsent()).toBe(true);

    writeConsent('rejected');
    expect(getConsent()).toBe('denied');
    expect(hasConsent()).toBe(false);
  });

  it('writes through to the banner store', () => {
    setConsent('granted');
    expect(localStorage.getItem('soroban-cookie-consent')).toContain('"accepted"');
    setConsent('denied');
    expect(localStorage.getItem('soroban-cookie-consent')).toContain('"rejected"');
  });
});

describe('FunnelTracker follows the banner choice', () => {
  it('tracks after the banner is accepted', () => {
    render(<FunnelTracker />);
    expect(trackEvent).not.toHaveBeenCalled();

    act(() => {
      writeConsent('accepted');
    });
    expect(trackEvent).toHaveBeenCalledWith('funnel_landing_view', { page_path: '/' });
  });

  it('does not track after the banner is rejected', () => {
    render(<FunnelTracker />);
    act(() => {
      writeConsent('rejected');
    });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe('SearchAnalytics follows the banner choice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLocation.pathname = '/search';
    mockLocation.search = '?q=storage';
  });

  it('reports searches after the banner is accepted', () => {
    render(<SearchAnalytics />);
    act(() => {
      writeConsent('accepted');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(trackSearch).toHaveBeenCalledWith('storage', 0);
  });

  it('does not report searches after the banner is rejected', () => {
    render(<SearchAnalytics />);
    act(() => {
      writeConsent('rejected');
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(trackSearch).not.toHaveBeenCalled();
  });
});
