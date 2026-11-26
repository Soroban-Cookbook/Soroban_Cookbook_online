import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ThemeToggle, { getStoredTheme, initializeTheme, setStoredTheme } from './ThemeToggle';

const STORAGE_KEY = 'theme';

/** Make every localStorage method throw, the way a blocked-storage browser does. */
function blockStorage() {
  const thrower = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(thrower);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(thrower);
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('is accessible by role and name and reflects a stored light theme', () => {
    localStorage.setItem('theme', 'light');

    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('updates aria-pressed, localStorage, and data-theme when clicked', async () => {
    localStorage.setItem('theme', 'dark');
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: /switch to light mode/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('toggles with the keyboard using native button semantics', async () => {
    localStorage.setItem('theme', 'light');
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});

describe('ThemeToggle with storage unavailable', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    blockStorage();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders and falls back to the system preference when reading throws', () => {
    render(<ThemeToggle />);

    // Saving threw, so no preference is read; the system preference applies.
    const toggle = screen.getByRole('button', { name: /switch to (light|dark) mode/i });
    expect(toggle).toBeInTheDocument();
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'));
  });

  it('still switches theme for the current page view when writing throws', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = screen.getByRole('button', { name: /switch to (light|dark) mode/i });
    const before = document.documentElement.getAttribute('data-theme');

    await user.click(toggle);

    const after = document.documentElement.getAttribute('data-theme');
    expect(after).not.toBe(before);
    expect(toggle).toHaveAttribute('aria-pressed', String(after === 'dark'));
  });

  it('reports no stored theme instead of throwing', () => {
    expect(() => getStoredTheme()).not.toThrow();
    expect(getStoredTheme()).toBeNull();
  });

  it('applies the theme in setStoredTheme even when the write throws', () => {
    expect(() => setStoredTheme('light')).not.toThrow();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('initializes from the system preference when the saved theme cannot be read', () => {
    expect(() => initializeTheme()).not.toThrow();
    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'));
  });
});

describe('ThemeToggle storage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('keeps persisting normally when storage works', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: /switch to (light|dark) mode/i }));

    const applied = document.documentElement.getAttribute('data-theme');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(applied);
    expect(getStoredTheme()).toBe(applied);
  });
});
