import registryData from '../../src/components/recommendations/contentRegistry.json';
import { UserPreferences } from './tracker';

export interface RegistryDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  status: string;
  time: number;
  tags: string[];
  href: string;
}

const registry = registryData as RegistryDocument[];

const DIFFICULTY_MAP: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

// Simple lightweight cache
const recommendationCache = new Map<string, RegistryDocument[]>();
const MAX_CACHE_SIZE = 100;

function getPreferredDifficulty(preferences: UserPreferences): string {
  let preferred = 'beginner';
  let maxCount = 0;
  for (const [diff, count] of Object.entries(preferences.difficultyPreferences || {})) {
    if (count > maxCount) {
      maxCount = count;
      preferred = diff;
    }
  }
  return preferred;
}

export function getRecommendations(
  currentDocId: string,
  history: string[],
  preferences: UserPreferences,
  limit: number = 3
): RegistryDocument[] {
  // Generate cache key
  const cacheKey = `${currentDocId}_${history.join(',')}_${JSON.stringify(preferences.categoryPreferences)}_${JSON.stringify(preferences.difficultyPreferences)}_${JSON.stringify(preferences.tagPreferences)}_${limit}`;

  if (recommendationCache.has(cacheKey)) {
    return recommendationCache.get(cacheKey)!;
  }

  // Find metadata of current document
  const currentDoc = registry.find((doc) => doc.id === currentDocId);
  const currentCategory = currentDoc?.category || '';
  const currentTags = currentDoc?.tags || [];
  const currentDifficulty = currentDoc?.difficulty || 'beginner';
  const currentDiffLevel = DIFFICULTY_MAP[currentDifficulty] || 1;

  const preferredDifficulty = getPreferredDifficulty(preferences);

  // Score candidate documents
  const scoredDocs = registry
    .filter((doc) => doc.id !== currentDocId) // Exclude current document
    .map((doc) => {
      let score = 0;

      // 1. Category Matching (Weight: High)
      if (currentCategory && doc.category === currentCategory) {
        score += 8;
      }
      // Preference matching for category
      if (doc.category && preferences.categoryPreferences) {
        const catVisits = preferences.categoryPreferences[doc.category] || 0;
        score += Math.min(catVisits * 2, 8); // Cap to avoid overwhelming
      }

      // 2. Tag Matching (Weight: Medium)
      if (Array.isArray(doc.tags)) {
        // Direct overlap with current document
        const overlappingTags = doc.tags.filter((t) => currentTags.includes(t));
        score += overlappingTags.length * 3;

        // Overlap with user's preferred tags
        if (preferences.tagPreferences) {
          doc.tags.forEach((tag) => {
            const tagVisits = preferences.tagPreferences[tag] || 0;
            score += Math.min(tagVisits * 1, 4); // Cap tag preference weight
          });
        }
      }

      // 3. Difficulty Level Progression (Weight: Medium)
      const docDiffLevel = DIFFICULTY_MAP[doc.difficulty] || 1;
      if (currentDoc) {
        if (docDiffLevel === currentDiffLevel) {
          score += 4; // Keep same level
        } else if (docDiffLevel === currentDiffLevel + 1) {
          score += 6; // Encourage next step up (progression)
        } else if (docDiffLevel === currentDiffLevel - 1) {
          score += 2; // Revision fallback
        }
      }
      // User general preference for difficulty
      if (doc.difficulty === preferredDifficulty) {
        score += 2;
      }

      // 4. Recency & History Penalty (Weight: Severe)
      if (history && history.length > 0) {
        const historyIndex = history.indexOf(doc.id);
        if (historyIndex === 0) {
          // Immediately preceding page: major penalty (user likely just left this page)
          score -= 15;
        } else if (historyIndex > 0) {
          // Visited recently: mild penalty to encourage discovering new pages
          score -= 6;
        }
      }

      // 5. Stable ordering (tie-breaker)
      // Slight bump for items that are stable in directory ordering to prevent flickering
      score += (1000 - doc.id.localeCompare(currentDocId)) * 0.0001;

      return { doc, score };
    });

  // Sort by score descending and take the top N
  const results = scoredDocs
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.doc);

  // If we ended up with fewer than requested or low relevance, fill up with featured docs
  if (results.length < limit) {
    const featuredFallbackIds = [
      'getting-started/setup',
      'getting-started/first-contract',
      'patterns/hello-world',
      'concepts/overview',
    ];
    
    for (const fallbackId of featuredFallbackIds) {
      if (results.length >= limit) break;
      if (fallbackId === currentDocId) continue;
      
      const fallbackDoc = registry.find((d) => d.id === fallbackId);
      if (fallbackDoc && !results.some((r) => r.id === fallbackId)) {
        results.push(fallbackDoc);
      }
    }
  }

  // Manage cache size
  if (recommendationCache.size >= MAX_CACHE_SIZE) {
    recommendationCache.clear();
  }
  recommendationCache.set(cacheKey, results);

  return results;
}
