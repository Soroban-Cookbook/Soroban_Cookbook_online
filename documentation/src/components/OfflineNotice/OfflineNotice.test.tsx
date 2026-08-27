import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineNotice from './OfflineNotice';

describe('OfflineNotice (#350)', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });

  it('is hidden while online', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    render(<OfflineNotice />);
    expect(screen.queryByTestId('offline-notice')).not.toBeInTheDocument();
  });

  it('shows a polite status banner when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
    render(<OfflineNotice />);
    const notice = screen.getByTestId('offline-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent(/you are offline/i);
  });

  it('toggles when online/offline events fire', () => {
    let online = true;
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });

    render(<OfflineNotice />);
    expect(screen.queryByTestId('offline-notice')).not.toBeInTheDocument();

    act(() => {
      online = false;
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-notice')).toBeInTheDocument();

    act(() => {
      online = true;
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByTestId('offline-notice')).not.toBeInTheDocument();
  });
});
