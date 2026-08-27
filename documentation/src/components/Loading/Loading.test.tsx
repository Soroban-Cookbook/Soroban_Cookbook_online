import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton, Spinner, DocSkeleton } from './index';

describe('Loading primitives (#349)', () => {
  it('Skeleton exposes an accessible busy status', () => {
    render(<Skeleton width="50%" height="2rem" />);
    const status = screen.getByRole('status', { name: /loading/i });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveClass('skeleton-loader');
  });

  it('Spinner exposes an accessible busy status', () => {
    render(<Spinner size={32} />);
    const status = screen.getByRole('status', { name: /loading/i });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveClass('spinner-loader');
  });

  it('DocSkeleton reserves layout with multiple skeleton bars', () => {
    const { container } = render(<DocSkeleton />);
    expect(screen.getByRole('status', { name: /loading document/i })).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton-loader').length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText(/preview mode/i)).not.toBeInTheDocument();
  });
});
