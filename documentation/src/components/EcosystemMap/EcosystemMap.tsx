// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

/**
 * EcosystemMap.tsx
 *
 * Interactive Soroban ecosystem map component for the documentation site.
 *
 * Features:
 *   - Category filter tabs (All + one per category)
 *   - Full-text search across name + description + tags
 *   - Project cards with external links, status badges, and Cookbook highlight
 *   - Accessible: keyboard-navigable, ARIA labels, sr-only text
 *   - Responsive: single-column on mobile, 2–3 columns on desktop
 *   - Last-updated footer with maintenance instructions link
 */

import React, { useState, useMemo, useId } from 'react';
import {
  ECOSYSTEM_CATEGORIES,
  ECOSYSTEM_LAST_UPDATED,
  type EcosystemEntry,
  type EcosystemCategory,
  type ProjectStatus,
} from '../../data/ecosystemData';
import styles from './EcosystemMap.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────

function statusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'beta':
      return 'Beta';
    case 'inactive':
      return 'Inactive';
    case 'proposed':
      return 'Proposed';
  }
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
}

function entryMatchesQuery(entry: EcosystemEntry, query: string): boolean {
  if (!query) return true;
  const q = normalise(query);
  return (
    normalise(entry.name).includes(q) ||
    normalise(entry.description).includes(q) ||
    (entry.tags ?? []).some((t) => normalise(t).includes(q))
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: EcosystemEntry;
}

function EntryCard({ entry }: EntryCardProps) {
  const isProposed = entry.status === 'proposed';

  return (
    <article
      className={`${styles.card} ${entry.isCookbook ? styles.cardCookbook : ''} ${entry.status !== 'active' ? styles.cardDimmed : ''}`}
      aria-label={`${entry.name}${entry.isCookbook ? ' — this project' : ''}`}
    >
      {/* Cookbook highlight ribbon */}
      {entry.isCookbook && (
        <span className={styles.cookbookRibbon} aria-label="This is the Soroban Cookbook">
          📖 This project
        </span>
      )}

      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{entry.name}</h3>
        <span
          className={`${styles.statusBadge} ${styles[`status_${entry.status}`]}`}
          aria-label={`Status: ${statusLabel(entry.status)}`}
        >
          {statusLabel(entry.status)}
        </span>
      </div>

      <p className={styles.cardDescription}>{entry.description}</p>

      {entry.tags && entry.tags.length > 0 && (
        <ul className={styles.tagList} aria-label="Tags">
          {entry.tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.cardLinks}>
        {!isProposed && entry.url && (
          <a
            href={entry.url}
            className={styles.linkPrimary}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${entry.name} (opens in new tab)`}
          >
            Visit ↗
          </a>
        )}
        {entry.docsUrl && (
          <a
            href={entry.docsUrl}
            className={styles.linkDocs}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${entry.name} documentation (opens in new tab)`}
          >
            Docs ↗
          </a>
        )}
        {isProposed && (
          <span className={styles.proposedNote}>Not yet available</span>
        )}
      </div>

      <p className={styles.lastVerified}>
        <span className="sr-only">Last verified: </span>
        Verified {entry.lastVerified}
      </p>
    </article>
  );
}

interface CategorySectionProps {
  category: EcosystemCategory;
  filteredItems: EcosystemEntry[];
}

function CategorySection({ category, filteredItems }: CategorySectionProps) {
  return (
    <section
      aria-labelledby={`category-${category.id}`}
      className={styles.categorySection}
    >
      <header className={styles.categoryHeader}>
        <span className={styles.categoryIcon} aria-hidden="true">
          {category.icon}
        </span>
        <h2 id={`category-${category.id}`} className={styles.categoryTitle}>
          {category.label}
        </h2>
      </header>
      <p className={styles.categoryDescription}>{category.description}</p>

      {filteredItems.length === 0 ? (
        <p className={styles.emptyCategory}>No entries match the current filter.</p>
      ) : (
        <div className={styles.cardGrid} role="list">
          {filteredItems.map((entry) => (
            <div key={entry.id} role="listitem">
              <EntryCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EcosystemMap() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchId = useId();

  const visibleCategories = useMemo(() => {
    return ECOSYSTEM_CATEGORIES.filter(
      (cat) => selectedCategory === 'all' || cat.id === selectedCategory,
    ).map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => entryMatchesQuery(item, searchQuery)),
    }));
  }, [selectedCategory, searchQuery]);

  const totalVisible = useMemo(
    () => visibleCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [visibleCategories],
  );

  const totalAll = useMemo(
    () => ECOSYSTEM_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0),
    [],
  );

  return (
    <div className={styles.container}>
      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className={styles.controls}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <label htmlFor={searchId} className={styles.searchLabel}>
            Search ecosystem
          </label>
          <input
            id={searchId}
            type="search"
            className={styles.searchInput}
            placeholder="Search by name, description, or tag…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search Soroban ecosystem projects"
          />
          {searchQuery && (
            <button
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Category filter tabs */}
        <nav className={styles.filterNav} aria-label="Filter by category">
          <button
            className={`${styles.filterTab} ${selectedCategory === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setSelectedCategory('all')}
            aria-pressed={selectedCategory === 'all'}
          >
            All
            <span className={styles.filterCount} aria-hidden="true">
              {totalAll}
            </span>
          </button>
          {ECOSYSTEM_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.filterTab} ${selectedCategory === cat.id ? styles.filterTabActive : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={selectedCategory === cat.id}
            >
              <span aria-hidden="true">{cat.icon}</span> {cat.label}
              <span className={styles.filterCount} aria-hidden="true">
                {cat.items.length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Results summary ───────────────────────────────────────── */}
      <p className={styles.resultsSummary} aria-live="polite" aria-atomic="true">
        {searchQuery
          ? `${totalVisible} of ${totalAll} entries match "${searchQuery}"`
          : `Showing ${totalVisible} entries`}
      </p>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {totalVisible === 0 && (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon} aria-hidden="true">🔍</span>
          <p>No projects match <strong>"{searchQuery}"</strong>.</p>
          <button className={styles.clearSearchBtn} onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </div>
      )}

      {/* ── Category sections ─────────────────────────────────────── */}
      {visibleCategories.map((cat) =>
        cat.items.length > 0 || !searchQuery ? (
          <CategorySection
            key={cat.id}
            category={cat}
            filteredItems={cat.items}
          />
        ) : null,
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className={styles.mapFooter}>
        <p>
          Data last reviewed: <strong>{ECOSYSTEM_LAST_UPDATED}</strong>
          {' · '}
          <a
            href="https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/edit/main/documentation/src/data/ecosystemData.ts"
            target="_blank"
            rel="noopener noreferrer"
          >
            Suggest an update ↗
          </a>
          {' · '}
          <a href="/docs/ecosystem-map#maintenance">Maintenance guide</a>
        </p>
        <p className={styles.disclaimer}>
          Links verified as of the date shown on each entry. The Soroban Cookbook
          does not endorse any project listed here. Do your own research before
          using any third-party service with real funds.
        </p>
      </footer>
    </div>
  );
}
