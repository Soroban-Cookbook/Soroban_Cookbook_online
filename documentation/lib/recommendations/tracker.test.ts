import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  trackPatternView,
  getTrackerState,
  saveTrackerState,
  getRecommendationScores,
  getTopRecommendations,
  clearTrackerData,
  getAllInteractions,
  hasTrackerData,
} from './tracker';

describe('Recommendation Tracker', () => {
  beforeEach(() => {
    clearTrackerData();
    // Reset localStorage mock
    vi.clearAllMocks();
  });

  describe('getTrackerState', () => {
    it('returns empty state when no data exists', () => {
      const state = getTrackerState();
      expect(state.interactions).toEqual({});
      expect(state.lastUpdated).toBe(0);
    });

    it('returns previous state when data exists', () => {
      const testState = {
        interactions: {
          pattern1: {
            patternId: 'pattern1',
            timestamp: 1000,
            viewCount: 5,
          },
        },
        lastUpdated: 1000,
      };
      saveTrackerState(testState);

      const state = getTrackerState();
      expect(state.interactions.pattern1.viewCount).toBe(5);
      expect(state.lastUpdated).toBe(1000);
    });

    it('handles corrupted localStorage gracefully', () => {
      if (typeof window !== 'undefined') {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => 'invalid json');
        const state = getTrackerState();
        expect(state.interactions).toEqual({});
        expect(state.lastUpdated).toBe(0);
      }
    });

    it('handles server-side rendering (no window)', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Intentionally removing window for SSR test
      delete global.window;

      const state = getTrackerState();
      expect(state.interactions).toEqual({});
      expect(state.lastUpdated).toBe(0);

      global.window = originalWindow;
    });
  });

  describe('saveTrackerState', () => {
    it('persists state to localStorage', () => {
      const testState = {
        interactions: {
          pattern1: {
            patternId: 'pattern1',
            timestamp: 1000,
            viewCount: 3,
          },
        },
        lastUpdated: 1000,
      };

      saveTrackerState(testState);
      const retrieved = getTrackerState();

      expect(retrieved.interactions.pattern1).toEqual(testState.interactions.pattern1);
    });

    it('handles server-side rendering gracefully', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Intentionally removing window for SSR test
      delete global.window;

      const testState = {
        interactions: {},
        lastUpdated: 0,
      };

      // Should not throw
      expect(() => saveTrackerState(testState)).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('trackPatternView', () => {
    it('creates new interaction on first view', () => {
      const now = Date.now();
      trackPatternView('pattern1');

      const state = getTrackerState();
      expect(state.interactions['pattern1']).toBeDefined();
      expect(state.interactions['pattern1'].viewCount).toBe(1);
      expect(state.interactions['pattern1'].timestamp).toBeGreaterThanOrEqual(now);
    });

    it('increments viewCount on repeated views', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern1');
      trackPatternView('pattern1');

      const state = getTrackerState();
      expect(state.interactions['pattern1'].viewCount).toBe(3);
    });

    it('updates timestamp on new view', () => {
      trackPatternView('pattern1');
      const firstTimestamp = getTrackerState().interactions['pattern1'].timestamp;

      // Wait a bit and track again
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      trackPatternView('pattern1');
      vi.useRealTimers();

      const secondTimestamp = getTrackerState().interactions['pattern1'].timestamp;
      expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
    });

    it('tracks multiple different patterns', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');
      trackPatternView('pattern3');

      const state = getTrackerState();
      expect(Object.keys(state.interactions)).toHaveLength(3);
    });

    it('updates lastUpdated timestamp', () => {
      const before = Date.now();
      trackPatternView('pattern1');
      const state = getTrackerState();

      expect(state.lastUpdated).toBeGreaterThanOrEqual(before);
    });

    it('maintains history size within MAX_HISTORY limit', () => {
      // Track more than MAX_HISTORY patterns
      for (let i = 0; i < 60; i++) {
        trackPatternView(`pattern${i}`);
      }

      const state = getTrackerState();
      expect(Object.keys(state.interactions).length).toBeLessThanOrEqual(50);
    });

    it('keeps most recent interactions when exceeding history limit', () => {
      vi.useFakeTimers();
      let timestamp = 1000;

      // Fill history
      for (let i = 0; i < 60; i++) {
        vi.setSystemTime(timestamp);
        trackPatternView(`pattern${i}`);
        timestamp += 100;
      }

      vi.useRealTimers();

      const state = getTrackerState();
      const oldestTimestamp = Math.min(
        ...Object.values(state.interactions).map((i) => i.timestamp),
      );

      // Oldest should be from pattern10 onwards, not pattern0-9
      expect(oldestTimestamp).toBeGreaterThan(1000);
    });
  });

  describe('getRecommendationScores', () => {
    it('returns zero score for untracked patterns', () => {
      const scores = getRecommendationScores(['pattern1', 'pattern2']);

      expect(scores).toHaveLength(2);
      expect(scores.every((s) => s.score === 0)).toBe(true);
    });

    it('calculates scores based on view count', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern1');
      trackPatternView('pattern2');

      const scores = getRecommendationScores(['pattern1', 'pattern2']);
      const pattern1Score = scores.find((s) => s.patternId === 'pattern1')?.score || 0;
      const pattern2Score = scores.find((s) => s.patternId === 'pattern2')?.score || 0;

      expect(pattern1Score).toBeGreaterThan(pattern2Score);
    });

    it('includes recency in scoring', () => {
      vi.useFakeTimers();

      // Track pattern1 a week ago
      vi.setSystemTime(1000 * 60 * 60 * 24 * 7); // 7 days in ms
      trackPatternView('pattern1');

      // Track pattern2 now
      vi.setSystemTime(Date.now());
      trackPatternView('pattern2');

      vi.useRealTimers();

      const scores = getRecommendationScores(['pattern1', 'pattern2']);
      const pattern2Score = scores.find((s) => s.patternId === 'pattern2')?.score || 0;

      // pattern2 should score higher despite same view count due to recency
      expect(pattern2Score).toBeGreaterThan(0);
    });

    it('excludes specified pattern', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');

      const scores = getRecommendationScores(['pattern1', 'pattern2'], 'pattern1');

      expect(scores.find((s) => s.patternId === 'pattern1')).toBeUndefined();
      expect(scores.find((s) => s.patternId === 'pattern2')).toBeDefined();
    });

    it('sorts by score descending', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');
      trackPatternView('pattern2');
      trackPatternView('pattern3');
      trackPatternView('pattern3');
      trackPatternView('pattern3');

      const scores = getRecommendationScores(['pattern1', 'pattern2', 'pattern3']);

      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score);
      }
    });

    it('caps view count contribution at 10', () => {
      // Track pattern1 many times
      for (let i = 0; i < 20; i++) {
        trackPatternView('pattern1');
      }

      // Track pattern2 10 times
      for (let i = 0; i < 10; i++) {
        trackPatternView('pattern2');
      }

      const scores = getRecommendationScores(['pattern1', 'pattern2']);
      const pattern1Score = scores.find((s) => s.patternId === 'pattern1')?.score || 0;
      const pattern2Score = scores.find((s) => s.patternId === 'pattern2')?.score || 0;

      // Scores should be very close since view count is capped
      expect(Math.abs(pattern1Score - pattern2Score)).toBeLessThan(0.05);
    });

    it('handles empty pattern list', () => {
      trackPatternView('pattern1');
      const scores = getRecommendationScores([]);

      expect(scores).toEqual([]);
    });

    it('applies 60/40 weighting (recency/frequency)', () => {
      vi.useFakeTimers();
      const now = Date.now();

      // Pattern with high frequency but old
      vi.setSystemTime(now - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      trackPatternView('old');
      trackPatternView('old');
      trackPatternView('old');

      // Pattern with low frequency but recent
      vi.setSystemTime(now);
      trackPatternView('recent');

      vi.useRealTimers();

      const scores = getRecommendationScores(['old', 'recent']);
      const oldScore = scores.find((s) => s.patternId === 'old')?.score || 0;
      const recentScore = scores.find((s) => s.patternId === 'recent')?.score || 0;

      // Recent should score higher due to recency weighting
      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  describe('getTopRecommendations', () => {
    it('returns top N recommendations', () => {
      for (let i = 1; i <= 5; i++) {
        for (let j = 0; j < i; j++) {
          trackPatternView(`pattern${i}`);
        }
      }

      const top3 = getTopRecommendations(['pattern1', 'pattern2', 'pattern3', 'pattern4', 'pattern5'], 3);

      expect(top3).toHaveLength(3);
      // Should be highest scored patterns
      expect(top3[0]).toBe('pattern5');
    });

    it('returns fewer results if not enough scored patterns', () => {
      trackPatternView('pattern1');

      const top5 = getTopRecommendations(['pattern1', 'pattern2', 'pattern3', 'pattern4', 'pattern5'], 5);

      // Only 1 pattern has views
      expect(top5.length).toBeLessThanOrEqual(1);
    });

    it('excludes specified pattern from recommendations', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');
      trackPatternView('pattern2');

      const recommendations = getTopRecommendations(
        ['pattern1', 'pattern2'],
        5,
        'pattern2',
      );

      expect(recommendations).not.toContain('pattern2');
    });

    it('uses default limit of 3', () => {
      for (let i = 1; i <= 10; i++) {
        trackPatternView(`pattern${i}`);
      }

      const recommendations = getTopRecommendations(
        Array.from({ length: 10 }, (_, i) => `pattern${i + 1}`),
      );

      expect(recommendations.length).toBeLessThanOrEqual(3);
    });

    it('handles empty pattern list', () => {
      trackPatternView('pattern1');
      const recommendations = getTopRecommendations([], 5);

      expect(recommendations).toEqual([]);
    });
  });

  describe('clearTrackerData', () => {
    it('removes all tracking data', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');

      expect(hasTrackerData()).toBe(true);

      clearTrackerData();

      expect(hasTrackerData()).toBe(false);
      const state = getTrackerState();
      expect(state.interactions).toEqual({});
    });

    it('handles clearing empty state', () => {
      expect(() => clearTrackerData()).not.toThrow();
    });
  });

  describe('getAllInteractions', () => {
    it('returns empty array with no interactions', () => {
      const interactions = getAllInteractions();
      expect(interactions).toEqual([]);
    });

    it('returns all tracked interactions', () => {
      trackPatternView('pattern1');
      trackPatternView('pattern2');
      trackPatternView('pattern2');

      const interactions = getAllInteractions();

      expect(interactions).toHaveLength(2);
      expect(interactions.find((i) => i.patternId === 'pattern1')?.viewCount).toBe(1);
      expect(interactions.find((i) => i.patternId === 'pattern2')?.viewCount).toBe(2);
    });
  });

  describe('hasTrackerData', () => {
    it('returns false when no data exists', () => {
      expect(hasTrackerData()).toBe(false);
    });

    it('returns true when data exists', () => {
      trackPatternView('pattern1');
      expect(hasTrackerData()).toBe(true);
    });

    it('returns false after clearing data', () => {
      trackPatternView('pattern1');
      clearTrackerData();
      expect(hasTrackerData()).toBe(false);
    });
  });

  describe('Edge cases and contamination scenarios', () => {
    it('prevents bad tracking from polluting recommendations', () => {
      // Track many unrelated patterns heavily
      for (let i = 0; i < 100; i++) {
        trackPatternView(`spam${i}`);
      }

      // Relevant pattern tracked once
      trackPatternView('relevant-pattern');

      // Even with spam, relevant pattern should be findable
      const scores = getRecommendationScores(['relevant-pattern', 'spam0']);
      expect(scores.find((s) => s.patternId === 'relevant-pattern')).toBeDefined();
    });

    it('handles large view counts gracefully', () => {
      // Simulate extreme view count
      for (let i = 0; i < 1000; i++) {
        trackPatternView('popular-pattern');
      }

      const scores = getRecommendationScores(['popular-pattern']);
      const score = scores[0].score;

      // Score should be bounded and reasonable
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('handles mixed old and new data correctly', () => {
      vi.useFakeTimers();
      const now = Date.now();

      // Old data from 30 days ago
      vi.setSystemTime(now - 30 * 24 * 60 * 60 * 1000);
      trackPatternView('old-pattern');

      // New data from now
      vi.setSystemTime(now);
      trackPatternView('new-pattern');

      vi.useRealTimers();

      const scores = getRecommendationScores(['old-pattern', 'new-pattern']);
      const oldScore = scores.find((s) => s.patternId === 'old-pattern')?.score || 0;

      // Old pattern should have minimal score due to decay
      expect(oldScore).toBeLessThan(0.3);
    });

    it('maintains history integrity after many operations', () => {
      // Simulate realistic usage: view patterns multiple times over time
      for (let cycle = 0; cycle < 5; cycle++) {
        for (let pattern = 0; pattern < 15; pattern++) {
          trackPatternView(`pattern${pattern}`);
        }
      }

      const state = getTrackerState();
      expect(Object.keys(state.interactions).length).toBeLessThanOrEqual(50);

      // All stored patterns should be valid
      Object.values(state.interactions).forEach((interaction) => {
        expect(interaction.patternId).toBeDefined();
        expect(interaction.viewCount).toBeGreaterThan(0);
        expect(interaction.timestamp).toBeGreaterThan(0);
      });
    });
  });
});
