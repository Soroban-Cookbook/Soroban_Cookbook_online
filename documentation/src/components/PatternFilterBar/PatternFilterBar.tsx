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
    </div>
  );
}
