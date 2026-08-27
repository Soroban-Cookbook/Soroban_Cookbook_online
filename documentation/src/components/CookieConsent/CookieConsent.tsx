import React, { useCallback, useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { initAnalytics } from '@site/src/utils/analytics';
import {
  CONSENT_CHANGE_EVENT,
  readConsent,
  writeConsent,
  type ConsentRecord,
} from '@site/src/utils/cookieConsent';
import styles from './CookieConsent.module.css';

function getGaId(customFields: Record<string, unknown> | undefined): string {
  const raw = customFields?.gaMeasurementId ?? customFields?.gtagMeasurementId;
  return typeof raw === 'string' ? raw.trim() : '';
}

function getClarityId(customFields: Record<string, unknown> | undefined): string {
  const raw = customFields?.clarityProjectId;
  return typeof raw === 'string' ? raw.trim() : '';
}

export default function CookieConsent(): React.JSX.Element | null {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();
  const measurementId = getGaId(customFields as Record<string, unknown> | undefined);
  const clarityProjectId = getClarityId(customFields as Record<string, unknown> | undefined);

  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [forceOpen, setForceOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ConsentRecord | null>).detail;
      setConsent(detail ?? null);
    };
    const onOpen = () => setForceOpen(true);

    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    window.addEventListener('soroban-open-consent', onOpen);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
      window.removeEventListener('soroban-open-consent', onOpen);
    };
  }, []);

  useEffect(() => {
    if (consent?.analytics === 'accepted' && (measurementId || clarityProjectId)) {
      initAnalytics({ gaMeasurementId: measurementId, clarityProjectId });
    }
  }, [consent, measurementId, clarityProjectId]);

  const accept = useCallback(() => {
    const next = writeConsent('accepted');
    setConsent(next);
    setForceOpen(false);
    if (measurementId || clarityProjectId) {
      initAnalytics({ gaMeasurementId: measurementId, clarityProjectId });
    }
  }, [measurementId, clarityProjectId]);

  const reject = useCallback(() => {
    const next = writeConsent('rejected');
    setConsent(next);
    setForceOpen(false);
  }, []);

  if (!ready) {
    return null;
  }

  const showBanner = forceOpen || consent === null;
  if (!showBanner) {
    return null;
  }

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p id="cookie-consent-title" className={styles.title}>
            Cookies &amp; analytics
          </p>
          <p id="cookie-consent-desc" className={styles.text}>
            We use essential storage for theme preference and form security. Optional analytics (for
            example Google Analytics, when configured) help us understand documentation usage. See
            the <Link to="/privacy">Privacy Policy</Link> for details. You can change this choice
            anytime via Cookie settings in the footer.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.reject} onClick={reject}>
            Reject analytics
          </button>
          <button type="button" className={styles.accept} onClick={accept}>
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
