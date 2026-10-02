import React from 'react';
import { useLocation } from '@docusaurus/router';
import { useBookmarks } from '../../hooks/useBookmarks';
import styles from './BookmarkButton.module.css';

interface BookmarkButtonProps {
  path?: string;
  className?: string;
}

export function BookmarkButton({ path, className }: BookmarkButtonProps) {
  const { pathname } = useLocation();
  const currentPath = path ?? pathname;
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const active = isBookmarked(currentPath);

  return (
    <button
      type="button"
      className={[styles.bookmarkButton, active ? styles.active : null, className]
        .filter(Boolean)
        .join(' ')}
      onClick={() => toggleBookmark(currentPath)}
      aria-pressed={active}
      aria-label={active ? 'Remove bookmark' : 'Add bookmark'}
      title={active ? 'Remove bookmark' : 'Add bookmark'}>
      {active ? '✓ Saved' : '☆ Bookmark'}
    </button>
  );
}
