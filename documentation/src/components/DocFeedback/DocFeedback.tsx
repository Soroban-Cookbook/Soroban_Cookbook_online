import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { trackFeedback, trackFeedbackDetail } from '@site/src/utils/analytics';
import styles from './DocFeedback.module.css';

/**
 * "Was this page helpful?" widget shown at the foot of every docs page
 * (issue #359).
 *
 * Two independent capture paths, so feedback is never lost to a blocked
 * tracker or a declined consent prompt:
 *   1. The yes/no vote is sent to GA4 (no-op without consent).
 *   2. The follow-up link opens a prefilled GitHub Discussion, which records
 *      the response regardless of analytics.
 *
 * The vote is remembered per page in localStorage so readers are not asked
 * again on a page they already answered.
 */

const DISCUSSION_URL =
  'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/discussions/new?category=ideas';
const STORAGE_PREFIX = 'sc-doc-feedback:';

export default function DocFeedback(): React.JSX.Element | null {
  const { pathname } = useLocation();
  const [vote, setVote] = useState<'yes' | 'no' | null>(null);
  // Rendered only after mount: the stored vote lives in localStorage, so
  // deciding what to show during render would break hydration.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(`${STORAGE_PREFIX}${pathname}`);
    } catch {
      // Storage unavailable — just ask again.
    }
    setVote(stored === 'yes' || stored === 'no' ? stored : null);
    setReady(true);
  }, [pathname]);

  if (!ready) return null;

  const submit = (helpful: boolean) => {
    const value = helpful ? 'yes' : 'no';
    setVote(value);
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}${pathname}`, value);
    } catch {
      // A vote that cannot be persisted is still worth reporting.
    }
    trackFeedback(pathname, helpful);
  };

  const detailUrl = `${DISCUSSION_URL}&title=${encodeURIComponent(
    `Docs feedback: ${pathname}`,
  )}&body=${encodeURIComponent(`**Page:** \`${pathname}\`\n\n**What could be clearer?**\n\n`)}`;

  return (
    <section className={styles.wrapper} aria-labelledby="doc-feedback-heading">
      {vote === null ? (
        <div className={styles.row}>
          <p id="doc-feedback-heading" className={styles.prompt}>
            Was this page helpful?
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.voteButton} onClick={() => submit(true)}>
              <span aria-hidden="true">👍</span> Yes
            </button>
            <button type="button" className={styles.voteButton} onClick={() => submit(false)}>
              <span aria-hidden="true">👎</span> No
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <p id="doc-feedback-heading" className={styles.prompt} role="status">
            {vote === 'yes'
              ? 'Thanks for the feedback!'
              : 'Thanks — sorry this page missed the mark.'}
          </p>
          <a
            className={styles.detailLink}
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFeedbackDetail(pathname)}>
            {vote === 'yes' ? 'Suggest an improvement' : 'Tell us what was missing'}
          </a>
        </div>
      )}
    </section>
  );
}
