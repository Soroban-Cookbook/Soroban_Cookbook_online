/**
 * Search Filter Utilities
 * Client-side filtering for search results based on metadata
 */

import type { SearchFilterState } from '../components/SearchFilters';

/**
 * Map document paths to their metadata (category, difficulty, tags).
 *
 * Keys are the path segment after /docs/ with no leading or trailing slash.
 * Keep entries sorted alphabetically within each section.
 */
const DOCUMENT_METADATA: Record<string, DocumentMetadata> = {
  // ── Getting Started ────────────────────────────────────────────────────────
  'getting-started/api-security': {
    category: 'getting-started',
    difficulty: 'advanced',
    tags: ['auth'],
  },
  'getting-started/building-and-compilation': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/contract-interaction': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: [],
  },
  'getting-started/contract-testing': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: [],
  },
  'getting-started/debugging': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: ['errors'],
  },
  'getting-started/deploy-mainnet': {
    category: 'getting-started',
    difficulty: 'advanced',
    tags: [],
  },
  'getting-started/deploy-testnet': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: [],
  },
  'getting-started/first-contract': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/local-testing': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/local-testing-and-simulation': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: [],
  },
  'getting-started/setup': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/setup-linux': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/setup-macos': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/setup-windows': {
    category: 'getting-started',
    difficulty: 'beginner',
    tags: [],
  },
  'getting-started/testing-errors': {
    category: 'getting-started',
    difficulty: 'intermediate',
    tags: ['errors'],
  },

  // ── Core Concepts ──────────────────────────────────────────────────────────
  'concepts/authorization': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['auth'],
  },
  'concepts/best-practices': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['optimization'],
  },
  'concepts/cross-contract-invocation': {
    category: 'concepts',
    difficulty: 'advanced',
    tags: [],
  },
  'concepts/error-handling': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['errors'],
  },
  'concepts/events': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['events'],
  },
  'concepts/gas-and-resources': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['optimization'],
  },
  'concepts/introduction': {
    category: 'concepts',
    difficulty: 'beginner',
    tags: [],
  },
  'concepts/overview': {
    category: 'concepts',
    difficulty: 'beginner',
    tags: [],
  },
  'concepts/storage': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: ['storage'],
  },
  'concepts/testing-strategies': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: [],
  },
  'concepts/token-standards': {
    category: 'concepts',
    difficulty: 'intermediate',
    tags: [],
  },

  // ── Patterns ───────────────────────────────────────────────────────────────
  'patterns/authorization': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: ['auth'],
  },
  'patterns/basic-token': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: ['storage', 'events'],
  },
  'patterns/contract-factory': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: [],
  },
  'patterns/custom-types': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: ['storage'],
  },
  'patterns/error-handling': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: ['errors'],
  },
  'patterns/error-recovery': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: ['errors'],
  },
  'patterns/escrow-multiparty': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: ['auth', 'storage'],
  },
  'patterns/hello-world': {
    category: 'patterns',
    difficulty: 'beginner',
    tags: ['storage'],
  },
  'patterns/lifecycle-upgrades': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: [],
  },
  'patterns/optimization-playbook': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: ['optimization'],
  },
  'patterns/oracle-consumer': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: ['events'],
  },
  'patterns/overview': {
    category: 'patterns',
    difficulty: 'beginner',
    tags: [],
  },
  'patterns/proposal-lifecycle': {
    category: 'patterns',
    difficulty: 'advanced',
    tags: ['auth', 'events'],
  },
  'patterns/timelock-vault': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: ['storage'],
  },
  'patterns/token-standards': {
    category: 'patterns',
    difficulty: 'intermediate',
    tags: [],
  },

  // ── Security ───────────────────────────────────────────────────────────────
  'security/code-audit': {
    category: 'security',
    difficulty: 'advanced',
    tags: [],
  },
  'security/defi-patterns': {
    category: 'security',
    difficulty: 'advanced',
    tags: ['optimization'],
  },
  'security/fundamentals': {
    category: 'security',
    difficulty: 'intermediate',
    tags: ['auth'],
  },
  'security/governance': {
    category: 'security',
    difficulty: 'advanced',
    tags: ['auth', 'events'],
  },
  'security/token-audit': {
    category: 'security',
    difficulty: 'advanced',
    tags: [],
  },
};

export interface DocumentMetadata {
  category: string;
  difficulty: string;
  tags: string[];
}

/**
 * Extract path from search result URL
 */
function extractPath(url: string): string {
  // Remove leading /docs/ and trailing slashes
  const path = url.replace(/^\/docs\//, '').replace(/\/$/, '');
  return path;
}

/**
 * Get metadata for a document URL
 */
export function getDocumentMetadata(url: string): DocumentMetadata | null {
  const path = extractPath(url);
  return DOCUMENT_METADATA[path] || null;
}

/**
 * Check if a document matches the active filters
 */
export function matchesFilters(documentUrl: string, filters: SearchFilterState): boolean {
  const metadata = getDocumentMetadata(documentUrl);

  if (!metadata) {
    // If we don't have metadata, include the result
    return true;
  }

  // If no filters active, include everything
  if (
    filters.categories.length === 0 &&
    filters.difficulty.length === 0 &&
    filters.tags.length === 0
  ) {
    return true;
  }

  // Category filter: must match if active
  if (filters.categories.length > 0) {
    if (!filters.categories.includes(metadata.category)) {
      return false;
    }
  }

  // Difficulty filter: must match if active
  if (filters.difficulty.length > 0) {
    if (!filters.difficulty.includes(metadata.difficulty)) {
      return false;
    }
  }

  // Tags filter: must match at least one tag if active
  if (filters.tags.length > 0) {
    const hasMatchingTag = filters.tags.some((tag) => metadata.tags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
}
