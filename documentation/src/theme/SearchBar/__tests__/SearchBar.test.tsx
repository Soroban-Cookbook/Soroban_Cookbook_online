import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../index'; // Component is index.tsx

vi.mock('@docusaurus/plugin-content-docs', () => ({
  useSearch: () => ({
    search: vi.fn((query) => {
      if (!query) return Promise.resolve({ results: [] });
      return Promise.resolve({
        results: [
          { id: '1', title: 'Pattern: Authentication', url: '/docs/patterns/authentication' },
          { id: '2', title: 'Token Standards', url: '/docs/patterns/token-standards' },
        ],
      });
    }),
  }),
}));

vi.mock('@docusaurus/router', () => ({
  useHistory: () => ({ push: vi.fn() }),
  useLocation: () => ({ pathname: '/', search: '' }),
}));

describe('SearchBar', () => {
  it('renders the search input', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('shows no results when input is empty', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.queryByText('Pattern: Authentication')).not.toBeInTheDocument();
    });
  });

  it('displays results when typing a query', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search/i);

    await user.type(input, 'auth');

    await waitFor(() => {
      expect(screen.getByText('Pattern: Authentication')).toBeInTheDocument();
    });
  });

  it('clicking a result link navigates to the correct URL', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    const input = screen.getByPlaceholderText(/Search/i);

    await user.type(input, 'auth');
    const link = await screen.findByText('Pattern: Authentication');

    expect(link.closest('a')).toHaveAttribute('href', '/docs/patterns/authentication');
  });
});