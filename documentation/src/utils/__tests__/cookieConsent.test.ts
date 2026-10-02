import { afterEach, describe, expect, it } from 'vitest';
import {
  CONSENT_STORAGE_KEY,
  clearConsent,
  hasAnalyticsConsent,
  readConsent,
  writeConsent,
} from '../cookieConsent';
import { trackEvent } from '../analytics';

describe('cookieConsent', () => {
  afterEach(() => {
    clearConsent();
  });

  it('returns null when no consent stored', () => {
    expect(readConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('persists accept and reject choices', () => {
    writeConsent('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
    expect(readConsent()?.analytics).toBe('accepted');

    writeConsent('rejected');
    expect(hasAnalyticsConsent()).toBe(false);
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || '{}').analytics).toBe(
      'rejected',
    );
  });
});

describe('analytics event gating', () => {
  afterEach(() => {
    clearConsent();
    // @ts-expect-error test cleanup
    delete window.gtag;
    // @ts-expect-error test cleanup
    delete window.dataLayer;
  });

  // Consent gates script *injection* (see CookieConsent), so without consent
  // GA is never injected, `window.gtag` never exists, and events are dropped.
  it('does not call gtag when GA is not injected (no consent given)', () => {
    trackEvent('copy_code', { code_language: 'rust' });
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
  });

  it('calls gtag after analytics consent is accepted', () => {
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => {
      calls.push(args);
    };
    writeConsent('accepted');
    trackEvent('copy_code', { code_language: 'rust' });
    expect(calls).toEqual([['event', 'copy_code', { code_language: 'rust' }]]);
  });
});
