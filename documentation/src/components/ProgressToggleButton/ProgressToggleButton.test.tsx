import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProgressToggleButton from './ProgressToggleButton';
import { ProgressProvider } from '@site/src/contexts/ProgressContext';

const STORAGE_KEY = 'sc-tutorial-progress';
const PATH = '/docs/patterns/escrow-basic';

function renderButton(path = PATH) {
  return render(
    <ProgressProvider>
      <ProgressToggleButton path={path} />
    </ProgressProvider>,
  );
}

function toggle() {
  act(() => {
    screen.getByRole('button').click();
  });
}

function storedPaths(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('ProgressToggleButton', () => {
  describe('rendering', () => {
    it('starts in the incomplete state', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Mark as Complete');
      expect(button).toHaveAttribute('aria-pressed', 'false');
      expect(button).toHaveAttribute('data-completed', 'false');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('renders as completed when the path is already stored', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([PATH]));

      renderButton();

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Marked as Completed');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('stays incomplete when only other paths are stored', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['/docs/patterns/staking']));

      renderButton();

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('toggling', () => {
    it('marks the page complete on click', () => {
      renderButton();

      toggle();

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Marked as Completed');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('data-completed', 'true');
    });

    it('marks the page incomplete again on a second click', () => {
      renderButton();

      toggle();
      toggle();

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('persistence', () => {
    it('writes the completed path to localStorage', () => {
      renderButton();

      toggle();

      expect(storedPaths()).toEqual([PATH]);
    });

    it('removes the path from localStorage when unmarked', () => {
      renderButton();

      toggle();
      toggle();

      expect(storedPaths()).toEqual([]);
    });

    it('restores completion after a remount', () => {
      const { unmount } = renderButton();
      toggle();
      unmount();

      renderButton();

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps progress recorded for other pages', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['/docs/patterns/staking']));

      renderButton();
      toggle();

      expect(storedPaths()).toEqual(['/docs/patterns/staking', PATH]);
    });

    it('ignores a corrupted localStorage payload', () => {
      window.localStorage.setItem(STORAGE_KEY, '{not json');

      renderButton();

      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('still toggles when localStorage writes throw', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      renderButton();
      toggle();

      // Storage failed, but the UI must not break.
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
