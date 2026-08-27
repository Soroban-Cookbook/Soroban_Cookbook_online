import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchFilters from './SearchFilters';
import type { SearchFilterState } from './SearchFilters';

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('SearchFilters', () => {
  describe('initial render', () => {
    it('renders the filter toggle button', () => {
      render(<SearchFilters />);
      const toggle = screen.getByRole('button', { name: 'Show search filters' });
      expect(toggle).toBeInTheDocument();
    });

    it('shows "Filters" label on the toggle', () => {
      render(<SearchFilters />);
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('does not show the filter panel by default', () => {
      render(<SearchFilters />);
      expect(screen.queryByText('Category')).not.toBeInTheDocument();
    });

    it('toggle is collapsed (aria-expanded=false)', () => {
      render(<SearchFilters />);
      const toggle = screen.getByRole('button', { name: 'Show search filters' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ─── Expand / collapse ───────────────────────────────────────────────────

  describe('expand and collapse', () => {
    it('expands the filter panel on toggle click', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button', { name: 'Show search filters' }));
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Difficulty')).toBeInTheDocument();
      expect(screen.getByText('Topics')).toBeInTheDocument();
    });

    it('sets aria-expanded=true when opened', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses the filter panel on second toggle click', () => {
      render(<SearchFilters />);
      const toggle = screen.getByRole('button');
      fireEvent.click(toggle); // open
      fireEvent.click(toggle); // close
      expect(screen.queryByText('Category')).not.toBeInTheDocument();
    });

    it('aria-label updates when expanded', () => {
      render(<SearchFilters />);
      const toggle = screen.getByRole('button');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-label', 'Hide search filters');
    });
  });

  // ─── Category checkboxes ─────────────────────────────────────────────────

  describe('category filter interactions', () => {
    it('renders all category options when expanded', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByLabelText('Getting Started')).toBeInTheDocument();
      expect(screen.getByLabelText('Core Concepts')).toBeInTheDocument();
      expect(screen.getByLabelText('Patterns')).toBeInTheDocument();
      expect(screen.getByLabelText('Security')).toBeInTheDocument();
      expect(screen.getByLabelText('Components')).toBeInTheDocument();
    });

    it('checks a category checkbox on click', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText('Getting Started') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('unchecks a category checkbox on second click', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText('Getting Started') as HTMLInputElement;
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });

    it('allows selecting multiple categories', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      const gs = screen.getByLabelText('Getting Started') as HTMLInputElement;
      const cc = screen.getByLabelText('Core Concepts') as HTMLInputElement;
      fireEvent.click(gs);
      fireEvent.click(cc);
      expect(gs.checked).toBe(true);
      expect(cc.checked).toBe(true);
    });
  });

  // ─── Difficulty checkboxes ───────────────────────────────────────────────

  describe('difficulty filter interactions', () => {
    it('renders all difficulty options when expanded', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByLabelText('Beginner')).toBeInTheDocument();
      expect(screen.getByLabelText('Intermediate')).toBeInTheDocument();
      expect(screen.getByLabelText('Advanced')).toBeInTheDocument();
    });

    it('toggles a difficulty checkbox', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText('Beginner') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);
    });
  });

  // ─── Tag checkboxes ──────────────────────────────────────────────────────

  describe('tag filter interactions', () => {
    it('renders all tag options when expanded', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByLabelText('Authorization')).toBeInTheDocument();
      expect(screen.getByLabelText('Storage')).toBeInTheDocument();
      expect(screen.getByLabelText('Events')).toBeInTheDocument();
      expect(screen.getByLabelText('Optimization')).toBeInTheDocument();
      expect(screen.getByLabelText('Error Handling')).toBeInTheDocument();
    });

    it('toggles a tag checkbox', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      const checkbox = screen.getByLabelText('Authorization') as HTMLInputElement;
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  // ─── Active filter badge ─────────────────────────────────────────────────

  describe('active filter badge', () => {
    it('shows no badge when no filters are active', () => {
      render(<SearchFilters />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      // No badge element rendered at all
      const toggle = screen.getByRole('button');
      expect(toggle.querySelector('[class*="badge"]')).not.toBeInTheDocument();
    });

    it('shows badge with count 1 when one filter is active', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows badge with correct count when multiple filters are active', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));
      fireEvent.click(screen.getByLabelText('Beginner'));
      fireEvent.click(screen.getByLabelText('Authorization'));
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('aria-label reflects active filter count', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button', { name: /search filters/i }));
      fireEvent.click(screen.getByLabelText('Getting Started'));
      expect(screen.getByRole('button', { name: /search filters/i })).toHaveAttribute(
        'aria-label',
        'Hide search filters (1 active)',
      );
    });

    it('aria-label updates when opened with active filters', () => {
      render(<SearchFilters />);
      // Open the panel first
      fireEvent.click(screen.getByRole('button', { name: /search filters/i }));
      // Now activate a filter
      fireEvent.click(screen.getByLabelText('Getting Started'));
      // badge should be visible
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  // ─── Clear all ───────────────────────────────────────────────────────────

  describe('clear all button', () => {
    it('does not render clear button when no filters are active', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
    });

    it('renders clear button when filters are active', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));
      expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument();
    });

    it('clears all active filters on click', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started') as HTMLInputElement);
      fireEvent.click(screen.getByLabelText('Beginner') as HTMLInputElement);

      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

      expect((screen.getByLabelText('Getting Started') as HTMLInputElement).checked).toBe(false);
      expect((screen.getByLabelText('Beginner') as HTMLInputElement).checked).toBe(false);
    });

    it('hides clear button after clearing', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));
      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
      expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();
    });
  });

  // ─── onFilterChange callback ─────────────────────────────────────────────

  describe('onFilterChange callback', () => {
    it('calls onFilterChange when a category is toggled', () => {
      const handleChange = vi.fn();
      render(<SearchFilters onFilterChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));

      expect(handleChange).toHaveBeenCalledTimes(1);
      const state = handleChange.mock.calls[0][0] as SearchFilterState;
      expect(state.categories).toEqual(['getting-started']);
      expect(state.difficulty).toEqual([]);
      expect(state.tags).toEqual([]);
    });

    it('calls onFilterChange when a difficulty is toggled', () => {
      const handleChange = vi.fn();
      render(<SearchFilters onFilterChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Advanced'));

      const state = handleChange.mock.calls[0][0] as SearchFilterState;
      expect(state.difficulty).toEqual(['advanced']);
    });

    it('calls onFilterChange when a tag is toggled', () => {
      const handleChange = vi.fn();
      render(<SearchFilters onFilterChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Storage'));

      const state = handleChange.mock.calls[0][0] as SearchFilterState;
      expect(state.tags).toEqual(['storage']);
    });

    it('calls onFilterChange when clear all is clicked', () => {
      const handleChange = vi.fn();
      render(<SearchFilters onFilterChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByLabelText('Getting Started'));

      // Reset call count (already called once on the checkbox toggle)
      handleChange.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

      expect(handleChange).toHaveBeenCalledTimes(1);
      const state = handleChange.mock.calls[0][0] as SearchFilterState;
      expect(state.categories).toEqual([]);
      expect(state.difficulty).toEqual([]);
      expect(state.tags).toEqual([]);
    });

    it('does not call onFilterChange if not provided', () => {
      // Should not throw
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button'));
      expect(() => fireEvent.click(screen.getByLabelText('Getting Started'))).not.toThrow();
    });
  });

  // ─── Panel remains open when toggling filters ────────────────────────────

  describe('panel persistence', () => {
    it('keeps the panel open when filters are toggled', () => {
      render(<SearchFilters />);
      fireEvent.click(screen.getByRole('button')); // open
      fireEvent.click(screen.getByLabelText('Getting Started'));
      // Panel should still be visible
      expect(screen.getByText('Category')).toBeInTheDocument();
    });
  });
});
