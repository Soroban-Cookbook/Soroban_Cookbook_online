import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe } from 'jest-axe';
import {
  __setMockDocusaurusContext,
  __resetMockDocusaurusContext,
} from '../../test-mocks/useDocusaurusContext';
import {
  CONSENT_STORAGE_KEY,
  clearConsent,
  readConsent,
  writeConsent,
} from '../../utils/cookieConsent';

vi.mock('@site/src/utils/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@site/src/utils/analytics')>();
  return { ...actual, initAnalytics: vi.fn() };
});

import CookieConsent from './CookieConsent';
import { initAnalytics } from '@site/src/utils/analytics';

const mockedInit = vi.mocked(initAnalytics);

const GA_ID = 'G-TEST123';
const CLARITY_ID = 'CLARITYID123';

const AXE_OPTIONS = {
  runOnly: ['wcag2a', 'wcag2aa'],
  rules: {
    'html-has-lang': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    region: { enabled: false },
  },
} as const;

function setCustomFields(fields: Record<string, unknown> | undefined) {
  __setMockDocusaurusContext({
    siteConfig: { customFields: fields },
  });
}

/**
 * Mount the banner, flushing the mount effect (which reads consent and flips
 * `ready`) inside `act` so the effect's state updates are not flagged.
 */
function renderBanner() {
  let utils: ReturnType<typeof render>;
  act(() => {
    utils = render(<CookieConsent />);
  });
  return utils!;
}

describe('CookieConsent', () => {
  beforeEach(() => {
    setCustomFields({ gaMeasurementId: GA_ID, clarityProjectId: CLARITY_ID });
    clearConsent();
    mockedInit.mockClear();
  });

  afterEach(() => {
    __resetMockDocusaurusContext();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders the banner when no consent has been recorded', () => {
      renderBanner();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /accept analytics/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reject analytics/i }),
      ).toBeInTheDocument();
    });

    it('does not render the banner once consent has already been recorded', () => {
      writeConsent('accepted');
      const { container } = renderBanner();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(container.innerHTML).toBe('');
    });

    it('links to the privacy policy', () => {
      renderBanner();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
        'href',
        '/privacy',
      );
    });
  });

  describe('accept', () => {
    it('persists the accepted choice to localStorage', () => {
      renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));

      expect(readConsent()?.analytics).toBe('accepted');
      const stored = JSON.parse(
        localStorage.getItem(CONSENT_STORAGE_KEY) || '{}',
      );
      expect(stored.analytics).toBe('accepted');
      expect(stored.version).toBe(1);
    });

    it('initialises analytics after accepting', () => {
      renderBanner();
      expect(mockedInit).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));

      expect(mockedInit).toHaveBeenCalled();
      expect(mockedInit).toHaveBeenCalledWith({
        gaMeasurementId: GA_ID,
        clarityProjectId: CLARITY_ID,
      });
    });

    it('hides the banner after accepting', () => {
      const { container } = renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(container.innerHTML).toBe('');
    });

    it('does not initialise analytics when no IDs are configured', () => {
      setCustomFields({});
      renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /accept analytics/i }));
      expect(mockedInit).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('persists the rejected choice to localStorage', () => {
      renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /reject analytics/i }));

      expect(readConsent()?.analytics).toBe('rejected');
      const stored = JSON.parse(
        localStorage.getItem(CONSENT_STORAGE_KEY) || '{}',
      );
      expect(stored.analytics).toBe('rejected');
    });

    it('does NOT initialise GA/Clarity after rejecting', () => {
      renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /reject analytics/i }));
      expect(mockedInit).not.toHaveBeenCalled();
    });

    it('hides the banner after rejecting', () => {
      const { container } = renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /reject analytics/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(container.innerHTML).toBe('');
    });
  });

  describe('consent loaded from storage on mount', () => {
    it('initialises analytics when a previous acceptance is restored', () => {
      writeConsent('accepted');
      renderBanner();
      expect(mockedInit).toHaveBeenCalled();
    });

    it('does NOT initialise analytics when a previous rejection is restored', () => {
      writeConsent('rejected');
      renderBanner();
      expect(mockedInit).not.toHaveBeenCalled();
    });
  });
});

describe('CookieConsent accessibility (jest-axe)', () => {
  beforeEach(() => {
    setCustomFields({ gaMeasurementId: GA_ID, clarityProjectId: CLARITY_ID });
    clearConsent();
    mockedInit.mockClear();
  });

  afterEach(() => {
    __resetMockDocusaurusContext();
  });

  it('has no axe violations on the banner', async () => {
    const { container } = renderBanner();
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });
});
