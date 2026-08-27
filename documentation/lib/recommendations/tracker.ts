/**
 * Recommendation Tracker
 * ----------------------
 * Tracks user interactions with patterns and maintains a scoring system
 * to recommend related patterns. Uses localStorage for persistence.
 */

const STORAGE_KEY = 'soroban_pattern_tracker';
const MAX_HISTORY = 50;

export interface PatternInteraction {
  patternId: string;
  timestamp: number;
  viewCount: number;
}

export interface TrackerState {
  interactions: Record<string, PatternInteraction>;
  lastUpdated: number;
}

export interface RecommendationScore {
  patternId: string;
  score: number;
}

/**
 * Get the current tracker state from localStorage.
 * Returns empty state if storage is unavailable or corrupted.
 */
export function getTrackerState(): TrackerState {
  try {
    if (typeof window === 'undefined') {
      return { interactions: {}, lastUpdated: 0 };
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { interactions: {}, lastUpdated: 0 };
    }

    const parsed = JSON.parse(stored);
    return {
      interactions: parsed.interactions || {},
      lastUpdated: parsed.lastUpdated || 0,
    };
  } catch {
    // localStorage corrupted or unavailable
    return { interactions: {}, lastUpdated: 0 };
  }
}

/**
 * Save tracker state to localStorage.
 * Silently fails if storage is unavailable.
 */
export function saveTrackerState(state: TrackerState): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Record a pattern view interaction.
 * Increments view count and updates timestamp.
 */
export function trackPatternView(patternId: string): void {
  const state = getTrackerState();

  if (!state.interactions[patternId]) {
    state.interactions[patternId] = {
      patternId,
      timestamp: Date.now(),
      viewCount: 1,
    };
  } else {
    state.interactions[patternId].viewCount += 1;
    state.interactions[patternId].timestamp = Date.now();
  }

  state.lastUpdated = Date.now();

  // Keep history size bounded
  const entries = Object.values(state.interactions).sort((a, b) => b.timestamp - a.timestamp);
  if (entries.length > MAX_HISTORY) {
    entries.slice(MAX_HISTORY).forEach((entry) => {
      delete state.interactions[entry.patternId];
    });
  }

  saveTrackerState(state);
}

/**
 * Calculate recommendation scores based on tracked interactions.
 * Uses view count and recency to weight recommendations.
 */
export function getRecommendationScores(
  allPatterns: string[],
  excludePattern?: string,
): RecommendationScore[] {
  const state = getTrackerState();
  const now = Date.now();

  return allPatterns
    .filter((id) => id !== excludePattern)
    .map((patternId) => {
      const interaction = state.interactions[patternId];

      if (!interaction) {
        // Patterns without interactions get minimal score
        return { patternId, score: 0 };
      }

      // Decay score based on time since last view (1 week = 0 decay)
      const daysSinceView = (now - interaction.timestamp) / (1000 * 60 * 60 * 24);
      const recencyDecay = Math.max(0, 1 - daysSinceView / 7);

      // View count contributes to score (capped at 10)
      const viewScore = Math.min(interaction.viewCount, 10) / 10;

      // Combined score: 60% recency, 40% view frequency
      const score = recencyDecay * 0.6 + viewScore * 0.4;

      return { patternId, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get top N recommendations based on tracked interactions.
 */
export function getTopRecommendations(
  allPatterns: string[],
  limit: number = 3,
  excludePattern?: string,
): string[] {
  return getRecommendationScores(allPatterns, excludePattern)
    .filter((rec) => rec.score > 0)
    .slice(0, limit)
    .map((rec) => rec.patternId);
}

/**
 * Clear all tracking data.
 */
export function clearTrackerData(): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get all interactions for analytics.
 */
export function getAllInteractions(): PatternInteraction[] {
  const state = getTrackerState();
  return Object.values(state.interactions);
}

/**
 * Check if tracking data exists.
 */
export function hasTrackerData(): boolean {
  const state = getTrackerState();
  return Object.keys(state.interactions).length > 0;
}
