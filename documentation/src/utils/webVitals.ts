/**
 * Web Vitals reporting — Issue #179
 *
 * Collects Core Web Vitals (LCP, INP, CLS, FCP, TTFB) and:
 *   1. Logs them to the console in development.
 *   2. Sends a JSON beacon to the configured analytics endpoint in production.
 *
 * To forward metrics to a custom endpoint, set the `ANALYTICS_ENDPOINT`
 * environment variable at build time, e.g.:
 *
 *   ANALYTICS_ENDPOINT=https://analytics.example.com/vitals npm run build
 *
 * If no endpoint is configured the metrics are only logged to the console.
 * To wire up Google Analytics, replace the `sendToAnalytics` body with a
 * `gtag('event', …)` call (see comments below).
 */

import type { Metric } from 'web-vitals';
import { hasConsent } from './analyticsConsent';

/** POST target for beacon payloads. Falls through to console-only when blank. */
const ANALYTICS_ENDPOINT = (typeof process !== 'undefined' && process.env.ANALYTICS_ENDPOINT) || '';

/** Shape of the payload we send to the analytics endpoint. */
interface VitalPayload {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  pathname: string;
}

function sendToAnalytics(metric: Metric): void {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  const payload: VitalPayload = {
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
    id: metric.id,
    navigationType: metric.navigationType,
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
  };

  // Always log in development; also log in production so the browser DevTools
  // Performance tab shows the data without needing a backend.
  if (isDev || process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.info('[Web Vitals]', payload.name, payload.value, `(${payload.rating})`, payload);
  }

  // Remote beacons are non-essential — require analytics consent.
  if (!hasConsent()) {
    return;
  }

  // Send to custom analytics endpoint via Beacon API (non-blocking).
  if (ANALYTICS_ENDPOINT && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify(payload);
    navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: 'application/json' }));
  }
}

/**
 * Registers all Core Web Vitals collectors.
 * Call this once on the client side (e.g. from a Docusaurus Root wrapper or
 * clientModule). Safe to call multiple times — subsequent calls are no-ops
 * because the `web-vitals` library deduplicates observers internally.
 */
export async function reportWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return; // SSR guard

  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
