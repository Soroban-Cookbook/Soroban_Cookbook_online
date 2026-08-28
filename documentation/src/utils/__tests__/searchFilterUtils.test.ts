import { describe, it, expect } from 'vitest';
import { getDocumentMetadata, matchesFilters } from '../searchFilterUtils';
import type { SearchFilterState } from '../../components/SearchFilters';

// ─── getDocumentMetadata ─────────────────────────────────────────────────────

describe('getDocumentMetadata', () => {
  describe('known document paths', () => {
    it('returns metadata for a getting-started page', () => {
      const meta = getDocumentMetadata('/docs/getting-started/setup');
      expect(meta).toEqual({
        category: 'getting-started',
        difficulty: 'beginner',
        tags: [],
      });
    });

    it('returns metadata for a concepts page', () => {
      const meta = getDocumentMetadata('/docs/concepts/authorization');
      expect(meta).toEqual({
        category: 'concepts',
        difficulty: 'intermediate',
        tags: ['auth'],
      });
    });

    it('returns metadata for a patterns page with tags', () => {
      const meta = getDocumentMetadata('/docs/patterns/error-handling');
      expect(meta).toEqual({
        category: 'patterns',
        difficulty: 'intermediate',
        tags: ['errors'],
      });
    });

    it('returns metadata for an advanced pattern', () => {
      const meta = getDocumentMetadata('/docs/patterns/optimization-playbook');
      expect(meta).toEqual({
        category: 'patterns',
        difficulty: 'advanced',
        tags: ['optimization'],
      });
    });

    it('returns metadata for a security page', () => {
      const meta = getDocumentMetadata('/docs/security/fundamentals');
      expect(meta).toEqual({
        category: 'security',
        difficulty: 'intermediate',
        tags: ['auth'],
      });
    });
  });

  describe('URL variant handling', () => {
    it('strips trailing slash from URLs', () => {
      const meta = getDocumentMetadata('/docs/getting-started/setup/');
      expect(meta).toBeDefined();
      expect(meta!.category).toBe('getting-started');
    });

    it('handles URL without /docs/ prefix (exact key match)', () => {
      // extractPath just strips /docs/, so bare 'getting-started/setup' still
      // matches the metadata key as-is.
      const meta = getDocumentMetadata('getting-started/setup');
      expect(meta).toEqual({
        category: 'getting-started',
        difficulty: 'beginner',
        tags: [],
      });
    });
  });

  describe('unknown document paths', () => {
    it('returns null for an unregistered path', () => {
      const meta = getDocumentMetadata('/docs/unknown/topic');
      expect(meta).toBeNull();
    });

    it('returns null for the root docs path', () => {
      const meta = getDocumentMetadata('/docs/');
      expect(meta).toBeNull();
    });

    it('returns null for an empty string', () => {
      const meta = getDocumentMetadata('');
      expect(meta).toBeNull();
    });
  });
});

// ─── matchesFilters ──────────────────────────────────────────────────────────

function makeFilters(overrides: Partial<SearchFilterState> = {}): SearchFilterState {
  return {
    categories: [],
    difficulty: [],
    tags: [],
    ...overrides,
  };
}

describe('matchesFilters', () => {
  describe('when no filters are active', () => {
    it('matches a known document', () => {
      expect(matchesFilters('/docs/getting-started/setup', makeFilters())).toBe(true);
    });

    it('matches an unknown document (pass-through)', () => {
      expect(matchesFilters('/docs/unknown/topic', makeFilters())).toBe(true);
    });
  });

  // ── Category filter ──────────────────────────────────────────────────────

  describe('category filter', () => {
    it('matches a document in the selected category', () => {
      const filters = makeFilters({ categories: ['getting-started'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(true);
    });

    it('rejects a document not in the selected category', () => {
      const filters = makeFilters({ categories: ['concepts'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(false);
    });

    it('matches when multiple categories are active', () => {
      const filters = makeFilters({ categories: ['getting-started', 'concepts'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(true);
      expect(matchesFilters('/docs/concepts/overview', filters)).toBe(true);
    });

    it('rejects when document category is not among the selected', () => {
      const filters = makeFilters({ categories: ['security'] });
      expect(matchesFilters('/docs/patterns/hello-world', filters)).toBe(false);
    });
  });

  // ── Difficulty filter ────────────────────────────────────────────────────

  describe('difficulty filter', () => {
    it('matches a beginner document when beginner is selected', () => {
      const filters = makeFilters({ difficulty: ['beginner'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(true);
    });

    it('rejects an advanced document when only beginner is selected', () => {
      const filters = makeFilters({ difficulty: ['beginner'] });
      expect(matchesFilters('/docs/patterns/optimization-playbook', filters)).toBe(false);
    });

    it('matches when multiple difficulties are active', () => {
      const filters = makeFilters({ difficulty: ['beginner', 'advanced'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(true);
      expect(matchesFilters('/docs/patterns/optimization-playbook', filters)).toBe(true);
    });
  });

  // ── Tag filter ───────────────────────────────────────────────────────────

  describe('tag filter', () => {
    it('matches a document with the selected tag', () => {
      const filters = makeFilters({ tags: ['errors'] });
      expect(matchesFilters('/docs/patterns/error-handling', filters)).toBe(true);
    });

    it('rejects a document without the selected tag', () => {
      const filters = makeFilters({ tags: ['errors'] });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(false);
    });

    it('matches a document that has at least one matching tag', () => {
      const filters = makeFilters({ tags: ['auth', 'errors'] });
      // authorization has 'auth' but not 'errors'
      expect(matchesFilters('/docs/concepts/authorization', filters)).toBe(true);
    });

    it('matches a document with all selected tags (implicit OR)', () => {
      const filters = makeFilters({ tags: ['storage', 'optimization'] });
      // best-practices has 'optimization' but not 'storage'
      expect(matchesFilters('/docs/concepts/best-practices', filters)).toBe(true);
    });
  });

  // ── Combined filters ─────────────────────────────────────────────────────

  describe('combined filters', () => {
    it('matches when all active filter groups are satisfied', () => {
      const filters = makeFilters({
        categories: ['concepts'],
        difficulty: ['intermediate'],
        tags: ['auth'],
      });
      // authorization: concepts, intermediate, auth
      expect(matchesFilters('/docs/concepts/authorization', filters)).toBe(true);
    });

    it('rejects when category matches but difficulty does not', () => {
      const filters = makeFilters({
        categories: ['patterns'],
        difficulty: ['beginner'],
      });
      // patterns/authorization: patterns, advanced
      expect(matchesFilters('/docs/patterns/authorization', filters)).toBe(false);
    });

    it('rejects when category and difficulty match but tag does not', () => {
      const filters = makeFilters({
        categories: ['getting-started'],
        difficulty: ['beginner'],
        tags: ['storage'],
      });
      expect(matchesFilters('/docs/getting-started/setup', filters)).toBe(false);
    });

    it('matches unknown documents even with active filters', () => {
      const filters = makeFilters({ categories: ['concepts'], difficulty: ['advanced'] });
      expect(matchesFilters('/docs/unknown/topic', filters)).toBe(true);
    });
  });
});
