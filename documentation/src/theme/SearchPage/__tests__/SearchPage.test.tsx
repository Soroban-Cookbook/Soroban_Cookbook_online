import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SearchPage from '../index'; // Component is index.tsx

vi.mock('@docusaurus/plugin-content-docs', () => ({
  useSearch: () => ({
    search: vi.fn((query) => {
      if (query === 'auth') {
        return Promise.resolve({
          results: [
            { id: '1', title: 'Pattern: Authentication', url: '/docs/patterns/authentication' },
          ],
        });
      }
      return Promise.resolve({ results: [] });
    }),
  }),
}));

vi.mock('@docusaurus/router', () => ({
  useLocation: () => ({ pathname: '/search', search: '?q=auth' }),
}));

describe('SearchPage', () => {
  it('displays results when query matches', async () => {
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText('Pattern: Authentication')).toBeInTheDocument();
    });
    const link = screen.getByText('Pattern: Authentication').closest('a');
    expect(link).toHaveAttribute('href', '/docs/patterns/authentication');
  });

  it('shows empty state when no results', async () => {
    const { useSearch } = await import('@docusaurus/plugin-content-docs');
    vi.mocked(useSearch).mockImplementationOnce(() => ({
      search: vi.fn(() => Promise.resolve({ results: [] })),
    }));

    const { useLocation } = await import('@docusaurus/router');
    vi.mocked(useLocation).mockImplementationOnce(() => ({
      pathname: '/search',
      search: '?q=nonexistent',
    }));

    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/No results found/i)).toBeInTheDocument();
    });
  });
});
