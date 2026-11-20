/**
 * Test double for `@theme-original/SearchPage` (the plugin's search page the
 * swizzled wrapper wraps). Reads `?q=` from the router mock and renders the
 * results supplied by the `useSearch` mock — or an empty state — so the
 * wrapper's behaviour can be asserted without the real search plugin.
 */
import React, { useEffect, useState } from 'react';
import * as docsClient from '@docusaurus/plugin-content-docs';
import { useLocation } from '@docusaurus/router';

interface SearchDocResult {
  id: string;
  title: string;
  url: string;
}

/**
 * `useSearch` only exists on the mocked module in tests (the real
 * plugin-content-docs doesn't export it), so cast through the namespace import.
 */
const { useSearch } = docsClient as unknown as {
  useSearch: () => {
    search: (query: string) => Promise<{ results?: SearchDocResult[] }>;
  };
};

export default function OriginalSearchPageStub(): React.ReactElement {
  const { search } = useSearch();
  const location = useLocation();
  const query = new URLSearchParams(location.search ?? '').get('q') ?? '';
  const [results, setResults] = useState<SearchDocResult[]>([]);

  useEffect(() => {
    let active = true;
    void search(query).then((response: unknown) => {
      if (active) {
        setResults((response as { results?: SearchDocResult[] })?.results ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, [query, search]);

  if (results.length === 0) {
    return <p>No results found for &ldquo;{query}&rdquo;</p>;
  }

  return (
    <div data-testid="original-search-page-stub">
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            <a href={result.url}>{result.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
