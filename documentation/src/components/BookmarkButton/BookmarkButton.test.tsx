import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { BookmarkButton } from './BookmarkButton';

const { location } = vi.hoisted(() => ({
  location: { pathname: '/docs/test-page' },
}));
vi.mock('@docusaurus/router', () => ({ useLocation: () => location }));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  vi.clearAllMocks();
  location.pathname = '/docs/test-page';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderButton(props: React.ComponentProps<typeof BookmarkButton> = {}) {
  act(() => root.render(<BookmarkButton {...props} />));
}

function getButton(): HTMLButtonElement {
  return container.querySelector('button') as HTMLButtonElement;
}

describe('BookmarkButton', () => {
  it('renders "☆ Bookmark" when the page is not bookmarked', () => {
    renderButton();
    expect(getButton().textContent).toBe('☆ Bookmark');
  });

  it('renders "✓ Saved" after clicking to bookmark the page', () => {
    renderButton();
    act(() => getButton().click());
    expect(getButton().textContent).toBe('✓ Saved');
  });

  it('sets aria-pressed to false when not bookmarked', () => {
    renderButton();
    expect(getButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets aria-pressed to true when bookmarked', () => {
    renderButton();
    act(() => getButton().click());
    expect(getButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls toggleBookmark (persists to localStorage) on click', () => {
    renderButton();
    act(() => getButton().click());
    const stored = JSON.parse(localStorage.getItem('bookmarks') ?? '[]');
    expect(stored).toContain('/docs/test-page');
  });

  it('removes the bookmark on a second click', () => {
    renderButton();
    act(() => getButton().click());
    act(() => getButton().click());
    const stored = JSON.parse(localStorage.getItem('bookmarks') ?? '[]');
    expect(stored).not.toContain('/docs/test-page');
    expect(getButton().textContent).toBe('☆ Bookmark');
  });

  it('uses the explicit path prop instead of the current pathname', () => {
    renderButton({ path: '/docs/explicit-path' });
    act(() => getButton().click());
    const stored = JSON.parse(localStorage.getItem('bookmarks') ?? '[]');
    expect(stored).toContain('/docs/explicit-path');
    expect(stored).not.toContain('/docs/test-page');
  });

  it('applies the aria-label "Add bookmark" when not bookmarked', () => {
    renderButton();
    expect(getButton()).toHaveAttribute('aria-label', 'Add bookmark');
  });

  it('applies the aria-label "Remove bookmark" when bookmarked', () => {
    renderButton();
    act(() => getButton().click());
    expect(getButton()).toHaveAttribute('aria-label', 'Remove bookmark');
  });

  it('degrades gracefully when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    // Should render without throwing
    renderButton();
    expect(getButton().textContent).toBe('☆ Bookmark');

    // Clicking should toggle in-memory state without throwing
    act(() => getButton().click());
    expect(getButton().textContent).toBe('✓ Saved');
  });
});
