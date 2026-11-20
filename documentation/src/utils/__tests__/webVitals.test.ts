import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric } from 'web-vitals';
import { clearConsent, writeConsent } from '../cookieConsent';

const collectors = vi.hoisted(() => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

vi.mock('web-vitals', () => collectors);

function createMetric(id: string): Metric {
  return {
    name: 'LCP',
    value: 100,
    rating: 'good',
    delta: 100,
    id,
    navigationType: 'navigate',
  } as Metric;
}

async function getLcpReporter(): Promise<(metric: Metric) => void> {
  const { reportWebVitals } = await import('../webVitals');
  await reportWebVitals();
  return vi.mocked(collectors.onLCP).mock.calls[0][0] as (metric: Metric) => void;
}

beforeEach(() => {
  vi.stubEnv('ANALYTICS_ENDPOINT', 'https://analytics.example/vitals');
  vi.resetModules();
  Object.values(collectors).forEach((collector) => collector.mockClear());
  clearConsent();
});

afterEach(() => {
  clearConsent();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('reportWebVitals', () => {
  it('sends each metric ID only once', async () => {
    writeConsent('accepted');
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon });
    const report = await getLcpReporter();

    report(createMetric('metric-1'));
    report(createMetric('metric-1'));
    report(createMetric('metric-2'));

    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });

  it('does not mark an ID as sent when consent is missing or Beacon rejects it', async () => {
    const sendBeacon = vi.fn().mockReturnValue(false);
    vi.stubGlobal('navigator', { sendBeacon });
    const report = await getLcpReporter();

    report(createMetric('metric-1'));
    writeConsent('accepted');
    report(createMetric('metric-1'));
    report(createMetric('metric-1'));

    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });
});
