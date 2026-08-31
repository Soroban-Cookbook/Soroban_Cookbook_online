import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearHistory,
  getHistory,
  saveHistory,
  trackDocVisit,
  type UserHistory,
} from '../../../../lib/recommendations/tracker';

const emptyHistory: UserHistory = {
  visitedDocs: [],
  preferences: {
    categoryPreferences: {},
    tagPreferences: {},
    difficultyPreferences: {},
  },
};

describe('recommendation tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns an empty history when localStorage has no saved value', () => {
    expect(getHistory()).toEqual(emptyHistory);
  });

  it('saves and reads history from localStorage', () => {
    const history: UserHistory = {
      visitedDocs: ['patterns/basic-token'],
      preferences: {
        categoryPreferences: { patterns: 2 },
        tagPreferences: { tokens: 3 },
        difficultyPreferences: { intermediate: 1 },
      },
    };

    saveHistory(history);

    expect(localStorage.getItem('soroban_recommendations_history')).toBe(JSON.stringify(history));
    expect(getHistory()).toEqual(history);
  });

  it('tracks visits, moves duplicates to the front, and updates preferences', () => {
    saveHistory({
      visitedDocs: ['concepts/storage', 'patterns/authorization'],
      preferences: {
        categoryPreferences: { concepts: 1 },
        tagPreferences: { storage: 2 },
        difficultyPreferences: { beginner: 1 },
      },
    });

    trackDocVisit('patterns/basic-token', 'patterns', ['tokens', 'storage'], 'intermediate');
    trackDocVisit('concepts/storage', 'concepts', ['storage'], 'beginner');

    expect(getHistory()).toEqual({
      visitedDocs: ['concepts/storage', 'patterns/basic-token', 'patterns/authorization'],
      preferences: {
        categoryPreferences: {
          concepts: 2,
          patterns: 1,
        },
        tagPreferences: {
          storage: 4,
          tokens: 1,
        },
        difficultyPreferences: {
          beginner: 2,
          intermediate: 1,
        },
      },
    });
  });

  it('caps visited docs at 20 entries', () => {
    for (let index = 0; index < 21; index += 1) {
      trackDocVisit(`doc-${index}`, 'patterns', ['tokens'], 'beginner');
    }

    const history = getHistory();

    expect(history.visitedDocs).toHaveLength(20);
    expect(history.visitedDocs[0]).toBe('doc-20');
    expect(history.visitedDocs).not.toContain('doc-0');
  });

  it('ignores empty doc ids and clears saved history', () => {
    trackDocVisit('', 'patterns', ['tokens'], 'beginner');
    expect(getHistory()).toEqual(emptyHistory);

    saveHistory({
      visitedDocs: ['patterns/basic-token'],
      preferences: {
        categoryPreferences: { patterns: 1 },
        tagPreferences: { tokens: 1 },
        difficultyPreferences: { beginner: 1 },
      },
    });

    clearHistory();

    expect(localStorage.getItem('soroban_recommendations_history')).toBeNull();
    expect(getHistory()).toEqual(emptyHistory);
  });

  it('falls back to an empty history when saved JSON cannot be parsed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('soroban_recommendations_history', '{not-json');

    expect(getHistory()).toEqual(emptyHistory);
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to parse recommendation history from localStorage',
      expect.any(SyntaxError)
    );
  });
});
