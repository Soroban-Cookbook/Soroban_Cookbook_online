import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_EVENTS,
  trackCopyCode,
  trackEvent,
  trackNewsletterSubmit,
  trackSearch,
} from '../analytics';

describe('analytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error cleanup test doubles
    delete window.gtag;
    // @ts-expect-error cleanup test doubles
    delete window.dataLayer;
  });

  it('no-ops safely when gtag and dataLayer are missing', () => {
    expect(() => trackEvent(ANALYTICS_EVENTS.SEARCH, { query_length: 3 })).not.toThrow();
  });

  it('calls gtag with event name and params', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackEvent(ANALYTICS_EVENTS.COPY_CODE, { code_language: 'rust' });

    expect(gtag).toHaveBeenCalledWith('event', 'copy_code', {
      code_language: 'rust',
    });
  });

  it('pushes to dataLayer when present', () => {
    window.dataLayer = [];
    trackSearch('hello', 2);

    expect(window.dataLayer).toEqual([
      {
        event: 'search',
        search_term: 'hello',
        search_results: 2,
      },
    ]);
  });

  it('omits undefined params', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackCopyCode({ language: 'rust' });

    expect(gtag).toHaveBeenCalledWith('event', 'copy_code', {
      code_language: 'rust',
      code_section: 'code_block',
    });
  });

  it('tracks newsletter success without email or PII', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackNewsletterSubmit({ method: 'demo' });

    expect(gtag).toHaveBeenCalledWith('event', 'newsletter_submit', {
      submission_status: 'success',
      submission_method: 'demo',
    });
    const payload = gtag.mock.calls[0][2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('email');
  });

  it('swallows gtag errors', () => {
    window.gtag = () => {
      throw new Error('gtag failed');
    };
    expect(() => trackEvent('search', { query_length: 1 })).not.toThrow();
  });
});
