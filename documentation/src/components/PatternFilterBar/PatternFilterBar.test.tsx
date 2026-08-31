import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatternFilterBar, {
  readQueryTags,
  readQueryDifficulty,
  writeQuery,
} from './PatternFilterBar';
import type { PatternFilterItem } from './PatternFilterBar';

const fixtures: PatternFilterItem[] = [
  { id: '1', title: 'Token Transfer', difficulty: 'beginner', tags: ['token', 'storage'] },
  { id: '2', title: 'DEX Swap', difficulty: 'advanced', tags: ['defi', 'token'] },
  { id: '3', title: 'Access Control', difficulty: 'intermediate', tags: ['auth', 'security'] },
  { id: '4', title: 'Voting', difficulty: 'beginner', tags: ['governance'] },
];

describe('PatternFilterBar', () => {
  it('renders difficulty filter chips', () => {
    render(<PatternFilterBar patterns={fixtures} />);
    expect(screen.getByRole('button', { name: 'Beginner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
  });

  it('renders tag chips extracted from patterns', () => {
    render(<PatternFilterBar patterns={fixtures} />);
    expect(screen.getByRole('button', { name: 'token' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'defi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auth' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'governance' })).toBeInTheDocument();
  });

  it('calls onFilterChange with all patterns when no filters active', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    expect(onFilterChange).toHaveBeenCalledWith(fixtures);
  });

  it('filters by difficulty when a chip is clicked', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toHaveLength(2);
    expect(filtered.every((p: PatternFilterItem) => p.difficulty === 'beginner')).toBe(true);
  });

  it('filters by tag when a tag chip is clicked', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'defi' }));
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('combines difficulty and tag filters', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    fireEvent.click(screen.getByRole('button', { name: 'token' }));
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('shows reset button when filters are active and clears on click', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    const resetBtn = screen.getByRole('button', { name: 'Reset all filters' });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toEqual(fixtures);
  });

  it('does not show reset button when no filters are active', () => {
    render(<PatternFilterBar patterns={fixtures} />);
    expect(screen.queryByRole('button', { name: 'Reset all filters' })).not.toBeInTheDocument();
  });

  it('applies active class to selected difficulty chip', () => {
    render(<PatternFilterBar patterns={fixtures} />);
    const btn = screen.getByRole('button', { name: 'Beginner' });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies active class to selected tag chip', () => {
    render(<PatternFilterBar patterns={fixtures} />);
    const btn = screen.getByRole('button', { name: 'token' });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles difficulty chip off on second click', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toEqual(fixtures);
  });

  it('applies custom className', () => {
    const { container } = render(
      <PatternFilterBar patterns={fixtures} className="custom-filter" />,
    );
    expect(container.firstChild).toHaveClass('custom-filter');
  });
});

describe('URL query sync helpers', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('readQueryTags parses tags from URL', () => {
    window.history.replaceState({}, '', '/?tags=token,defi');
    expect(readQueryTags()).toEqual(['token', 'defi']);
  });

  it('readQueryTags returns empty array when no tags param', () => {
    expect(readQueryTags()).toEqual([]);
  });

  it('readQueryDifficulty parses difficulty from URL', () => {
    window.history.replaceState({}, '', '/?difficulty=beginner,advanced');
    expect(readQueryDifficulty()).toEqual(['beginner', 'advanced']);
  });

  it('readQueryDifficulty returns empty array when no difficulty param', () => {
    expect(readQueryDifficulty()).toEqual([]);
  });

  it('writeQuery updates the URL', () => {
    writeQuery(['token'], ['beginner']);
    const params = new URLSearchParams(window.location.search);
    expect(params.get('tags')).toBe('token');
    expect(params.get('difficulty')).toBe('beginner');
  });

  it('writeQuery removes params when empty', () => {
    writeQuery(['token'], ['beginner']);
    writeQuery([], []);
    expect(window.location.search).toBe('');
  });
});

describe('PatternFilterBar with URL sync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?difficulty=beginner');
  });

  it('initialises filters from URL query params when syncWithQuery is true', () => {
    const onFilterChange = vi.fn();
    render(<PatternFilterBar patterns={fixtures} onFilterChange={onFilterChange} syncWithQuery />);
    const filtered = onFilterChange.mock.calls.at(-1)[0];
    expect(filtered).toHaveLength(2);
    expect(filtered.every((p: PatternFilterItem) => p.difficulty === 'beginner')).toBe(true);
  });
});
