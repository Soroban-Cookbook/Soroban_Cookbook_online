import { useEffect, useMemo, useState } from 'react';

const K = 'bookmarks';

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(K) || '[]');
  } catch {
    return [];
  }
};

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setBookmarks(read());
  }, []);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const toggleBookmark = (path: string) =>
    setBookmarks((prev) => {
      const next = prev.includes(path) ? prev.filter((x) => x !== path) : [...prev, path];
      localStorage.setItem(K, JSON.stringify(next));
      return next;
    });

  const removeBookmark = (path: string) =>
    setBookmarks((prev) => {
      const next = prev.filter((x) => x !== path);
      localStorage.setItem(K, JSON.stringify(next));
      return next;
    });

  const clearBookmarks = () =>
    setBookmarks(() => {
      localStorage.setItem(K, '[]');
      return [];
    });

  return {
    bookmarks,
    isBookmarked: (path: string) => bookmarkSet.has(path),
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
