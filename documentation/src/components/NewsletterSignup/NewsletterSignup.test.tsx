import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

import NewsletterSignup from './NewsletterSignup';

describe('NewsletterSignup', () => {
  beforeEach(() => {
    __setMockDocusaurusContext({
      siteConfig: {
        customFields: {
          newsletterEndpoint: undefined,
        },
      },
    });
  });

  afterEach(() => {
    __resetMockDocusaurusContext();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the signup form with heading, input, and button', () => {
    render(<NewsletterSignup />);
    expect(screen.getByRole('heading', { name: /stay in the loop/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('shows required error when submitting an empty email', () => {
    render(<NewsletterSignup />);
    const input = screen.getByRole('textbox', { name: /email address/i });

    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter an email address.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows format error when submitting an invalid email', () => {
    render(<NewsletterSignup />);
    const input = screen.getByRole('textbox', { name: /email address/i });

    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows success and clears the input on valid submission', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NewsletterSignup />);
    const input = screen.getByRole('textbox', { name: /email address/i });
    const button = screen.getByRole('button', { name: /subscribe/i });

    fireEvent.change(input, { target: { value: 'user@example.com' } });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Subscribing…');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/thanks.*you are on the list/i);
    });
    expect(input).toHaveValue('');
  });

  it('clears the error when the user starts typing again', () => {
    render(<NewsletterSignup />);
    const input = screen.getByRole('textbox', { name: /email address/i });

    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'a' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('connects aria-describedby to the error message when validation fails', () => {
    render(<NewsletterSignup />);
    const input = screen.getByRole('textbox', { name: /email address/i });

    expect(input).not.toHaveAttribute('aria-describedby');

    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Enter an email address.');
  });
});

describe('NewsletterSignup error states (#348)', () => {
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
    vi.clearAllMocks();
  });

  it('shows an alert when the email is empty', async () => {
    render(<NewsletterSignup />);

    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/enter an email address/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows an alert when the email is invalid', async () => {
    render(<NewsletterSignup />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/valid email address/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows a graceful error when the subscribe endpoint returns 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => null },
      }),
    );

    render(<NewsletterSignup />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
  });

  it('shows a graceful error when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<NewsletterSignup />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
  });

  it('shows success status when the endpoint accepts the subscription', async () => {
    render(<NewsletterSignup />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'tester@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/thanks/i);
    });
  });
});
