import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useBookmarks } from '../hooks/useBookmarks';

export default function BookmarksPage() {
  const { bookmarks, removeBookmark } = useBookmarks();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Layout title="Bookmarked Pages" description="Your saved Soroban Cookbook pages">
      <main className="container margin-vert--lg">
        <h1>Bookmarked Pages</h1>
        {bookmarks.length === 0 ? (
          <p>No saved bookmarks yet.</p>
        ) : (
          <ul>
            {bookmarks.map((path) => (
              <li key={path} style={{ margin: '0.5rem 0' }}>
                <Link to={path}>{path}</Link>
                <button
                  type="button"
                  style={{ marginLeft: '1rem' }}
                  onClick={() => removeBookmark(path)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

const KEY = 'bm';

export default function BookmarksPage() {
  const [items, setItems] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch {
      setItems([]);
    }
  }, []);

  const toggle = () => {
    const n = items.includes(currentPath)
      ? items.filter((x) => x !== currentPath)
      : [...items, currentPath];
    localStorage.setItem(KEY, JSON.stringify(n));
    setItems(n);
  };

  return (
    <button type="button" onClick={toggle}>
      {items.includes(currentPath) ? 'Y' : 'N'}
    </button>
import React from 'react';
import Layout from '@theme/Layout';
import { useBookmarks } from '../hooks/useBookmarks';

/**
 * Bookmarks page — lists the pages the visitor has bookmarked via the
 * floating BookmarkButton. State lives in localStorage (see useBookmarks),
 * so the list is only populated on the client; SSR renders the empty state.
 */
export default function BookmarksPage() {
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();

  return (
    <Layout title="Bookmarks" description="Pages you have bookmarked on the Soroban Cookbook.">
      <main className="container margin-vert--lg">
        <h1>Bookmarks</h1>

        {bookmarks.length === 0 ? (
          <p>
            You have not bookmarked any pages yet. Use the bookmark button in the bottom-right
            corner of any page to save it here.
          </p>
        ) : (
          <>
            <ul>
              {bookmarks.map((path) => (
                <li key={path}>
                  <a href={path}>{path}</a>{' '}
                  <button type="button" onClick={() => removeBookmark(path)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={clearBookmarks}>
              Clear all bookmarks
            </button>
          </>
        )}
      </main>
    </Layout>
  );
}
}
