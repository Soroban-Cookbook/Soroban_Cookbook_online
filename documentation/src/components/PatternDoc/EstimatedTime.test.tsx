import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimatedTime, parseEstimatedTime, PatternMeta } from './PatternDoc';

describe('parseEstimatedTime', () => {
  it('formats numeric minutes', () => {
    expect(parseEstimatedTime(5)).toBe('5 min');
    expect(parseEstimatedTime(1)).toBe('1 min');
  });

  it('parses minute strings', () => {
    expect(parseEstimatedTime('10')).toBe('10 min');
    expect(parseEstimatedTime('10m')).toBe('10 min');
    expect(parseEstimatedTime('15 min')).toBe('15 min');
    expect(parseEstimatedTime('20 minutes')).toBe('20 min');
  });

  it('parses hour strings into minutes', () => {
    expect(parseEstimatedTime('1h')).toBe('60 min');
    expect(parseEstimatedTime('1.5 hours')).toBe('90 min');
  });

  it('returns null for empty or invalid values', () => {
    expect(parseEstimatedTime(undefined)).toBeNull();
    expect(parseEstimatedTime(null)).toBeNull();
    expect(parseEstimatedTime('')).toBeNull();
    expect(parseEstimatedTime(0)).toBeNull();
    expect(parseEstimatedTime(-5)).toBeNull();
  });

  it('preserves free-form labels', () => {
    expect(parseEstimatedTime('10–15 min')).toBe('10–15 min');
  });
});

describe('EstimatedTime', () => {
  it('renders a time badge with accessible label', () => {
    render(<EstimatedTime time={8} />);
    const badge = screen.getByRole('status', { name: 'Estimated time: 8 min' });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-estimated-time', '8 min');
    expect(screen.getByText('8 min')).toBeInTheDocument();
  });

  it('renders nothing for invalid time', () => {
    const { container } = render(<EstimatedTime time={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PatternMeta with time', () => {
  it('shows estimated time in header and meta grid', () => {
    render(
      <PatternMeta
        slug="hello-world"
        difficulty="beginner"
        category="Storage"
        time={5}
        lastReviewed="March 2026"
      />,
    );
    expect(screen.getByRole('status', { name: 'Estimated time: 5 min' })).toBeInTheDocument();
    expect(screen.getByText('Est. time')).toBeInTheDocument();
    expect(screen.getAllByText('5 min').length).toBeGreaterThanOrEqual(1);
  });
});
