import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import styles from './PatternFilterBar.module.css';

export interface PatternFilterItem {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface PatternFilterBarProps {
  patterns: PatternFilterItem[];
  onFilterChange?: (filtered: PatternFilterItem[]) => void;
  syncWithQuery?: boolean;
  className?: string;
}

const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function readQueryTags(): string[] {
  if (typeof window === 'undefined') return [];
  const params = new URLSearchParams(window.location.search);
  const tags = params.get('tags');
  return tags ? tags.split(',').filter(Boolean) : [];
}

export function readQueryDifficulty(): string[] {
  if (typeof window === 'undefined') return [];
  const params = new URLSearchParams(window.location.search);
  const diff = params.get('difficulty');
  return diff ? diff.split(',').filter(Boolean) : [];
}

export function writeQuery(tags: string[], difficulty: string[]) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (tags.length > 0) {
    params.set('tags', tags.join(','));
  } else {
    params.delete('tags');
  }
  if (difficulty.length > 0) {
    params.set('difficulty', difficulty.join(','));
  } else {
    params.delete('difficulty');
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', url);
}

export default function PatternFilterBar({
  patterns,
  onFilterChange,
  syncWithQuery = false,
  className,
}: PatternFilterBarProps) {
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(() =>
    syncWithQuery ? readQueryDifficulty() : [],
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    syncWithQuery ? readQueryTags() : [],
  );

  const allTags = Array.from(new Set(patterns.flatMap((p) => p.tags))).sort();

  const applyFilters = useCallback(
    (difficulties: string[], tags: string[]) => {
      const filtered = patterns.filter((p) => {
        const diffMatch = difficulties.length === 0 || difficulties.includes(p.difficulty);
        const tagMatch = tags.length === 0 || tags.some((t) => p.tags.includes(t));
        return diffMatch && tagMatch;
      });
      onFilterChange?.(filtered);
      if (syncWithQuery) {
        writeQuery(tags, difficulties);
      }
    },
    [patterns, onFilterChange, syncWithQuery],
  );

  useEffect(() => {
    applyFilters(selectedDifficulties, selectedTags);
  }, [selectedDifficulties, selectedTags, applyFilters]);

  const toggleDifficulty = (value: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const reset = () => {
    setSelectedDifficulties([]);
    setSelectedTags([]);
  };

  const hasActiveFilters = selectedDifficulties.length > 0 || selectedTags.length > 0;

  return (
    <div className={clsx(styles.filterBar, className)} role="search" aria-label="Filter patterns">
      <div className={styles.section}>
        <span className={styles.sectionLabel}>Difficulty</span>
        <div className={styles.chipGroup}>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={clsx(
                styles.chip,
                selectedDifficulties.includes(opt.value) && styles.active,
              )}
              onClick={() => toggleDifficulty(opt.value)}
              aria-pressed={selectedDifficulties.includes(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Tags</span>
          <div className={styles.chipGroup}>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={clsx(styles.chip, selectedTags.includes(tag) && styles.active)}
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          className={styles.resetBtn}
          onClick={reset}
          aria-label="Reset all filters">
          Reset
        </button>
      )}
/**
 * PatternFilterBar
 *
 * Horizontal filter bar for the patterns overview page.
 * Consumes the values and setters produced by usePatternFilter.
 *
 * Layout (desktop):  [Search input] [Category pills] [Difficulty select] [Tag toggles] [Clear]
 * Layout (mobile):   stacked rows, collapsible tags section
 */

import React, { useId } from 'react';
import clsx from 'clsx';
import {
  CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
  TAG_OPTIONS,
  type CategoryValue,
  type DifficultyValue,
  type TagValue,
  type PatternFilterState,
} from '@site/src/hooks/usePatternFilter';
import styles from './PatternFilterBar.module.css';

export interface PatternFilterBarProps {
  filters: PatternFilterState;
  setCategory: (v: CategoryValue) => void;
  setDifficulty: (v: DifficultyValue) => void;
  toggleTag: (v: TagValue) => void;
  setSearch: (v: string) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  /** Total patterns before filtering */
  totalCount: number;
  /** Patterns after filtering */
  filteredCount: number;
}

export default function PatternFilterBar({
  filters,
  setCategory,
  setDifficulty,
  toggleTag,
  setSearch,
  resetFilters,
  activeFilterCount,
  totalCount,
  filteredCount,
}: PatternFilterBarProps) {
  const searchId = useId();

  return (
    <div className={styles.filterBar} role="search" aria-label="Filter patterns">
      {/* ── Row 1: search + difficulty + clear ─────────────────────────── */}
      <div className={styles.topRow}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <label htmlFor={searchId} className={styles.srOnly}>
            Search patterns
          </label>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            id={searchId}
            type="search"
            className={styles.searchInput}
            placeholder="Search patterns…"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patterns"
          />
        </div>

        {/* Difficulty */}
        <select
          className={styles.difficultySelect}
          value={filters.difficulty}
          onChange={(e) => setDifficulty(e.target.value as DifficultyValue)}
          aria-label="Filter by difficulty">
          {DIFFICULTY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Clear button — only when filters are active */}
        {activeFilterCount > 0 && (
          <button
            className={styles.clearBtn}
            onClick={resetFilters}
            aria-label={`Clear ${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}>
            Clear
            <span className={styles.clearCount}>{activeFilterCount}</span>
          </button>
        )}
      </div>

      {/* ── Row 2: category pills ───────────────────────────────────────── */}
      <div className={styles.categoryRow} role="group" aria-label="Filter by category">
        {CATEGORY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            className={clsx(styles.categoryPill, filters.category === value && styles.active)}
            onClick={() => setCategory(value as CategoryValue)}
            aria-pressed={filters.category === value}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Row 3: tag toggles ──────────────────────────────────────────── */}
      <div className={styles.tagRow} role="group" aria-label="Filter by topic">
        <span className={styles.tagLabel} aria-hidden="true">
          Topics:
        </span>
        {TAG_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            className={clsx(
              styles.tagToggle,
              filters.tags.includes(value as TagValue) && styles.active,
            )}
            onClick={() => toggleTag(value as TagValue)}
            aria-pressed={filters.tags.includes(value as TagValue)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Result count ────────────────────────────────────────────────── */}
      <p className={styles.resultCount} aria-live="polite" aria-atomic="true">
        {activeFilterCount > 0
          ? `Showing ${filteredCount} of ${totalCount} patterns`
          : `${totalCount} patterns`}
      </p>
    </div>
  );
}
