import { useEffect, useState } from 'react';

const K = 'bookmarks';

const read = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(K) || '[]');
  } catch {
    return [];
  }
};

export function useBookmarks() {
  const [b, s] = useState<string[]>([]);
  useEffect(() => s(read()), []);

  const toggleBookmark = (p: string) =>
    s((q) => {
      const n = q.includes(p) ? q.filter((x) => x !== p) : [...q, p];
      localStorage.setItem(K, JSON.stringify(n));
      return n;
    });

  const removeBookmark = (p: string) =>
    s((q) => {
      const n = q.filter((x) => x !== p);
      localStorage.setItem(K, JSON.stringify(n));
      return n;
    });

  const clearBookmarks = () =>
    s(() => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setBookmarks(read());
  }, []);

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
    bookmarks: b,
    isBookmarked: (p: string) => b.includes(p),
    bookmarks,
    isBookmarked: (path: string) => bookmarks.includes(path),
    toggleBookmark,
    removeBookmark,
    clearBookmarks,
  };
}
