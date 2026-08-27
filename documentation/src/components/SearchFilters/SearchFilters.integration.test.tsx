import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchFilters, { type SearchFilterState } from './SearchFilters';
import { matchesFilters } from '@site/src/utils/searchFilterUtils';

/**
 * Integration test: prove that filter state emitted by <SearchFilters>
 * actually narrows a realistic result list when fed through matchesFilters().
 *
 * The fixture below mirrors DOCUMENT_METADATA in searchFilterUtils.ts — keeping
 * the URLs as constants here makes the test self-documenting (anyone can read
 * it as "given the docs we have, here's what the user should see under these
 * filters") without having to open the metadata module.
 */
const FIXTURE = [
  '/docs/getting-started/setup', // gs / beginner / []
  '/docs/getting-started/deploy-testnet', // gs / intermediate / []
  '/docs/getting-started/testing-errors', // gs / intermediate / [errors]
  '/docs/concepts/authorization', // concepts / intermediate / [auth]
  '/docs/concepts/storage', // concepts / intermediate / [storage]
  '/docs/concepts/cross-contract-invocation', // concepts / advanced / []
  '/docs/patterns/hello-world', // patterns / beginner / []
  '/docs/patterns/error-handling', // patterns / intermediate / [errors]
  '/docs/patterns/optimization-playbook', // patterns / advanced / [optimization]
  '/docs/security/fundamentals', // security / intermediate / [auth]
];

function visibleUrls(state: SearchFilterState): string[] {
  return FIXTURE.filter((url) => matchesFilters(url, state));
}

interface FilterHarness {
  togglePanel: () => void;
  clickCategory: (label: string) => void;
  clickDifficulty: (label: string) => void;
  clickTag: (label: string) => void;
  clickClearAll: () => void;
  getLatestState: () => SearchFilterState;
}

function mountWithCapture(): FilterHarness {
  let latest: SearchFilterState = { categories: [], difficulty: [], tags: [] };
  const onFilterChange = vi.fn((s: SearchFilterState) => {
    latest = s;
  });
  render(<SearchFilters onFilterChange={onFilterChange} />);

  return {
    togglePanel: () => {
      fireEvent.click(screen.getByRole('button', { name: /search filters/i }));
    },
    clickCategory: (label: string) => {
      fireEvent.click(screen.getByLabelText(label));
    },
    clickDifficulty: (label: string) => {
      fireEvent.click(screen.getByLabelText(label));
    },
    clickTag: (label: string) => {
      fireEvent.click(screen.getByLabelText(label));
    },
    clickClearAll: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    },
    getLatestState: () => latest,
  };
}

describe('SearchFilters + matchesFilters integration', () => {
  describe('with no filters active', () => {
    it('shows every fixture URL', () => {
      const h = mountWithCapture();
      h.togglePanel();
      // No clicks — state remains empty.
      expect(visibleUrls(h.getLatestState())).toHaveLength(FIXTURE.length);
    });
  });

  describe('single-axis filters', () => {
    it('category=concepts narrows to 3 fixture URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      const visible = visibleUrls(h.getLatestState());
      expect(visible).toEqual([
        '/docs/concepts/authorization',
        '/docs/concepts/storage',
        '/docs/concepts/cross-contract-invocation',
      ]);
    });

    it('category=getting-started narrows to 3 fixture URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Getting Started');
      const visible = visibleUrls(h.getLatestState());
      expect(visible).toEqual([
        '/docs/getting-started/setup',
        '/docs/getting-started/deploy-testnet',
        '/docs/getting-started/testing-errors',
      ]);
    });

    it('difficulty=advanced narrows to 2 fixture URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickDifficulty('Advanced');
      expect(visibleUrls(h.getLatestState())).toEqual([
        '/docs/concepts/cross-contract-invocation',
        '/docs/patterns/optimization-playbook',
      ]);
    });

    it('tag=auth narrows to 2 fixture URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickTag('Authorization');
      expect(visibleUrls(h.getLatestState())).toEqual([
        '/docs/concepts/authorization',
        '/docs/security/fundamentals',
      ]);
    });

    it('tag=errors narrows across categories to 2 fixture URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickTag('Error Handling');
      expect(visibleUrls(h.getLatestState())).toEqual([
        '/docs/getting-started/testing-errors',
        '/docs/patterns/error-handling',
      ]);
    });
  });

  describe('multi-axis narrowing', () => {
    it('concepts + advanced narrows to a single fixture URL', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      h.clickDifficulty('Advanced');
      expect(visibleUrls(h.getLatestState())).toEqual(['/docs/concepts/cross-contract-invocation']);
    });

    it('concepts + intermediate + storage narrows to a single fixture URL', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      h.clickDifficulty('Intermediate');
      h.clickTag('Storage');
      expect(visibleUrls(h.getLatestState())).toEqual(['/docs/concepts/storage']);
    });

    it('adding a tag that nothing matches yields zero visible URLs', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Getting Started');
      h.clickTag('Storage'); // nothing in getting-started has the storage tag
      expect(visibleUrls(h.getLatestState())).toEqual([]);
    });

    it('multiple categories behave as OR within the category axis', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      h.clickCategory('Patterns');
      const visible = visibleUrls(h.getLatestState());
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.some((u) => u.startsWith('/docs/concepts/'))).toBe(true);
      expect(visible.some((u) => u.startsWith('/docs/patterns/'))).toBe(true);
      expect(visible.some((u) => u.startsWith('/docs/getting-started/'))).toBe(false);
    });
  });

  describe('filter monotonicity', () => {
    it('each successive filter never increases the visible set', () => {
      const h = mountWithCapture();
      h.togglePanel();

      const start = FIXTURE.length;
      h.clickCategory('Core Concepts');
      const afterCat = visibleUrls(h.getLatestState()).length;

      h.clickDifficulty('Intermediate');
      const afterDiff = visibleUrls(h.getLatestState()).length;

      h.clickTag('Storage');
      const afterTag = visibleUrls(h.getLatestState()).length;

      expect(afterCat).toBeLessThanOrEqual(start);
      expect(afterDiff).toBeLessThanOrEqual(afterCat);
      expect(afterTag).toBeLessThanOrEqual(afterDiff);
      expect(afterTag).toBe(1); // only /docs/concepts/storage matches all three
    });
  });

  describe('clearing filters', () => {
    it('clear all restores full fixture visibility', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      h.clickDifficulty('Advanced');
      h.clickTag('Optimization');
      // Sanity check: filtering is non-trivial before clearing.
      expect(visibleUrls(h.getLatestState()).length).toBe(0);

      h.clickClearAll();
      expect(visibleUrls(h.getLatestState())).toHaveLength(FIXTURE.length);
    });

    it('toggling off (rather than clear-all) restores the previous category', () => {
      const h = mountWithCapture();
      h.togglePanel();
      h.clickCategory('Core Concepts');
      // After clicking the same label twice, the second click toggles it back off.
      h.clickCategory('Core Concepts');
      expect(visibleUrls(h.getLatestState())).toHaveLength(FIXTURE.length);
    });
  });
});
