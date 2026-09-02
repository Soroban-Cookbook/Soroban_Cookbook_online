/**
 * Verification for issue #615: "analytics does not load before consent".
 *
 * These tests exercise the REAL analytics loader (`@site/src/utils/analytics`)
 * end-to-end through the banner, asserting on the resulting DOM: no
 * GA4/Clarity <script> tag and no `window.gtag`/`dataLayer` until the visitor
 * explicitly accepts consent.
 *
 * We deliberately avoid mocking `initAnalytics`, keeping the actual script
 * injection behaviour. Exactly one test in this file ever accepts consent, so
 * the module-level `loaded` latch in `analytics.ts` stays false for every
 * "before consent" assertion.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  __setMockDocusaurusContext,
  __resetMockDocusaurusContext,
} from '../../test-mocks/useDocusaurusContext';
import { clearConsent } from '../../utils/cookieConsent';

// Analytics stays real — only the banner's Docusaurus context is supplied.
vi.mock('@site/src/utils/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@site/src/utils/analytics')>();
  return { ...actual };
});

import CookieConsent from './CookieConsent';

const GA_ID = 'G-TEST123';
const CLARITY_ID = 'CLARITYID123';

function hasInjectedScript(id: string): boolean {
  return document.getElementById(id) !== null;
}

describe('CookieConsent — real analytics gating (issue #615)', () => {
  beforeEach(() => {
    __setMockDocusaurusContext({
      siteConfig: { customFields: { gaMeasurementId: GA_ID, clarityProjectId: CLARITY_ID } },
    });
    clearConsent();
  });

  afterEach(() => {
    __resetMockDocusaurusContext();
    document.getElementById('ga4-gtag-src')?.remove();
    document.getElementById('ms-clarity-src')?.remove();
    delete window.gtag;
    delete window.dataLayer;
    delete window.clarity;
  });

  it('does not inject GA/Clarity scripts or define gtag before any consent', () => {
    render(<CookieConsent />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(hasInjectedScript('ga4-gtag-src')).toBe(false);
    expect(hasInjectedScript('ms-clarity-src')).toBe(false);
    // @ts-expect-error window.gtag is optional
    expect(window.gtag).toBeUndefined();
    // @ts-expect-error window.dataLayer is optional
    expect(window.dataLayer).toBeUndefined();
  });

  it('injects GA/Clarity scripts only after the visitor accepts consent', () => {
    render(<CookieConsent />);

    // Reject first: still nothing loaded.
    fireEvent.click(screen.getByRole('button', { name: /reject analytics/i }));
    expect(hasInjectedScript('ga4-gtag-src')).toBe(false);
    expect(hasInjectedScript('ms-clarity-src')).toBe(false);

    // The banner is hidden after reject; reopen via the consent-preferences
    // event, then accept — now GA + Clarity load.
    act(() => {
      window.dispatchEvent(new Event('soroban-open-consent'));
    });
    fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));

    expect(hasInjectedScript('ga4-gtag-src')).toBe(true);
    expect(hasInjectedScript('ms-clarity-src')).toBe(true);
    // @ts-expect-error window.gtag is optional
    expect(typeof window.gtag).toBe('function');
  });
});
