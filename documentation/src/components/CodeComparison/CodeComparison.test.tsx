/**
 * Tests for CodeComparison component
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeComparison from './CodeComparison';

const before = `let x = 1;
let y = 2;`;

const after = `let x = 1;
let y = 3;`;

describe('CodeComparison Component', () => {
  it('renders both panes with default labels', () => {
    render(<CodeComparison before={before} after={after} />);
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getAllByText('let x = 1;')).toHaveLength(2);
  });

  it('renders custom labels', () => {
    render(<CodeComparison before={before} after={after} beforeLabel="Old" afterLabel="New" />);
    expect(screen.getByText('Old')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders an optional title as a caption', () => {
    render(<CodeComparison before={before} after={after} title="Upgrade diff" />);
    expect(screen.getByText('Upgrade diff')).toBeInTheDocument();
  });

  it('highlights changed lines in each pane', () => {
    const { container } = render(<CodeComparison before={before} after={after} />);
    // Both panes show 'let x = 1;' as unchanged and one differing line.
    const panes = container.querySelectorAll('[class*="pane"]');
    expect(panes).toHaveLength(2);
    // The removed 'let y = 2;' appears once in the before pane.
    expect(screen.getByText('let y = 2;')).toBeInTheDocument();
    // The added 'let y = 3;' appears once in the after pane.
    expect(screen.getByText('let y = 3;')).toBeInTheDocument();
  });

  it('renders line numbers by default', () => {
    const { container } = render(<CodeComparison before={before} after={after} />);
    const gutters = container.querySelectorAll('[class*="gutter"]');
    expect(gutters.length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('hides line numbers when showLineNumbers is false', () => {
    const { container } = render(
      <CodeComparison before={before} after={after} showLineNumbers={false} />,
    );
    expect(container.querySelectorAll('[class*="gutter"]')).toHaveLength(0);
  });

  it('applies a custom className', () => {
    const { container } = render(
      <CodeComparison before={before} after={after} className="my-compare" />,
    );
    expect(container.firstChild).toHaveClass('my-compare');
  });

  it('sets aria-labels on each pane', () => {
    render(
      <CodeComparison before={before} after={after} beforeLabel="Old code" afterLabel="New code" />,
    );
    const beforePane = screen.getByLabelText('Old code');
    const afterPane = screen.getByLabelText('New code');
    expect(beforePane).toBeInTheDocument();
    expect(afterPane).toBeInTheDocument();
  });

  it('handles a fully empty before code block', () => {
    const { container } = render(<CodeComparison before="" after={after} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText('let x = 1;')).toBeInTheDocument();
  });
});
