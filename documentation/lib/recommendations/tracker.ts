export interface UserPreferences {
  categoryPreferences: Record<string, number>;
  tagPreferences: Record<string, number>;
  difficultyPreferences: Record<string, number>;
}

export interface UserHistory {
  visitedDocs: string[];
  preferences: UserPreferences;
}

const STORAGE_KEY = 'soroban_recommendations_history';
const MAX_HISTORY_LENGTH = 20;

const DEFAULT_HISTORY: UserHistory = {
  visitedDocs: [],
  preferences: {
    categoryPreferences: {},
    tagPreferences: {},
    difficultyPreferences: {},
  },
};

export function getHistory(): UserHistory {
  if (typeof window === 'undefined') {
    return DEFAULT_HISTORY;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HISTORY;
    const parsed = JSON.parse(raw);
    return {
      visitedDocs: Array.isArray(parsed.visitedDocs) ? parsed.visitedDocs : [],
      preferences: {
        categoryPreferences: parsed.preferences?.categoryPreferences || {},
        tagPreferences: parsed.preferences?.tagPreferences || {},
        difficultyPreferences: parsed.preferences?.difficultyPreferences || {},
      },
    };
  } catch (e) {
    console.error('Failed to parse recommendation history from localStorage', e);
    return DEFAULT_HISTORY;
  }
}

export function saveHistory(history: UserHistory): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save recommendation history to localStorage', e);
  }
}

export function trackDocVisit(
  docId: string,
  category: string,
  tags: string[],
  difficulty: string
): void {
  if (typeof window === 'undefined') return;
  if (!docId) return;

  const history = getHistory();

  // 1. Update visitedDocs list (move to front, cap at max length)
  const filteredDocs = history.visitedDocs.filter((id) => id !== docId);
  history.visitedDocs = [docId, ...filteredDocs].slice(0, MAX_HISTORY_LENGTH);

  // 2. Update category preference
  if (category) {
    const currentCatCount = history.preferences.categoryPreferences[category] || 0;
    history.preferences.categoryPreferences[category] = currentCatCount + 1;
  }

  // 3. Update difficulty preference
  if (difficulty) {
    const currentDiffCount = history.preferences.difficultyPreferences[difficulty] || 0;
    history.preferences.difficultyPreferences[difficulty] = currentDiffCount + 1;
  }

  // 4. Update tag preferences
  if (Array.isArray(tags)) {
    tags.forEach((tag) => {
      const currentTagCount = history.preferences.tagPreferences[tag] || 0;
      history.preferences.tagPreferences[tag] = currentTagCount + 1;
    });
  }

  saveHistory(history);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear recommendation history from localStorage', e);
  }
}
