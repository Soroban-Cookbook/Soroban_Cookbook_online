import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mocks ──────────────────────────────────────────────────────────────────
//
// Everything third-party is stubbed, so this suite never touches the network:
// no gtag script is injected and no request leaves the test process.

const mockLocation = { pathname: '/', search: '', hash: '' };

vi.mock('@docusaurus/router', () => ({
  useLocation: () => ({ ...mockLocation }),
}));

let mockConsented = false;

vi.mock('@site/src/utils/analytics', () => ({
  trackEvent: vi.fn(),
  FUNNEL_STEPS: {
    landingView: 'funnel_landing_view',
    ctaClick: 'funnel_cta_click',
    docsView: 'funnel_docs_view',
    githubClick: 'funnel_github_click',
  },
}));

vi.mock('@site/src/utils/analyticsConsent', () => ({
  CONSENT_CHANGE_EVENT: 'sc-consent-change',
  hasConsent: () => mockConsented,
}));

// Imported after the mocks are registered.
import FunnelTracker from './FunnelTracker';
import { trackEvent, FUNNEL_STEPS } from '@site/src/utils/analytics';

const trackEventMock = vi.mocked(trackEvent);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Grant consent after mount, the way the banner's Accept button does. */
function grantConsent() {
  mockConsented = true;
  act(() => {
    window.dispatchEvent(new CustomEvent('sc-consent-change', { detail: 'granted' }));
  });
}

/** A click event jsdom will not try to follow into a real navigation. */
function clickEvent(): MouseEvent {
  return new MouseEvent('click', { bubbles: true, cancelable: true });
}

/** Click a link, exercising the document-level outbound-click listener. */
function clickLink(href: string) {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  document.body.appendChild(anchor);
  act(() => {
    anchor.dispatchEvent(clickEvent());
  });
}

function eventNames(): string[] {
  return trackEventMock.mock.calls.map((call) => call[0] as string);
}

/** jsdom cannot navigate; swallow the default action so it stays quiet. */
const suppressNavigation = (event: Event) => event.preventDefault();

beforeEach(() => {
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockConsented = false;
  trackEventMock.mockClear();
  document.body.innerHTML = '';
  document.addEventListener('click', suppressNavigation);
});

afterEach(() => {
  document.removeEventListener('click', suppressNavigation);
  document.body.innerHTML = '';
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FunnelTracker', () => {
  it('renders nothing', () => {
    const { container } = render(<FunnelTracker />);
    expect(container.innerHTML).toBe('');
  });

  describe('without consent', () => {
    it('does not record the landing view', () => {
      mockLocation.pathname = '/';
      render(<FunnelTracker />);
      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('does not record the docs view', () => {
      mockLocation.pathname = '/docs/patterns/overview';
      render(<FunnelTracker />);
      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('does not record outbound GitHub clicks', () => {
      render(<FunnelTracker />);
      clickLink('https://github.com/Soroban-Cookbook/Soroban_Cookbook_online');
      expect(trackEventMock).not.toHaveBeenCalled();
    });
  });

  describe('with consent', () => {
    beforeEach(() => {
      mockConsented = true;
    });

    it('records the landing view on the homepage', () => {
      mockLocation.pathname = '/';
      render(<FunnelTracker />);

      expect(trackEventMock).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(FUNNEL_STEPS.landingView, { page_path: '/' });
    });

    it('records the docs view on a docs route', () => {
      mockLocation.pathname = '/docs/patterns/escrow-basic';
      render(<FunnelTracker />);

      expect(trackEventMock).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(FUNNEL_STEPS.docsView, {
        page_path: '/docs/patterns/escrow-basic',
      });
    });

    it('records nothing on routes outside the funnel', () => {
      mockLocation.pathname = '/blog/launch';
      render(<FunnelTracker />);

      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('records outbound GitHub clicks with their destination', () => {
      mockLocation.pathname = '/docs/patterns/staking';
      render(<FunnelTracker />);
      trackEventMock.mockClear();

      const href = 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online';
      clickLink(href);

      expect(trackEventMock).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(FUNNEL_STEPS.githubClick, {
        destination: href,
        page_path: '/docs/patterns/staking',
      });
    });

    it('records a click on an element nested inside a GitHub link', () => {
      render(<FunnelTracker />);
      trackEventMock.mockClear();

      const anchor = document.createElement('a');
      anchor.setAttribute('href', 'https://github.com/stellar/soroban-examples');
      const label = document.createElement('span');
      anchor.appendChild(label);
      document.body.appendChild(anchor);

      act(() => {
        label.dispatchEvent(clickEvent());
      });

      expect(eventNames()).toEqual([FUNNEL_STEPS.githubClick]);
    });

    it('ignores internal and non-GitHub outbound links', () => {
      render(<FunnelTracker />);
      trackEventMock.mockClear();

      clickLink('/docs/patterns/overview');
      clickLink('https://stellar.org');
      clickLink('#section');

      expect(trackEventMock).not.toHaveBeenCalled();
    });

    it('stops tracking clicks after unmount', () => {
      const { unmount } = render(<FunnelTracker />);
      trackEventMock.mockClear();
      unmount();

      clickLink('https://github.com/Soroban-Cookbook/Soroban_Cookbook_online');

      expect(trackEventMock).not.toHaveBeenCalled();
    });
  });

  describe('consent granted after mount', () => {
    it('records the step for the page the visitor is already on', () => {
      mockLocation.pathname = '/docs/getting-started/installation';
      render(<FunnelTracker />);
      expect(trackEventMock).not.toHaveBeenCalled();

      grantConsent();

      expect(trackEventMock).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(FUNNEL_STEPS.docsView, {
        page_path: '/docs/getting-started/installation',
      });
    });

    it('starts recording outbound GitHub clicks', () => {
      mockLocation.pathname = '/';
      render(<FunnelTracker />);

      clickLink('https://github.com/Soroban-Cookbook/Soroban_Cookbook_online');
      expect(trackEventMock).not.toHaveBeenCalled();

      grantConsent();
      trackEventMock.mockClear();

      clickLink('https://github.com/Soroban-Cookbook/Soroban_Cookbook_online');
      expect(eventNames()).toEqual([FUNNEL_STEPS.githubClick]);
    });
  });

  it('only ever emits documented funnel event names', () => {
    mockConsented = true;
    mockLocation.pathname = '/';
    render(<FunnelTracker />);
    clickLink('https://github.com/Soroban-Cookbook/Soroban_Cookbook_online');

    const documented = Object.values(FUNNEL_STEPS);
    expect(eventNames().length).toBeGreaterThan(0);
    eventNames().forEach((name) => expect(documented).toContain(name));
  });
});
