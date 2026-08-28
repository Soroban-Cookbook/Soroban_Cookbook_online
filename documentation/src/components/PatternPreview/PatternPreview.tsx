import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import PatternCard from '../cards/PatternCard';
import styles from './PatternPreview.module.css';
import { sanitizeUrl } from '@site/src/utils/sanitizeUrl';
import {
  usePatternFilter,
  CATEGORY_OPTIONS,
  type CategoryValue,
} from '@site/src/hooks/usePatternFilter';

export interface Pattern {
  id: string;
  contractName: string;
  description: string;
  tag: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number;
  code: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PatternPreviewProps {
  patterns: Pattern[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  maxVisible?: number;
  enableCarousel?: boolean;
}

export default function PatternPreview({
  patterns,
  title = 'Popular Patterns',
  subtitle = 'Explore production-ready smart contract patterns',
  showViewAll = true,
  viewAllHref = '/docs/category/patterns',
  maxVisible = 6,
  enableCarousel = true,
}: PatternPreviewProps) {
  const { filters, setCategory, applyFilters } = usePatternFilter();
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredPatterns = applyFilters(patterns);

  const displayPatterns =
    enableCarousel && viewMode === 'carousel'
      ? filteredPatterns.slice(currentIndex, currentIndex + maxVisible)
      : filteredPatterns.slice(0, maxVisible);

  const canGoNext =
    enableCarousel &&
    viewMode === 'carousel' &&
    currentIndex + maxVisible < filteredPatterns.length;
  const canGoPrev = enableCarousel && viewMode === 'carousel' && currentIndex > 0;

  const handleNext = () => {
    if (!canGoNext || isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handlePrev = () => {
    if (!canGoPrev || isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const _handlePatternClick = (pattern: Pattern) => {
    if (pattern.href) {
      const safe = sanitizeUrl(pattern.href);
      if (safe !== '#') {
        window.location.href = safe;
      }
    }
  };

  // Reset carousel index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [filters.category]);

  return (
    <section className={styles.patternPreview}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {/* View Mode Toggle */}
          {enableCarousel && (
            <div className={styles.viewToggle}>
              <button
                className={clsx(styles.toggleBtn, viewMode === 'carousel' && styles.active)}
                onClick={() => setViewMode('carousel')}
                aria-label="Carousel view"
                aria-pressed={viewMode === 'carousel'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 19h10V5H7v14zm0-16c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H7z" />
                </svg>
              </button>
              <button
                className={clsx(styles.toggleBtn, viewMode === 'grid' && styles.active)}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className={styles.filterContainer}>
          <div className={styles.categoryFilter}>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                className={clsx(styles.categoryBtn, filters.category === value && styles.active)}
                onClick={() => setCategory(value as CategoryValue)}
                aria-pressed={filters.category === value}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern Display */}
        <div className={styles.patternsWrapper}>
          {enableCarousel && viewMode === 'carousel' && (
            <button
              className={clsx(styles.navBtn, styles.prevBtn, !canGoPrev && styles.disabled)}
              onClick={handlePrev}
              disabled={!canGoPrev}
              aria-label="Previous patterns">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
          )}

          <div
            className={clsx(
              styles.patternsContainer,
              viewMode === 'grid' ? styles.gridLayout : styles.carouselLayout,
              isAnimating && styles.animating,
            )}
            ref={carouselRef}>
            {displayPatterns.map((pattern, index) => (
              <div
                key={pattern.id}
                className={styles.patternCardWrapper}
                style={
                  {
                    '--animation-delay': `${index * 50}ms`,
                  } as React.CSSProperties
                }>
                <PatternCard
                  contractName={pattern.contractName}
                  description={pattern.description}
                  tag={pattern.tag}
                  code={pattern.code}
                  href={pattern.href ? sanitizeUrl(pattern.href) : undefined}
                  icon={pattern.icon}
                />

                {/* Metadata */}
                <div className={styles.metadata}>
                  <div className={styles.metadataRow}>
                    <span className={styles.difficulty} data-difficulty={pattern.difficulty}>
                      {pattern.difficulty}
                    </span>
                    <span className={styles.popularity}>
                      {'⭐'.repeat(Math.ceil(pattern.popularity / 20))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {enableCarousel && viewMode === 'carousel' && (
            <button
              className={clsx(styles.navBtn, styles.nextBtn, !canGoNext && styles.disabled)}
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next patterns">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
          )}
        </div>

        {/* View All CTA */}
        {showViewAll && (
          <div className={styles.ctaContainer}>
            <a href={viewAllHref} className={styles.viewAllBtn}>
              View All Patterns
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </a>
          </div>
        )}

        {/* Pattern Counter */}
        <div className={styles.counter}>
          Showing {displayPatterns.length} of {filteredPatterns.length} patterns
        </div>
      </div>
    </section>
  );
}
