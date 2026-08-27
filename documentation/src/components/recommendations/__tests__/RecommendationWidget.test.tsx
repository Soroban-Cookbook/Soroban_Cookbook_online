import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RecommendationWidget from '../RecommendationWidget';
import { getRecommendations } from '../../../../lib/recommendations/recommendationEngine';

// Mock Link
vi.mock('@docusaurus/Link', () => {
  return {
    default: ({
      to,
      children,
      ...props
    }: {
      to: string;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('a', { href: to, ...props }, children),
  };
});

// Mock tracker functions
vi.mock('../../../../lib/recommendations/tracker', () => {
  return {
    getHistory: vi.fn().mockReturnValue({
      visitedDocs: [],
      preferences: {
        categoryPreferences: {},
        tagPreferences: {},
        difficultyPreferences: {},
      },
    }),
  };
});

// Mock recommendationEngine functions
vi.mock('../../../../lib/recommendations/recommendationEngine', () => {
  return {
    getRecommendations: vi.fn().mockReturnValue([
      {
        id: 'getting-started/first-contract',
        title: 'First Contract',
        description: 'Learn to write your first contract.',
        category: 'getting-started',
        difficulty: 'beginner',
        status: 'stable',
        time: 10,
        tags: ['rust'],
        href: '/docs/getting-started/first-contract',
      },
      {
        id: 'concepts/storage',
        title: 'Storage Types',
        description: 'Learn about ledger storage.',
        category: 'concepts',
        difficulty: 'intermediate',
        status: 'stable',
        time: 15,
        tags: ['storage'],
        href: '/docs/concepts/storage',
      },
    ]),
  };
});

describe('RecommendationWidget Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recommendation widget cards correctly', async () => {
    render(<RecommendationWidget currentDocId="getting-started/setup" />);

    // Check title
    expect(screen.getByText('Recommended for You')).toBeInTheDocument();

    // Check cards render titles
    expect(screen.getByText('First Contract')).toBeInTheDocument();
    expect(screen.getByText('Storage Types')).toBeInTheDocument();

    // Check descriptions
    expect(screen.getByText('Learn to write your first contract.')).toBeInTheDocument();
    expect(screen.getByText('Learn about ledger storage.')).toBeInTheDocument();

    // Check categories formatted
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Concepts')).toBeInTheDocument();

    // Check reading times
    expect(screen.getByText('⏱️ 10 min')).toBeInTheDocument();
    expect(screen.getByText('⏱️ 15 min')).toBeInTheDocument();
  });

  it('returns null if there are no recommendations', () => {
    vi.mocked(getRecommendations).mockReturnValueOnce([]);

    const { container } = render(<RecommendationWidget currentDocId="getting-started/setup" />);
    expect(container).toBeEmptyDOMElement();
  });
});
