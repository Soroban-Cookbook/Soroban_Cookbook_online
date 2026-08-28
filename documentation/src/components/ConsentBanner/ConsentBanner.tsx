import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { getConsent, setConsent } from '@site/src/utils/analyticsConsent';
import { initAnalytics } from '@site/src/utils/analytics';
import styles from './ConsentBanner.module.css';

/**
 * Site-wide cookie/analytics consent prompt. Analytics (GA4, issue #362) and
 * heatmap tooling (Clarity, issue #361) never load until the visitor accepts
 * here — either in this session or a prior one.
 */
export default function ConsentBanner() {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();
  const gaMeasurementId =
    typeof customFields?.gaMeasurementId === 'string' ? customFields.gaMeasurementId : '';
  const clarityProjectId =
    typeof customFields?.clarityProjectId === 'string' ? customFields.clarityProjectId : '';
  const analyticsConfigured = Boolean(gaMeasurementId || clarityProjectId);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!analyticsConfigured) return;

    const existing = getConsent();
    if (existing === 'granted') {
      initAnalytics({ gaMeasurementId, clarityProjectId });
    } else if (existing === null) {
      setVisible(true);
    }
  }, [analyticsConfigured, gaMeasurementId, clarityProjectId]);

  if (!analyticsConfigured || !visible) return null;

  const accept = () => {
    setConsent('granted');
    initAnalytics({ gaMeasurementId, clarityProjectId });
    setVisible(false);
  };

  const decline = () => {
    setConsent('denied');
    setVisible(false);
  };

  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Analytics consent">
      <p className={styles.text}>
        We use privacy-friendly analytics to understand how the docs are used (page views, CTA
        clicks, heatmaps). No data loads unless you accept. See the{' '}
        <Link to="/privacy">Privacy Policy</Link> for details. clicks, heatmaps).{' '}
        <Link to="/docs/legal/privacy" className={styles.privacyLink}>
          Privacy policy
        </Link>
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.decline} onClick={decline}>
          Decline
        </button>
        <button type="button" className={styles.accept} onClick={accept}>
          Accept
        </button>
      </div>
    </div>
  );
}
