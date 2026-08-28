/**
 * SearchFilters
 * Advanced search filtering component with category, difficulty, and tag filters.
 * Emits filter state changes via callback for client-side result filtering.
 */

import { useState, useCallback } from 'react';
import React from 'react';
import styles from './SearchFilters.module.css';

export interface SearchFilterState {
  categories: string[];
  difficulty: string[];
  tags: string[];
}

interface SearchFiltersProps {
  onFilterChange?: (filters: SearchFilterState) => void;
}

const CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'concepts', label: 'Core Concepts' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'security', label: 'Security' },
  { id: 'components', label: 'Components' },
];

const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const COMMON_TAGS = [
  { id: 'auth', label: 'Authorization' },
  { id: 'storage', label: 'Storage' },
  { id: 'events', label: 'Events' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'errors', label: 'Error Handling' },
];

export default function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilterState>({
    categories: [],
    difficulty: [],
    tags: [],
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setFilters((prev) => {
        const updated = {
          ...prev,
          categories: prev.categories.includes(categoryId)
            ? prev.categories.filter((c) => c !== categoryId)
            : [...prev.categories, categoryId],
        };
        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange],
  );

  const handleDifficultyChange = useCallback(
    (diffId: string) => {
      setFilters((prev) => {
        const updated = {
          ...prev,
          difficulty: prev.difficulty.includes(diffId)
            ? prev.difficulty.filter((d) => d !== diffId)
            : [...prev.difficulty, diffId],
        };
        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange],
  );

  const handleTagChange = useCallback(
    (tagId: string) => {
      setFilters((prev) => {
        const updated = {
          ...prev,
          tags: prev.tags.includes(tagId)
            ? prev.tags.filter((t) => t !== tagId)
            : [...prev.tags, tagId],
        };
        onFilterChange?.(updated);
        return updated;
      });
    },
    [onFilterChange],
  );

  const handleClearAll = useCallback(() => {
    const cleared: SearchFilterState = {
      categories: [],
      difficulty: [],
      tags: [],
    };
    setFilters(cleared);
    onFilterChange?.(cleared);
  }, [onFilterChange]);

  const activeFilterCount =
    filters.categories.length + filters.difficulty.length + filters.tags.length;

  return (
    <div className={styles.filterContainer}>
      <button
        className={styles.filterToggle}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? `Hide search filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`
            : `Show search filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`
        }>
        <span className={styles.filterLabel}>Filters</span>
        {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
        <span className={styles.chevron}>▼</span>
      </button>

      {isExpanded && (
        <div className={styles.filterPanel}>
          {/* Categories */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterGroupLabel}>Category</legend>
            <div className={styles.checkboxGroup}>
              {CATEGORIES.map(({ id, label }) => (
                <label key={id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(id)}
                    onChange={() => handleCategoryChange(id)}
                    className={styles.checkbox}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Difficulty */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterGroupLabel}>Difficulty</legend>
            <div className={styles.checkboxGroup}>
              {DIFFICULTY_LEVELS.map(({ id, label }) => (
                <label key={id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.difficulty.includes(id)}
                    onChange={() => handleDifficultyChange(id)}
                    className={styles.checkbox}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Tags */}
          <fieldset className={styles.filterGroup}>
            <legend className={styles.filterGroupLabel}>Topics</legend>
            <div className={styles.checkboxGroup}>
              {COMMON_TAGS.map(({ id, label }) => (
                <label key={id} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(id)}
                    onChange={() => handleTagChange(id)}
                    className={styles.checkbox}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Clear button */}
          {activeFilterCount > 0 && (
            <button
              className={styles.clearButton}
              onClick={handleClearAll}
              aria-label="Clear all filters">
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
}
