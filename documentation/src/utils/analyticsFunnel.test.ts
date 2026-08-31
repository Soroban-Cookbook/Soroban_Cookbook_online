import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Funnel analytics contract tests (issue #628).
 *
 * These cover the two policy rules the funnel must never break — no events
 * without a configured measurement ID, and no third-party script before
 * consent — plus the event names the catalog documents. Nothing here reaches
 * the network: jsdom does not fetch script `src`, and no `fetch`/`gtag`
 * transport is installed unless a test installs it.
 */

const EVENTS_DOC = path.join(__dirname, '../../docs/contributing/analytics-events.md');

/** Fresh module instance — `initAnalytics` latches a module-level flag. */
async function loadAnalytics() {
  vi.resetModules();
  return import('./analytics');
}

function gaScript(): HTMLElement | null {
  return document.getElementById('ga4-gtag-src');
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete window.gtag;
  delete window.dataLayer;
  delete window.clarity;
});

afterEach(() => {
  document.head.innerHTML = '';
  delete window.gtag;
  delete window.dataLayer;
  delete window.clarity;
  vi.restoreAllMocks();
});

describe('initAnalytics', () => {
  it('injects nothing when no measurement ID is configured', async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics({});

    expect(gaScript()).toBeNull();
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it('injects nothing when the measurement ID is an empty string', async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics({ gaMeasurementId: '' });

    expect(gaScript()).toBeNull();
    expect(window.gtag).toBeUndefined();
  });

  it('loads gtag once a measurement ID is supplied', async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics({ gaMeasurementId: 'G-TEST123' });

    const script = gaScript() as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script!.src).toContain('id=G-TEST123');
    expect(typeof window.gtag).toBe('function');
  });

  it('does not load Clarity when only a GA ID is supplied', async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics({ gaMeasurementId: 'G-TEST123' });

    expect(document.getElementById('ms-clarity-src')).toBeNull();
  });

  it('is a no-op on a second call', async () => {
    const { initAnalytics } = await loadAnalytics();

    initAnalytics({ gaMeasurementId: 'G-TEST123' });
    initAnalytics({ gaMeasurementId: 'G-OTHER456' });

    expect(document.querySelectorAll('#ga4-gtag-src')).toHaveLength(1);
    expect((gaScript() as HTMLScriptElement).src).toContain('id=G-TEST123');
  });
});

describe('funnel events without a measurement ID', () => {
  it('sends nothing when analytics was never initialised', async () => {
    const { trackEvent, trackCtaClick, FUNNEL_STEPS } = await loadAnalytics();

    trackEvent(FUNNEL_STEPS.landingView, { page_path: '/' });
    trackCtaClick('hero-primary', '/docs/patterns/overview');

    // No transport was ever created, so there is nothing to send events on.
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it('stays silent after initAnalytics is called with no IDs', async () => {
    const { initAnalytics, trackEvent, FUNNEL_STEPS } = await loadAnalytics();

    initAnalytics({});
    trackEvent(FUNNEL_STEPS.docsView, { page_path: '/docs/patterns/staking' });
    trackEvent(FUNNEL_STEPS.githubClick, { destination: 'https://github.com/x/y' });

    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it('does not throw when no transport is available', async () => {
    const { trackEvent, FUNNEL_STEPS } = await loadAnalytics();

    expect(() => trackEvent(FUNNEL_STEPS.landingView, { page_path: '/' })).not.toThrow();
  });
});

describe('funnel events once gtag is loaded', () => {
  it('forwards each funnel step to gtag exactly once', async () => {
    const { trackEvent, FUNNEL_STEPS } = await loadAnalytics();
    const gtag = vi.fn();
    window.gtag = gtag;

    trackEvent(FUNNEL_STEPS.landingView, { page_path: '/' });
    trackEvent(FUNNEL_STEPS.docsView, { page_path: '/docs/patterns/staking' });

    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenNthCalledWith(1, 'event', 'funnel_landing_view', { page_path: '/' });
    expect(gtag).toHaveBeenNthCalledWith(2, 'event', 'funnel_docs_view', {
      page_path: '/docs/patterns/staking',
    });
  });

  it('labels CTA clicks with the button and its destination', async () => {
    const { trackCtaClick } = await loadAnalytics();
    const gtag = vi.fn();
    window.gtag = gtag;

    trackCtaClick('hero-primary', '/docs/getting-started/installation');

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'funnel_cta_click', {
      cta_id: 'hero-primary',
      destination: '/docs/getting-started/installation',
    });
  });

  it('omits undefined parameters', async () => {
    const { trackEvent, FUNNEL_STEPS } = await loadAnalytics();
    const gtag = vi.fn();
    window.gtag = gtag;

    trackEvent(FUNNEL_STEPS.githubClick, {
      destination: 'https://github.com/x/y',
      page_path: undefined,
    });

    expect(gtag).toHaveBeenCalledWith('event', 'funnel_github_click', {
      destination: 'https://github.com/x/y',
    });
  });

  it('swallows gtag failures so the UI keeps working', async () => {
    const { trackEvent, FUNNEL_STEPS } = await loadAnalytics();
    window.gtag = () => {
      throw new Error('gtag blew up');
    };

    expect(() => trackEvent(FUNNEL_STEPS.ctaClick, { cta_id: 'hero' })).not.toThrow();
  });
});

describe('event catalog', () => {
  it('documents every funnel step in contributing/analytics-events.md', async () => {
    const { FUNNEL_STEPS } = await loadAnalytics();
    const catalog = fs.readFileSync(EVENTS_DOC, 'utf8');

    for (const eventName of Object.values(FUNNEL_STEPS)) {
      expect(catalog).toContain(`### \`${eventName}\``);
    }
  });

  it('keeps the funnel steps in landing → CTA → docs → GitHub order', async () => {
    const { FUNNEL_STEPS } = await loadAnalytics();

    expect(Object.values(FUNNEL_STEPS)).toEqual([
      'funnel_landing_view',
      'funnel_cta_click',
      'funnel_docs_view',
      'funnel_github_click',
    ]);
  });
});
