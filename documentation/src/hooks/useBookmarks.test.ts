/**
 * Tests for useBookmarks' localStorage write failure path (issue #1535).
 *
 * `toggleBookmark` must not crash when `localStorage.setItem` throws (e.g.
 * quota exceeded), and the in-memory state should still update optimistically.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookmarks } from './useBookmarks';

describe('useBookmarks — localStorage write failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('does not crash and still updates in-memory state when setItem throws', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const { result } = renderHook(() => useBookmarks());

    expect(() => {
      act(() => {
        result.current.toggleBookmark('/docs/intro');
      });
    }).not.toThrow();

    expect(result.current.bookmarks).toEqual(['/docs/intro']);
    expect(result.current.isBookmarked('/docs/intro')).toBe(true);
    expect(setItemSpy).toHaveBeenCalled();
  });
});
