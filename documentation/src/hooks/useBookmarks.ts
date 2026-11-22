import { useEffect, useState } from 'react';

const K = 'bookmarks';

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(K) || '[]');
  } catch {
    return [];
  }
};

/** Best-effort persist — ignores write failures (e.g. quota exceeded) so the
 * in-memory bookmark state stays usable even when storage isn't. */
const write = (next: string[]): void => {
  try {
    localStorage.setItem(K, JSON.stringify(next));
  } catch {
    // Swallow storage errors — the caller already has the optimistic state.
  }
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
