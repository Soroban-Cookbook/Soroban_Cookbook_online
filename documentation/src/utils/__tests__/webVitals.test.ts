import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric } from 'web-vitals';

const ENDPOINT = 'https://analytics.example.com/vitals';

const { hasConsent, callbacks } = vi.hoisted(() => ({
  hasConsent: vi.fn(() => true),
  callbacks: {} as Record<string, (metric: Metric) => void>,
}));

vi.mock('../analyticsConsent', () => ({ hasConsent }));

vi.mock('web-vitals', () => {
  const register = (name: string) => (cb: (metric: Metric) => void) => {
    callbacks[name] = cb;
  };
  return {
    onCLS: register('CLS'),
    onFCP: register('FCP'),
    onINP: register('INP'),
    onLCP: register('LCP'),
    onTTFB: register('TTFB'),
  };
});

function metric(overrides: Partial<Metric>): Metric {
  return {
    name: 'LCP',
    value: 1234.4,
    rating: 'good',
    delta: 1234.4,
    id: 'v5-123',
    entries: [],
    navigationType: 'navigate',
    ...overrides,
  } as Metric;
}

/** Re-imports the module so the build-time ANALYTICS_ENDPOINT constant is re-read. */
async function loadAndRegister(endpoint: string): Promise<void> {
  vi.stubEnv('ANALYTICS_ENDPOINT', endpoint);
  vi.resetModules();
  const { reportWebVitals } = await import('../webVitals');
  await reportWebVitals();
}

async function sentPayload(sendBeacon: ReturnType<typeof vi.fn>) {
  const [, blob] = sendBeacon.mock.calls[0] as [string, Blob];
  return JSON.parse(await blob.text());
}

describe('webVitals', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeacon,
      configurable: true,
      writable: true,
    });
    hasConsent.mockReturnValue(true);
    for (const key of Object.keys(callbacks)) delete callbacks[key];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('registers a collector for every Core Web Vital', async () => {
    await loadAndRegister(ENDPOINT);

    expect(Object.keys(callbacks).sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
  });

  it('sends a beacon with the correct payload when consent is granted', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await loadAndRegister(ENDPOINT);

    callbacks.LCP(metric({ name: 'LCP', value: 1234.4, delta: 1234.6 }));

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe(ENDPOINT);
    const blob = sendBeacon.mock.calls[0][1] as Blob;
    expect(blob.type).toBe('application/json');
    expect(await sentPayload(sendBeacon)).toEqual({
      name: 'LCP',
      value: 1234,
      rating: 'good',
      delta: 1235,
      id: 'v5-123',
      navigationType: 'navigate',
      pathname: window.location.pathname,
    });
  });

  it('does not send a beacon without consent', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    hasConsent.mockReturnValue(false);
    await loadAndRegister(ENDPOINT);

    callbacks.FCP(metric({ name: 'FCP', value: 800 }));

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('does not send a beacon when no endpoint is configured', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await loadAndRegister('');

    callbacks.TTFB(metric({ name: 'TTFB', value: 120 }));

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('logs metrics to the console in development', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    hasConsent.mockReturnValue(false);
    await loadAndRegister(ENDPOINT);

    callbacks.INP(metric({ name: 'INP', value: 96, rating: 'good' }));

    expect(info).toHaveBeenCalledWith(
      '[Web Vitals]',
      'INP',
      96,
      '(good)',
      expect.objectContaining({ name: 'INP', value: 96 }),
    );
  });

  it('scales CLS value and delta by 1000 before rounding', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    await loadAndRegister(ENDPOINT);

    callbacks.CLS(
      metric({ name: 'CLS', value: 0.1234, delta: 0.0567, rating: 'needs-improvement' }),
    );

    const payload = await sentPayload(sendBeacon);
    expect(payload.value).toBe(123);
    expect(payload.delta).toBe(57);
    expect(payload.rating).toBe('needs-improvement');
  });
});
