import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Box, Copy } from 'lucide-react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('defaults to decorative (aria-hidden) without a name', () => {
    const { container } = render(<Icon icon={Box} size="md" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('exposes a name when decorative is false and title is set', () => {
    const { container } = render(
      <Icon icon={Copy} size="sm" decorative={false} title="Copy to clipboard" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'false');
    expect(svg).toHaveAttribute('aria-label', 'Copy to clipboard');
    expect(svg).toHaveAttribute('title', 'Copy to clipboard');
  });

  it('accepts ariaLabel as a fallback name for existing callers', () => {
    const { container } = render(<Icon icon={Copy} decorative={false} ariaLabel="Copy" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Copy');
  });

  it('throws when decorative is false and no title or ariaLabel is provided', () => {
    expect(() => render(<Icon icon={Box} decorative={false} />)).toThrow(/title is required/i);
  });
});
