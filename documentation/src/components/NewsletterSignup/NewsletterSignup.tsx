import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';
import {
  getOrCreateCSRFToken,
  clearCSRFToken,
  updateCSRFTokenFromResponse,
} from '../../utils/csrf';
import { trackNewsletterSubmit } from '@site/src/utils/analytics';
import styles from './NewsletterSignup.module.css';
import { isHttpsUrl } from '@site/src/utils/sanitizeUrl';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Client-side cooldown between newsletter submits (Phase 6 / issue #351). */
export const NEWSLETTER_SUBMIT_COOLDOWN_MS = 3_000;

export type NewsletterSignupProps = {
  className?: string;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

function messageForHttpStatus(status: number): string {
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return 'Something went wrong. Try again in a moment.';
}

export default function NewsletterSignup({ className }: NewsletterSignupProps) {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();
  const endpoint = useMemo(() => {
    const raw = customFields?.newsletterEndpoint;
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    if (!isHttpsUrl(raw)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[NewsletterSignup] newsletterEndpoint must be an https:// URL. Endpoint ignored.',
        );
      }
      return undefined;
    }
    return raw;
  }, [customFields]);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const formId = useId();
  const emailId = `${formId}-email`;
  const errorId = `${formId}-error`;
  const lastSubmitAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const validate = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Enter an email address.';
    }
    if (!EMAIL_RE.test(trimmed)) {
      return 'Enter a valid email address.';
    }
    return null;
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (inFlightRef.current || status === 'loading' || status === 'success') {
        return;
      }

      const now = Date.now();
      if (now - lastSubmitAtRef.current < NEWSLETTER_SUBMIT_COOLDOWN_MS) {
        setStatus('error');
        setMessage('Please wait a few seconds before trying again.');
        return;
      }

      const err = validate(email);
      if (err) {
        setStatus('error');
        setMessage(err);
        return;
      }

      inFlightRef.current = true;
      lastSubmitAtRef.current = now;
      setStatus('loading');
      setMessage(null);

      if (!endpoint) {
        await new Promise((r) => setTimeout(r, 600));
        setStatus('success');
        setMessage('Thanks — you are on the list. We will share Soroban Cookbook updates here.');
        setEmail('');
        trackNewsletterSubmit({ method: 'demo' });
        return;
      }

      try {
        if (!endpoint) {
          await new Promise((r) => setTimeout(r, 600));
          setStatus('success');
          setMessage('Thanks — you are on the list. We will share Soroban Cookbook updates here.');
          setEmail('');
          return;
        }

        // Get CSRF token for protection against CSRF attacks
        const csrfToken = getOrCreateCSRFToken();

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({ email: email.trim() }),
          // SameSite cookie protection (enforced by browser)
          credentials: 'same-origin',
        });

        // Update CSRF token if backend rotates it
        updateCSRFTokenFromResponse(res);

        if (!res.ok) {
          setStatus('error');
          setMessage(messageForHttpStatus(res.status));
          return;
        }
        setStatus('success');
        setMessage('Thanks — check your inbox to confirm your subscription.');
        setEmail('');
        clearCSRFToken();
        trackNewsletterSubmit({ method: 'endpoint' });
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Try again in a moment.');
      } finally {
        inFlightRef.current = false;
      }
    },
    [email, endpoint, status, validate],
  );

  return (
    <section className={clsx(styles.section, className)} aria-labelledby={`${formId}-title`}>
      <div className={styles.inner}>
        <h2 id={`${formId}-title`} className={styles.title}>
          Stay in the loop
        </h2>
        <p className={styles.lead}>
          Get updates on new patterns, tutorials, and Soroban Cookbook releases. No spam —
          unsubscribe at any time.
        </p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <div className={styles.fieldRow}>
            <label htmlFor={emailId} className={styles.visuallyHidden}>
              Email address
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className={styles.input}
              value={email}
              disabled={status === 'loading' || status === 'success'}
              aria-invalid={status === 'error'}
              aria-describedby={status === 'error' && message ? errorId : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') {
                  setStatus('idle');
                  setMessage(null);
                }
              }}
            />
            <button
              type="submit"
              className={styles.button}
              disabled={status === 'loading' || status === 'success'}>
              {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>

          <p className={styles.privacy}>
            We use your email only for Soroban Cookbook announcements. See our{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          {message && (
            <p
              id={status === 'error' ? errorId : undefined}
              role={status === 'error' ? 'alert' : 'status'}
              aria-live={status === 'error' ? 'assertive' : 'polite'}
              className={clsx(styles.feedback, {
                [styles.feedbackError]: status === 'error',
                [styles.feedbackSuccess]: status === 'success',
              })}>
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
