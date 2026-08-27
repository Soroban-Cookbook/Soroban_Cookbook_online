/**
 * Unit tests for src/utils/searchAnalytics.ts — Phase 5 (issue #329)
 *
 * Covers:
 *  - sanitizeSearchTerm: normalisation, PII stripping, length guard
 *  - onQuery: delegates to trackSearch with correct args
 *  - onResult: delegates to trackSearch; fires no_results branch
 *  - debounce: delays execution, resets on repeated calls
 *  - createDebouncedOnQuery: factory returns a working debounced handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock analytics.ts so tests don't require window.gtag ─────────────────────
vi.mock('../analytics', () => ({
  trackSearch: vi.fn(),
}));

import { trackSearch } from '../analytics';
import {
  sanitizeSearchTerm,
  onQuery,
  onResult,
  debounce,
  createDebouncedOnQuery,
  MIN_QUERY_LENGTH,
  QUERY_DEBOUNCE_MS,
} from '../searchAnalytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockTrackSearch(): ReturnType<typeof vi.fn> {
  return vi.mocked(trackSearch);
}

// ─── sanitizeSearchTerm ───────────────────────────────────────────────────────

describe('sanitizeSearchTerm', () => {
  describe('normalisation', () => {
    it('trims leading and trailing whitespace', () => {
      expect(sanitizeSearchTerm('  soroban  ')).toBe('soroban');
    });

    it('collapses internal whitespace runs to a single space', () => {
      expect(sanitizeSearchTerm('invoke  contract')).toBe('invoke contract');
    });

    it('lowercases the term', () => {
      expect(sanitizeSearchTerm('Soroban SDK')).toBe('soroban sdk');
    });

    it('combines trim + collapse + lowercase', () => {
      expect(sanitizeSearchTerm('  Deploy  Contract  ')).toBe('deploy contract');
    });
  });

  describe('PII stripping', () => {
    it('replaces an email address with <email>', () => {
      const result = sanitizeSearchTerm('hello@example.com soroban');
      expect(result).toBe('<email> soroban');
    });

    it('replaces a long hex token (>= 32 chars) with <token>', () => {
      const token = 'a'.repeat(32);
      const result = sanitizeSearchTerm(`key ${token} value`);
      expect(result).toBe('key <token> value');
    });

    it('does not strip a short hex string (< 32 chars)', () => {
      const shortHex = 'deadbeef';
      expect(sanitizeSearchTerm(shortHex)).toBe(shortHex);
    });

    it('replaces long decimal numbers (>= 10 digits)', () => {
      const result = sanitizeSearchTerm('account 1234567890123');
      expect(result).toBe('account <number>');
    });

    it('does not strip short numbers (< 10 digits)', () => {
      expect(sanitizeSearchTerm('timeout 30')).toBe('timeout 30');
    });

    it('strips multiple PII occurrences in one term', () => {
      const longHex = 'b'.repeat(32);
      const result = sanitizeSearchTerm(`${longHex} admin@example.com token`);
      expect(result).toBe('<token> <email> token');
    });
  });

  describe('minimum length guard', () => {
    it('returns null for a single character', () => {
      expect(sanitizeSearchTerm('a')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(sanitizeSearchTerm('')).toBeNull();
    });

    it('returns null for whitespace-only input', () => {
      expect(sanitizeSearchTerm('   ')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(sanitizeSearchTerm(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(sanitizeSearchTerm(undefined)).toBeNull();
    });

    it(`returns a term of exactly ${MIN_QUERY_LENGTH} chars`, () => {
      const twoChar = 'ab';
      expect(sanitizeSearchTerm(twoChar)).toBe(twoChar);
    });
  });
});

// ─── onQuery ─────────────────────────────────────────────────────────────────

describe('onQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls trackSearch with the normalised term and sentinel -1', () => {
    onQuery('Soroban SDK');
    expect(mockTrackSearch()).toHaveBeenCalledOnce();
    expect(mockTrackSearch()).toHaveBeenCalledWith('soroban sdk', -1);
  });

  it('does not call trackSearch for a too-short term', () => {
    onQuery('a');
    expect(mockTrackSearch()).not.toHaveBeenCalled();
  });

  it('does not call trackSearch for null', () => {
    onQuery(null);
    expect(mockTrackSearch()).not.toHaveBeenCalled();
  });

  it('does not call trackSearch for undefined', () => {
    onQuery(undefined);
    expect(mockTrackSearch()).not.toHaveBeenCalled();
  });

  it('strips PII before sending the term', () => {
    onQuery('admin@stellar.org deploy');
    expect(mockTrackSearch()).toHaveBeenCalledWith('<email> deploy', -1);
  });
});

// ─── onResult ────────────────────────────────────────────────────────────────

describe('onResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls trackSearch with the normalised term and result count', () => {
    onResult('smart contract', 5);
    expect(mockTrackSearch()).toHaveBeenCalledOnce();
    expect(mockTrackSearch()).toHaveBeenCalledWith('smart contract', 5);
  });

  it('calls trackSearch with 0 results for a failed search', () => {
    onResult('xyzzy not found query', 0);
    expect(mockTrackSearch()).toHaveBeenCalledWith('xyzzy not found query', 0);
  });

  it('does not call trackSearch for a too-short term', () => {
    onResult('x', 3);
    expect(mockTrackSearch()).not.toHaveBeenCalled();
  });

  it('normalises whitespace in the term before tracking', () => {
    onResult('  invoke   contract  ', 2);
    expect(mockTrackSearch()).toHaveBeenCalledWith('invoke contract', 2);
  });

  it('strips PII before tracking', () => {
    const longHex = 'c'.repeat(40);
    onResult(longHex, 0);
    expect(mockTrackSearch()).toHaveBeenCalledWith('<token>', 0);
  });
});

// ─── debounce ─────────────────────────────────────────────────────────────────

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays invocation by the specified wait time', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('first');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('first');
  });

  it('resets the timer on repeated calls (only last call fires)', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced('first');
    vi.advanceTimersByTime(150);
    debounced('second');
    vi.advanceTimersByTime(150);

    // Timer reset; fn should not have been called yet
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('fires immediately if only one call is made and full wait elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('ping');
    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── createDebouncedOnQuery ───────────────────────────────────────────────────

describe('createDebouncedOnQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a function', () => {
    expect(typeof createDebouncedOnQuery()).toBe('function');
  });

  it(`uses ${QUERY_DEBOUNCE_MS}ms debounce and calls trackSearch on settle`, () => {
    const debouncedOnQuery = createDebouncedOnQuery();

    debouncedOnQuery('soroban');
    expect(mockTrackSearch()).not.toHaveBeenCalled();

    vi.advanceTimersByTime(QUERY_DEBOUNCE_MS);
    expect(mockTrackSearch()).toHaveBeenCalledOnce();
    expect(mockTrackSearch()).toHaveBeenCalledWith('soroban', -1);
  });

  it('fires only for the last term when called rapidly', () => {
    const debouncedOnQuery = createDebouncedOnQuery();

    debouncedOnQuery('s'); // too short → will be no-op even if it fires
    debouncedOnQuery('so');
    debouncedOnQuery('sor');
    debouncedOnQuery('sorob');
    debouncedOnQuery('soroban');

    vi.runAllTimers();

    // Only the final settled value should reach trackSearch
    expect(mockTrackSearch()).toHaveBeenCalledOnce();
    expect(mockTrackSearch()).toHaveBeenCalledWith('soroban', -1);
  });

  it('does not fire for an empty query', () => {
    const debouncedOnQuery = createDebouncedOnQuery();

    debouncedOnQuery('');
    vi.runAllTimers();

    expect(mockTrackSearch()).not.toHaveBeenCalled();
  });
});
