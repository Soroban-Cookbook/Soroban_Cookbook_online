/**
 * Test double for `@theme-original/SearchBar` (the theme component the
 * swizzled wrapper wraps). The real component pulls in the whole search
 * plugin; unit tests only need a plausible search input + results list
 * driven by the `useSearch` mock in each test file.
 */
import React, { useState } from 'react';
import * as docsClient from '@docusaurus/plugin-content-docs';

/**
 * `useSearch` only exists on the mocked module in tests (the real
 * plugin-content-docs doesn't export it), so cast through the namespace import.
 */
const { useSearch } = docsClient as unknown as {
  useSearch: () => {
    search: (query: string) => Promise<{ results?: SearchDocResult[] }>;
  };
};

interface SearchDocResult {
  id: string;
  title: string;
  url: string;
}

export default function OriginalSearchBarStub(): React.ReactElement {
  const { search } = useSearch();
  const [results, setResults] = useState<SearchDocResult[]>([]);

  const handleChange = async (query: string): Promise<void> => {
    const response = await search(query);
    setResults((response as { results?: SearchDocResult[] })?.results ?? []);
  };

  return (
    <div data-testid="original-search-bar-stub">
      <input
        type="search"
        placeholder="Search"
        onChange={(event) => {
          void handleChange(event.target.value);
        }}
      />
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
