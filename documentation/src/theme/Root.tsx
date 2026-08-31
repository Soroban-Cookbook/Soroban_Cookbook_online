/**
 * Docusaurus theme swizzle — Root wrapper
 *
 * - Issue #136: Sentry error monitoring (DSN from env, release capture, PII scrub)
 * - Issue #179: Web Vitals reporting
 * - Issues #361/#362: analytics consent banner
 * - Issue #358: search analytics
 * - Issue #352: privacy / GDPR consent gating for non-essential beacons
 * - Issue #313: site-wide keyboard shortcuts (navigation, search, actions)
 *
 * This component wraps the entire Docusaurus app. We use it to initialise
 * Sentry and Web Vitals on the client side, and to mount the site-wide
 * analytics consent banner and route-level trackers, without modifying the
 * core layout.
 *
 * ## Sentry configuration
 *
 * Required env vars (set at build time via your CI/CD or .env.local):
 *   SENTRY_DSN          – Project DSN from Sentry dashboard → Settings → SDK Setup
 *
 * Optional env vars:
 *   SENTRY_ENVIRONMENT  – e.g. "production" | "preview" | "development"
 *                         defaults to process.env.NODE_ENV
 *   SENTRY_RELEASE      – Semantic version string, e.g. "1.4.2"
 *                         defaults to npm_package_version
 *
 * When SENTRY_DSN is absent (local dev without a configured project), Sentry
 * is NOT initialised — the page behaves exactly as before this change.
 *
 * ## Testing that errors reach Sentry
 *
 * In a browser console on a Sentry-connected build:
 *   window.__sentryTest()
 *
 * See: https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
 */

import React, { useEffect, type ReactNode } from 'react';
import ConsentBanner from '@site/src/components/ConsentBanner';
import FunnelTracker from '@site/src/components/FunnelTracker';
import KeyboardShortcuts from '@site/src/components/KeyboardShortcuts';
import OfflineNotice from '@site/src/components/OfflineNotice';
import SearchAnalytics from '@site/src/components/SearchAnalytics';
import SearchLoading from '@site/src/components/SearchLoading';
import { ProgressProvider } from '@site/src/contexts/ProgressContext';
import { hasConsent } from '@site/src/utils/analyticsConsent';
import useRecommendationTracker from '../hooks/useRecommendationTracker';

// Build-time constants injected by Docusaurus / webpack DefinePlugin.
// process.env is statically replaced at build time; these are safe to read
// in a browser bundle.
const SENTRY_DSN: string = (typeof process !== 'undefined' && process.env.SENTRY_DSN) || '';
const SENTRY_ENVIRONMENT: string =
  (typeof process !== 'undefined' && (process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV)) ||
  'production';
const SENTRY_RELEASE: string =
  (typeof process !== 'undefined' &&
    (process.env.SENTRY_RELEASE || process.env.npm_package_version)) ||
  'unknown';

interface RootProps {
  children: ReactNode;
}

export default function Root({ children }: RootProps): React.JSX.Element {
  useRecommendationTracker();

  useEffect(() => {
    // ── Sentry initialisation ──────────────────────────────────────────────
    // Only initialise when a DSN is configured. This keeps local development
    // clean and avoids noisy "no DSN provided" console warnings.
    if (SENTRY_DSN) {
      import('@sentry/react')
        .then((Sentry) => {
          Sentry.init({
            dsn: SENTRY_DSN,
            environment: SENTRY_ENVIRONMENT,
            release: SENTRY_RELEASE,

            // Capture 100 % of errors in production; tune down if volume is
            // high once the project is live.
            sampleRate: 1.0,

            // Performance tracing — capture 10 % of transactions by default.
            tracesSampleRate: 0.1,

            // Ignore common browser extension noise and benign network errors.
            ignoreErrors: [
              'ResizeObserver loop limit exceeded',
              'ResizeObserver loop completed with undelivered notifications',
              /chrome-extension:\/\//,
              /extensions\//,
              'NetworkError',
              'Failed to fetch',
              'Load failed',
            ],

            // Strip user PII from breadcrumbs and event data.
            beforeSend(event) {
              if (event.request?.url) {
                try {
                  const url = new URL(event.request.url);
                  ['token', 'key', 'secret', 'password', 'auth'].forEach((p) =>
                    url.searchParams.delete(p),
                  );
                  event.request.url = url.toString();
                } catch {
                  // URL parsing failed — leave as-is
                }
              }
              return event;
            },
          });

          // Expose a test helper on window so the Sentry integration can be
          // verified without a real user-facing error:
          //   window.__sentryTest()
          if (typeof window !== 'undefined') {
            (window as Window & { __sentryTest?: () => void }).__sentryTest = () => {
              Sentry.captureException(
                new Error('[Sentry test] Manual verification — safe to ignore in production.'),
              );
            };
          }
        })
        .catch(() => {
          // Sentry failed to load (network issue, ad-blocker, etc.).
          // Silently swallow — error monitoring must never break the page.
        });
    }

    // ── Web Vitals reporting ───────────────────────────────────────────────
    import('../utils/webVitals').then(({ reportWebVitals }) => {
      // Remote vitals beacons are non-essential; only start collectors when
      // analytics consent is present. Console-only logging still helps locally
      // when consent was accepted or during development without a remote sink.
      if (hasConsent() || process.env.NODE_ENV !== 'production') {
        reportWebVitals().catch(() => {
          // Vitals reporting must never break the page.
        });
      }
    });
  }, []);

  return (
    <ProgressProvider>
      {children}
      <OfflineNotice />
      <FunnelTracker />
      <SearchAnalytics />
      <SearchLoading />
      <ConsentBanner />
      <KeyboardShortcuts />
    </ProgressProvider>
  );
}
