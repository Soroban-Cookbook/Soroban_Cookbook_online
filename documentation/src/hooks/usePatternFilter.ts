/**
 * usePatternFilter
 *
 * Shared hook that owns the filter state for pattern grids.
 * Consumed by PatternPreview (homepage carousel) and the patterns overview page.
 *
 * Filters applied (AND logic between groups, OR within a group):
 *  - category  — one of the CATEGORIES values, or 'all'
 *  - difficulty — 'all' | 'beginner' | 'intermediate' | 'advanced'
 *  - tags       — set of tag strings; a pattern matches if it shares ≥1 tag
 *  - search     — free-text match against contractName + description
 */

import { useState, useCallback, useMemo } from 'react';
import type { Pattern } from '../components/PatternPreview';

// ── Constants (exported so filter UI components stay in sync) ────────────────

export const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Patterns' },
  { value: 'storage', label: 'Storage' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'defi', label: 'DeFi' },
  { value: 'governance', label: 'Governance' },
  { value: 'nft', label: 'NFT' },
  { value: 'utility', label: 'Utility' },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export const TAG_OPTIONS = [
  { value: 'auth', label: 'Authorization' },
  { value: 'storage', label: 'Storage' },
  { value: 'events', label: 'Events' },
  { value: 'errors', label: 'Error Handling' },
  { value: 'optimization', label: 'Optimization' },
] as const;

export type CategoryValue = (typeof CATEGORY_OPTIONS)[number]['value'];
export type DifficultyValue = (typeof DIFFICULTY_OPTIONS)[number]['value'];
export type TagValue = (typeof TAG_OPTIONS)[number]['value'];

// ── Filter state ─────────────────────────────────────────────────────────────

export interface PatternFilterState {
  category: CategoryValue;
  difficulty: DifficultyValue;
  tags: TagValue[];
  search: string;
}

export const EMPTY_FILTER: PatternFilterState = {
  category: 'all',
  difficulty: 'all',
  tags: [],
  search: '',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UsePatternFilterReturn {
  filters: PatternFilterState;
  setCategory: (v: CategoryValue) => void;
  setDifficulty: (v: DifficultyValue) => void;
  toggleTag: (v: TagValue) => void;
  setSearch: (v: string) => void;
  resetFilters: () => void;
  /** Apply filters to a pattern array. Returns a new array — safe to memoize. */
  applyFilters: (patterns: Pattern[]) => Pattern[];
  activeFilterCount: number;
}

export function usePatternFilter(
  initial: Partial<PatternFilterState> = {},
): UsePatternFilterReturn {
  const [filters, setFilters] = useState<PatternFilterState>({
    ...EMPTY_FILTER,
    ...initial,
  });

  const setCategory = useCallback((category: CategoryValue) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setDifficulty = useCallback((difficulty: DifficultyValue) => {
    setFilters((prev) => ({ ...prev, difficulty }));
  }, []);

  const toggleTag = useCallback((tag: TagValue) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTER, ...initial });
  }, [initial]);

  const applyFilters = useCallback(
    (patterns: Pattern[]): Pattern[] => {
      return patterns.filter((p) => {
        // Category
        if (filters.category !== 'all' && p.category !== filters.category) return false;

        // Difficulty
        if (filters.difficulty !== 'all' && p.difficulty !== filters.difficulty) return false;

        // Tags — Pattern.tag is a single string like '#storage'.
        // We strip the '#' and check against each active tag filter.
        if (filters.tags.length > 0) {
          const patternTag = p.tag.replace(/^#/, '').toLowerCase();
          const hasTag = filters.tags.some((t) => patternTag === t || patternTag.includes(t));
          if (!hasTag) return false;
        }

        // Free-text search
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase();
          const inName = p.contractName.toLowerCase().includes(q);
          const inDesc = p.description.toLowerCase().includes(q);
          if (!inName && !inDesc) return false;
        }

        return true;
      });
    },
    [filters],
  );

  const activeFilterCount = useMemo(
    () =>
      (filters.category !== 'all' ? 1 : 0) +
      (filters.difficulty !== 'all' ? 1 : 0) +
      filters.tags.length +
      (filters.search.trim() ? 1 : 0),
    [filters],
  );

  return {
    filters,
    setCategory,
    setDifficulty,
    toggleTag,
    setSearch,
    resetFilters,
    applyFilters,
    activeFilterCount,
  };
}
