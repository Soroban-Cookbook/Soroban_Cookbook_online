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
