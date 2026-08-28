import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  __setMockDocusaurusContext,
  __resetMockDocusaurusContext,
} from '../../test-mocks/useDocusaurusContext';

vi.mock('../../utils/csrf', () => ({
  getOrCreateCSRFToken: () => 'test-csrf-token',
  clearCSRFToken: vi.fn(),
  updateCSRFTokenFromResponse: vi.fn(),
}));

import NewsletterSignup, { NEWSLETTER_SUBMIT_COOLDOWN_MS } from './NewsletterSignup';

describe('NewsletterSignup rate limiting (#351)', () => {
  beforeEach(() => {
    __setMockDocusaurusContext({
      siteConfig: {
        customFields: {
          newsletterEndpoint: 'https://example.com/api/subscribe',
        },
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
      }),
    );
  });

  afterEach(() => {
    __resetMockDocusaurusContext();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('only sends one fetch when submit is clicked rapidly', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<NewsletterSignup />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });

    const form = screen.getByLabelText(/email address/i).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.({
      ok: true,
      status: 200,
      headers: { get: () => null },
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/thanks/i);
    });
  });

  it('blocks a second submit within the cooldown window', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<NewsletterSignup />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 500; // still inside cooldown
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/wait a few seconds/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += NEWSLETTER_SUBMIT_COOLDOWN_MS;
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows a specific message when the endpoint returns HTTP 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => null },
      }),
    );

    render(<NewsletterSignup />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/too many requests/i);
  });
});
