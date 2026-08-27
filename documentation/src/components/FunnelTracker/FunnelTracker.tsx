import { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { FUNNEL_STEPS, trackEvent } from '@site/src/utils/analytics';
import { CONSENT_CHANGE_EVENT, hasConsent } from '@site/src/utils/analyticsConsent';

/**
 * Records the landing → docs → GitHub conversion funnel (issue #362).
 *
 * Renders nothing. The CTA-click step is fired from the homepage buttons
 * themselves (see src/pages/index.tsx); this component covers the two
 * route-based steps plus outbound GitHub clicks from anywhere on the site.
 */
export default function FunnelTracker(): null {
  const { pathname } = useLocation();
  // Consent may be granted after the first render (visitor clicks Accept on the
  // banner), so this re-runs the step for the page they are already on.
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(hasConsent());
    const onChange = () => setConsented(hasConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!consented) return;
    if (pathname === '/') {
      trackEvent(FUNNEL_STEPS.landingView, { page_path: pathname });
    } else if (pathname.startsWith('/docs')) {
      trackEvent(FUNNEL_STEPS.docsView, { page_path: pathname });
    }
  }, [consented, pathname]);

  useEffect(() => {
    if (!consented) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.('a');
      const href = anchor?.getAttribute('href');
      if (!href?.startsWith('https://github.com/')) return;
      trackEvent(FUNNEL_STEPS.githubClick, { destination: href, page_path: pathname });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [consented, pathname]);

  return null;
}
