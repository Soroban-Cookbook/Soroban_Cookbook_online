import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBookmarks } from './useBookmarks';

describe('useBookmarks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the bookmarks array available while supporting membership checks', () => {
    localStorage.setItem('bookmarks', JSON.stringify(['/docs/one', '/docs/two']));

    const { result } = renderHook(() => useBookmarks());

    expect(result.current.bookmarks).toEqual(['/docs/one', '/docs/two']);
    expect(result.current.isBookmarked('/docs/two')).toBe(true);
    expect(result.current.isBookmarked('/docs/other')).toBe(false);

    act(() => result.current.removeBookmark('/docs/one'));

    expect(result.current.bookmarks).toEqual(['/docs/two']);
    expect(result.current.isBookmarked('/docs/one')).toBe(false);
  });
});
