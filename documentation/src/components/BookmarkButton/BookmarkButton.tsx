import React from 'react';
import { useLocation } from '@docusaurus/router';
import { useBookmarks } from '../../hooks/useBookmarks';
import styles from './BookmarkButton.module.css';

export function BookmarkButton(props: { path?: string; className?: string }) {
interface BookmarkButtonProps {
  path?: string;
  className?: string;
}

export function BookmarkButton({ path, className }: BookmarkButtonProps) {
  const { pathname } = useLocation();
  const currentPath = path ?? pathname;
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const a = isBookmarked(p);
  return (
    <button
      type="button"
      className={styles.bookmarkButton + (a ? ' ' + styles.active : '') + (props.className ? ' ' + props.className : '')}
      onClick={() => toggleBookmark(p)}
      aria-pressed={a}>
      { a ? 'Saved' : 'Bookmark' }
      className={
        styles.bookmarkButton +
        (a ? ' ' + styles.active : '') +
        (props.className ? ' ' + props.className : '')
      }
      onClick={() => toggleBookmark(p)}
      aria-pressed={a}>
      {a ? '\u2560 Saved' : '\u2714 Bookmark'}
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
