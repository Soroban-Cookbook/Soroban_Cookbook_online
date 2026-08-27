import { describe, it, expect, vi } from 'vitest';
import { getRecommendations } from '../recommendationEngine';
import { UserPreferences } from '../tracker';

// Mock registry data to make tests stable and clean
vi.mock('../../../src/components/recommendations/contentRegistry.json', () => {
  return {
    default: [
      {
        id: 'getting-started/setup',
        title: 'Environment Setup',
        description: 'Setup description',
        category: 'getting-started',
        difficulty: 'beginner',
        status: 'stable',
        time: 5,
        tags: ['installation', 'rust'],
        href: '/docs/getting-started/setup',
      },
      {
        id: 'getting-started/first-contract',
        title: 'First Contract',
        description: 'First contract description',
        category: 'getting-started',
        difficulty: 'beginner',
        status: 'stable',
        time: 10,
        tags: ['rust', 'smart-contract'],
        href: '/docs/getting-started/first-contract',
      },
      {
        id: 'concepts/storage',
        title: 'Storage',
        description: 'Storage concepts',
        category: 'concepts',
        difficulty: 'intermediate',
        status: 'stable',
        time: 15,
        tags: ['storage', 'rust'],
        href: '/docs/concepts/storage',
      },
      {
        id: 'patterns/basic-token',
        title: 'Basic Token',
        description: 'Basic token pattern',
        category: 'patterns',
        difficulty: 'intermediate',
        status: 'stable',
        time: 20,
        tags: ['tokens', 'storage'],
        href: '/docs/patterns/basic-token',
      },
      {
        id: 'patterns/authorization',
        title: 'Authorization Pattern',
        description: 'Access control patterns',
        category: 'patterns',
        difficulty: 'intermediate',
        status: 'stable',
        time: 25,
        tags: ['auth', 'security'],
        href: '/docs/patterns/authorization',
      },
      {
        id: 'patterns/lifecycle-upgrades',
        title: 'Upgrades',
        description: 'Upgrades pattern',
        category: 'patterns',
        difficulty: 'advanced',
        status: 'stable',
        time: 30,
        tags: ['upgrade', 'security'],
        href: '/docs/patterns/lifecycle-upgrades',
      },
    ],
  };
});

describe('recommendationEngine - Scoring Logic', () => {
  const emptyPrefs: UserPreferences = {
    categoryPreferences: {},
    tagPreferences: {},
    difficultyPreferences: {},
  };

  it('filters out the current document from recommended list', () => {
    const recs = getRecommendations('getting-started/setup', [], emptyPrefs, 3);
    expect(recs.find(doc => doc.id === 'getting-started/setup')).toBeUndefined();
    expect(recs.length).toBeGreaterThan(0);
  });

  it('ranks documents in the same category higher', () => {
    // Current is getting-started/setup (category: getting-started)
    // The next best should be getting-started/first-contract
    const recs = getRecommendations('getting-started/setup', [], emptyPrefs, 2);
    expect(recs[0].id).toBe('getting-started/first-contract');
  });

  it('ranks overlapping tags higher', () => {
    // Current is patterns/basic-token (tags: tokens, storage)
    // concepts/storage shares 'storage' tag and patterns/authorization shares 'patterns' category
    const recs = getRecommendations('patterns/basic-token', [], emptyPrefs, 3);
    expect(recs.map(r => r.id)).toContain('concepts/storage');
  });

  it('suggests difficulty progression correctly', () => {
    // Current is getting-started/setup (difficulty: beginner)
    // Intermediate items (like storage, basic-token, authorization) should get progression bonus
    const recs = getRecommendations('getting-started/first-contract', [], emptyPrefs, 3);
    // Should contain intermediate items
    expect(recs.some(r => r.difficulty === 'intermediate')).toBe(true);
  });

  it('penalizes recently visited pages and immediately preceding page severely', () => {
    // Current is patterns/basic-token
    // Candidate patterns/authorization was visited immediately prior (index 0 in history)
    // Candidate concepts/storage was visited earlier (index 1 in history)
    const history = ['patterns/authorization', 'concepts/storage'];
    const recs = getRecommendations('patterns/basic-token', history, emptyPrefs, 3);

    // patterns/authorization should be pushed down or not present in top recommendations
    // compared to other patterns, e.g., patterns/lifecycle-upgrades
    expect(recs[0].id).not.toBe('patterns/authorization');
  });

  it('applies category preferences from history', () => {
    const prefs: UserPreferences = {
      categoryPreferences: {
        patterns: 10,
        'getting-started': 0,
      },
      tagPreferences: {},
      difficultyPreferences: {},
    };

    // Current is getting-started/setup (getting-started category)
    // Since patterns category preference is very high, patterns should be recommended
    const recs = getRecommendations('getting-started/setup', [], prefs, 3);
    expect(recs.some(r => r.category === 'patterns')).toBe(true);
  });

  it('caches recommendation calculation results', () => {
    const recs1 = getRecommendations('getting-started/setup', [], emptyPrefs, 2);
    const recs2 = getRecommendations('getting-started/setup', [], emptyPrefs, 2);
    expect(recs1).toBe(recs2); // reference equality from cache
  });
});
