import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PatternPreview from './PatternPreview';
import { samplePatterns } from '../../fixtures/patterns';

describe('PatternPreview', () => {
  it('renders without crashing using fixtures', () => {
    render(<PatternPreview patterns={samplePatterns} />);
    expect(screen.getByText('Popular Patterns')).toBeInTheDocument();
  });
});
