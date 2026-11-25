import { useEffect, useState } from 'react';
import { safeLocalStorage } from '../utils/safeLocalStorage';

const K = 'bookmarks';

const read = (): string[] => {
  try {
    return JSON.parse(safeLocalStorage.getItem(K) || '[]');
  } catch {
    return [];
  }
};

/** Best-effort persist — `safeLocalStorage.setItem` reports failure instead of
 * throwing, and the caller already has the optimistic state, so the bookmark
 * list stays usable even when storage isn't. */
const write = (next: string[]): void => {
  safeLocalStorage.setItem(K, JSON.stringify(next));
};

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setBookmarks(read());
  }, []);

  const toggleBookmark = (path: string) =>
    setBookmarks((prev) => {
      const next = prev.includes(path) ? prev.filter((x) => x !== path) : [...prev, path];
      write(next);
      return next;
    });

  const removeBookmark = (path: string) =>
    setBookmarks((prev) => {
      const next = prev.filter((x) => x !== path);
      write(next);
      return next;
    });

  const clearBookmarks = () =>
    setBookmarks(() => {
      write([]);
      return [];
    });

  return {
    bookmarks,
    isBookmarked: (path: string) => bookmarks.includes(path),
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
