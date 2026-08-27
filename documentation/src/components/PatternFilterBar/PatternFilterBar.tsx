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
