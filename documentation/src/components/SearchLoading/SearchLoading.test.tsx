import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockLocation } from '../../../__mocks__/docusaurus-router';
import SearchLoading from './SearchLoading';

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchLoading', () => {
  it('announces search start and clears the same status when results settle', async () => {
    vi.useFakeTimers();
    mockLocation.pathname = '/';
    mockLocation.search = '';

    const { rerender } = render(<SearchLoading />);
    const status = screen.getByRole('status');

    expect(status).toBeEmptyDOMElement();

    mockLocation.pathname = '/search';
    mockLocation.search = '?q=soroban';
    rerender(<SearchLoading />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(status).toHaveTextContent('Searching…');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveAttribute('aria-busy', 'false');
  });
});
