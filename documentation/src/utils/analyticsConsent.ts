/**
 * Consent state for optional analytics (GA4) and session-replay/heatmap (Clarity)
 * tooling. Nothing in `analytics.ts` loads a third-party script until the visitor
 * has explicitly granted consent here — see ConsentBanner for the UI.
 */

export type ConsentValue = 'granted' | 'denied';

const STORAGE_KEY = 'sc-analytics-consent';
export const CONSENT_CHANGE_EVENT = 'sc-consent-change';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function getConsent(): ConsentValue | null {
  if (!isBrowser()) return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'granted' || stored === 'denied' ? stored : null;
}

export function setConsent(value: ConsentValue): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: value }));
}

export function hasConsent(): boolean {
  return getConsent() === 'granted';
}
