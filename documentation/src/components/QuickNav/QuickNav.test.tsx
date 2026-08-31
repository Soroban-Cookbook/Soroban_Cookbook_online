import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickNav from './QuickNav';
import type { QuickNavItem } from './QuickNav';

const items: QuickNavItem[] = [
  { id: 'intro', label: 'Introduction', level: 1 },
  { id: 'setup', label: 'Setup', level: 2 },
  { id: 'usage', label: 'Usage', level: 2 },
  { id: 'advanced', label: 'Advanced Topics', level: 1 },
];

describe('QuickNav', () => {
  it('renders title', () => {
    render(<QuickNav items={items} />);
    expect(screen.getByText('On this page')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<QuickNav items={items} title="Table of Contents" />);
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
  });

  it('renders all nav items as links', () => {
    render(<QuickNav items={items} />);
    expect(screen.getByRole('link', { name: 'Introduction' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usage' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Advanced Topics' })).toBeInTheDocument();
  });

  it('links have correct href attributes', () => {
    render(<QuickNav items={items} />);
    expect(screen.getByRole('link', { name: 'Introduction' })).toHaveAttribute('href', '#intro');
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup');
  });

  it('uses custom href when provided', () => {
    const customItems: QuickNavItem[] = [{ id: 'a', label: 'Custom', href: '/docs/custom' }];
    render(<QuickNav items={customItems} />);
    expect(screen.getByRole('link', { name: 'Custom' })).toHaveAttribute('href', '/docs/custom');
  });

  it('renders empty state when items is empty', () => {
    render(<QuickNav items={[]} />);
    expect(screen.getByText('No headings found.')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<QuickNav loading />);
    expect(container.querySelector('[class*="loadingSkeleton"]')).toBeInTheDocument();
  });

  it('hides nav links during loading', () => {
    render(<QuickNav items={items} loading />);
    expect(screen.queryByRole('link', { name: 'Introduction' })).not.toBeInTheDocument();
  });

  it('renders empty text during loading instead of no headings', () => {
    render(<QuickNav loading />);
    expect(screen.queryByText('No headings found.')).not.toBeInTheDocument();
  });

  it('has correct nav aria-label', () => {
    render(<QuickNav items={items} />);
    expect(screen.getByRole('navigation', { name: 'Quick navigation' })).toBeInTheDocument();
  });

  it('renders list items for each nav item', () => {
    render(<QuickNav items={items} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(4);
  });

  it('applies custom className', () => {
    const { container } = render(<QuickNav items={items} className="custom-nav" />);
    expect(container.firstChild).toHaveClass('custom-nav');
  });

  it('defaults to empty array when items prop not provided', () => {
    render(<QuickNav />);
    expect(screen.getByText('No headings found.')).toBeInTheDocument();
  });
});
