import React from 'react';
import { useLocation } from '@docusaurus/router';
import { useBookmarks } from '../../hooks/useBookmarks';
import styles from './BookmarkButton.module.css';
export function BookmarkButton(props: any) {
  const { pathname } = useLocation();
  const p = props.path || pathname;
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const a = isBookmarked(p);
  return < button
    type="button"
    className={styles.bookmarkButton + (a ? ' ' + styles.active : '') + (props.className ? ' ' + props.className : '')}
    onClick={() => toggleBookmark(p)}
    aria-pressed={a}
  {>
    { a ? '╠ Saved' : '✔ Bookmark' }
  </button>
}
