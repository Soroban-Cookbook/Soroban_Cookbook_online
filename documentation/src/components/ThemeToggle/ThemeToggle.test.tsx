import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
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
