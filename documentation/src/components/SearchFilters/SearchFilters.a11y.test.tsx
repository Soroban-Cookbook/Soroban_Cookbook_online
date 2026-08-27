import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import SearchFilters from './SearchFilters';

/**
 * jsdom doesn't render a real <html lang="...">, <title>, or a top-level
 * <main> landmark around the component under test — so axe rules that look
 * at document-level structure will always trip. We disable them here. The
 * component itself is what's being audited.
 */
const AXE_OPTIONS = {
  runOnly: ['wcag2a', 'wcag2aa'],
  rules: {
    'html-has-lang': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    region: { enabled: false },
  },
} as const;

describe('SearchFilters accessibility (jest-axe)', () => {
  it('has no axe violations in the collapsed (initial) state', async () => {
    const { container } = render(<SearchFilters />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when the filter panel is expanded', async () => {
    const { container } = render(<SearchFilters />);
    fireEvent.click(screen.getByRole('button', { name: 'Show search filters' }));
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with one active filter', async () => {
    const { container } = render(<SearchFilters />);
    fireEvent.click(screen.getByRole('button', { name: 'Show search filters' }));
    fireEvent.click(screen.getByLabelText('Getting Started'));
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when multiple filters are active and Clear All is visible', async () => {
    const { container } = render(<SearchFilters />);
    fireEvent.click(screen.getByRole('button', { name: 'Show search filters' }));
    fireEvent.click(screen.getByLabelText('Core Concepts'));
    fireEvent.click(screen.getByLabelText('Intermediate'));
    fireEvent.click(screen.getByLabelText('Authorization'));
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it('exposes an accessible name on the filter toggle button that reflects the active count', () => {
    render(<SearchFilters />);
    const toggle = screen.getByRole('button', { name: 'Show search filters' });
    expect(toggle).toHaveAttribute('aria-label', 'Show search filters');

    fireEvent.click(toggle);
    fireEvent.click(screen.getByLabelText('Getting Started'));

    const updated = screen.getByRole('button', { name: /search filters/i });
    expect(updated).toHaveAttribute('aria-label', 'Hide search filters (1 active)');
    expect(updated).toHaveAttribute('aria-expanded', 'true');
  });

  it('each checkbox is wrapped by a <label> with visible text (implicit labelling)', () => {
    // The component uses implicit labelling (the <label> wraps the <input>),
    // which is a valid WCAG-recognised association. This test guards against
    // someone refactoring the JSX and accidentally detaching the label. The
    // panel must be open so the checkboxes are actually mounted in the DOM.
    const { container } = render(<SearchFilters />);
    fireEvent.click(screen.getByRole('button', { name: 'Show search filters' }));

    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
    checkboxes.forEach((checkbox) => {
      const label = checkbox.closest('label');
      expect(label, 'checkbox must be wrapped by a <label>').not.toBeNull();
      expect(label?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });
});
