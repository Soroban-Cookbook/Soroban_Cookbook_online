/**
 * Tests for usePatternFilter's free-text search filter (issue #1538).
 *
 * Covers case sensitivity, matching against contractName vs. description,
 * special regex characters (search is plain substring matching, so these
 * must not throw), and the empty-search passthrough case.
 */
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePatternFilter } from './usePatternFilter';
import type { Pattern } from '../components/PatternPreview';

function makePattern(overrides: Partial<Pattern>): Pattern {
  return {
    id: 'p1',
    contractName: 'TokenVault',
    description: 'A simple storage pattern',
    tag: '#storage',
    category: 'storage',
    difficulty: 'beginner',
    popularity: 1,
    code: '',
    ...overrides,
  };
}

describe('usePatternFilter — free-text search', () => {
  it('matches case-insensitively', () => {
    const patterns = [makePattern({ id: 'p1', contractName: 'TokenVault' })];
    const { result } = renderHook(() => usePatternFilter());

    act(() => result.current.setSearch('tokenvault'));
    expect(result.current.applyFilters(patterns)).toEqual(patterns);

    act(() => result.current.setSearch('TOKENVAULT'));
    expect(result.current.applyFilters(patterns)).toEqual(patterns);
  });

  it('matches contractName but not description when only the name contains the term', () => {
    const matchByName = makePattern({
      id: 'p1',
      contractName: 'Escrow',
      description: 'Holds funds until release',
    });
    const noMatch = makePattern({
      id: 'p2',
      contractName: 'Vault',
      description: 'Simple deposit storage',
    });
    const { result } = renderHook(() => usePatternFilter());

    act(() => result.current.setSearch('escrow'));

    expect(result.current.applyFilters([matchByName, noMatch])).toEqual([matchByName]);
  });

  it('does not throw on special regex characters and returns no matches when absent', () => {
    const patterns = [makePattern({ id: 'p1', contractName: 'TokenVault' })];
    const { result } = renderHook(() => usePatternFilter());

    act(() => result.current.setSearch('token(vault)+[test]*'));

    expect(() => result.current.applyFilters(patterns)).not.toThrow();
    expect(result.current.applyFilters(patterns)).toEqual([]);
  });

  it('returns all results for an empty search string', () => {
    const patterns = [
      makePattern({ id: 'p1', contractName: 'TokenVault' }),
      makePattern({ id: 'p2', contractName: 'Escrow' }),
    ];
    const { result } = renderHook(() => usePatternFilter());

    act(() => result.current.setSearch(''));

    expect(result.current.applyFilters(patterns)).toEqual(patterns);
  });
});
