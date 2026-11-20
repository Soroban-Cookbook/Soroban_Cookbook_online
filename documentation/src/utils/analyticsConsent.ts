/**
 * Consent state for optional analytics (GA4) and session-replay/heatmap (Clarity)
 * tooling. Nothing in `analytics.ts` loads a third-party script until the visitor
 * has explicitly granted consent here — see CookieConsent for the UI.
 *
 * This is a thin adapter over `cookieConsent.ts`, which owns the single consent
 * store (`soroban-cookie-consent`) and change event written by the banner, so
 * every consent-gated tracker reads the same switch.
 */

import { CONSENT_CHANGE_EVENT, readConsent, writeConsent } from './cookieConsent';

export { CONSENT_CHANGE_EVENT };

export type ConsentValue = 'granted' | 'denied';

export function getConsent(): ConsentValue | null {
  const record = readConsent();
  if (!record) return null;
  return record.analytics === 'accepted' ? 'granted' : 'denied';
}

export function setConsent(value: ConsentValue): void {
  writeConsent(value === 'granted' ? 'accepted' : 'rejected');
}

export function hasConsent(): boolean {
  return getConsent() === 'granted';
}
