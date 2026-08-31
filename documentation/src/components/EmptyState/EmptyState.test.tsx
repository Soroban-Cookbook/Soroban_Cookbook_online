import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders body text', () => {
    render(<EmptyState title="Nothing here" body="Try a different search." />);
    expect(screen.getByText('Try a different search.')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="icon">🔍</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('hides icon wrapper when icon is not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('renders action buttons with onClick', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState title="No items" actions={[{ label: 'Create one', onClick: handleClick }]} />,
    );
    const btn = screen.getByRole('button', { name: 'Create one' });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders action links with href', () => {
    render(<EmptyState title="No items" actions={[{ label: 'Browse', href: '/docs/all' }]} />);
    const link = screen.getByRole('link', { name: 'Browse' });
    expect(link).toHaveAttribute('href', '/docs/all');
  });

  it('renders multiple actions', () => {
    render(
      <EmptyState
        title="Empty"
        actions={[
          { label: 'Primary', onClick: vi.fn() },
          { label: 'Secondary', onClick: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
  });

  it('applies size class for sm', () => {
    const { container } = render(<EmptyState title="Small" size="sm" />);
    expect(container.firstChild).toHaveClass(/sizeSm/);
  });

  it('applies size class for lg', () => {
    const { container } = render(<EmptyState title="Large" size="lg" />);
    expect(container.firstChild).toHaveClass(/sizeLg/);
  });

  it('defaults to md size (no extra size class)', () => {
    const { container } = render(<EmptyState title="Medium" />);
    const classes = (container.firstChild as HTMLElement).className;
    expect(classes).not.toMatch(/sizeSm/);
    expect(classes).not.toMatch(/sizeLg/);
  });

  it('applies custom className', () => {
    const { container } = render(<EmptyState title="Test" className="custom" />);
    expect(container.firstChild).toHaveClass('custom');
  });

  it('has status role with aria-label matching title', () => {
    render(<EmptyState title="Search empty" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Search empty');
  });

  it('defaults first action to primary variant', () => {
    render(<EmptyState title="Empty" actions={[{ label: 'Action 1' }, { label: 'Action 2' }]} />);
    expect(screen.getByRole('button', { name: 'Action 1' })).toHaveClass('button--primary');
    expect(screen.getByRole('button', { name: 'Action 2' })).toHaveClass('button--secondary');
  });

  it('uses explicit variant over default', () => {
    render(<EmptyState title="Empty" actions={[{ label: 'Ghost action', variant: 'ghost' }]} />);
    expect(screen.getByRole('button', { name: 'Ghost action' })).toHaveClass('button--link');
  });

  it('applies size class to buttons', () => {
    render(
      <EmptyState title="Empty" size="sm" actions={[{ label: 'Small btn', onClick: vi.fn() }]} />,
    );
    expect(screen.getByRole('button', { name: 'Small btn' })).toHaveClass('button--sm');
  });
});
