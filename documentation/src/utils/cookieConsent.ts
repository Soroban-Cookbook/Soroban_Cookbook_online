/**
 * Cookie / analytics consent helpers (Issue #352).
 *
 * Consent is stored in localStorage. Non-essential analytics (GA4 / custom
 * beacons) must not run until the visitor accepts analytics cookies.
 */

export const CONSENT_STORAGE_KEY = 'soroban-cookie-consent';
export const CONSENT_CHANGE_EVENT = 'soroban-consent-change';

export type ConsentChoice = 'accepted' | 'rejected';

export type ConsentRecord = {
  analytics: ConsentChoice;
  updatedAt: string; // ISO timestamp
  version: 1;
};

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (
      parsed?.version !== 1 ||
      (parsed.analytics !== 'accepted' && parsed.analytics !== 'rejected')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === 'accepted';
}

export function writeConsent(analytics: ConsentChoice): ConsentRecord {
  const record: ConsentRecord = {
    analytics,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: record }));
    } catch {
      // Storage may be unavailable; still return the in-memory decision.
    }
  }
  return record;
}

export function clearConsent(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}

/** Open the cookie banner again so the visitor can change their choice. */
export function requestConsentPreferences(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('soroban-open-consent'));
}
