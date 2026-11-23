import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import KeyboardShortcuts from './KeyboardShortcuts';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<KeyboardShortcuts />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fire(key: string, target: EventTarget = window, extra: Partial<KeyboardEventInit> = {}) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }));
  });
}

function dialog(): HTMLElement | null {
  return container.querySelector('[role="dialog"]');
}

describe('KeyboardShortcuts', () => {
  describe('? key — help dialog', () => {
    it('opens the help dialog when ? is pressed', () => {
      expect(dialog()).toBeNull();
      fire('?');
      expect(dialog()).toBeInTheDocument();
    });

    it('dialog has accessible role and label', () => {
      fire('?');
      const d = dialog();
      expect(d).toHaveAttribute('role', 'dialog');
      expect(d).toHaveAttribute('aria-label', 'Keyboard shortcuts');
    });

    it('toggles the dialog closed when ? is pressed again', () => {
      fire('?');
      expect(dialog()).toBeInTheDocument();
      fire('?');
      expect(dialog()).toBeNull();
    });

    it('lists all expected shortcuts inside the dialog', () => {
      fire('?');
      const items = container.querySelectorAll('kbd');
      const keys = Array.from(items).map((el) => el.textContent);
      expect(keys).toContain('/');
      expect(keys).toContain('t');
      expect(keys).toContain('?');
      expect(keys).toContain('Esc');
    });
  });

  describe('Escape key — closes dialog', () => {
    it('closes the help dialog when Escape is pressed', () => {
      fire('?');
      expect(dialog()).toBeInTheDocument();
      fire('Escape');
      expect(dialog()).toBeNull();
    });

    it('does nothing (no error) when Escape is pressed while dialog is already closed', () => {
      expect(dialog()).toBeNull();
      expect(() => fire('Escape')).not.toThrow();
      expect(dialog()).toBeNull();
    });
  });

  describe('close button', () => {
    it('closes the dialog when the × button is clicked', () => {
      fire('?');
      const closeBtn = container.querySelector<HTMLButtonElement>(
        '[aria-label="Close keyboard shortcuts dialog"]',
      );
      expect(closeBtn).toBeInTheDocument();
      act(() => closeBtn!.click());
      expect(dialog()).toBeNull();
    });
  });

  describe('/ key — focus search', () => {
    it('calls focus() on the search input when / is pressed', () => {
      const input = document.createElement('input');
      input.className = 'navbar__search-input';
      document.body.appendChild(input);
      const focusSpy = vi.spyOn(input, 'focus');

      fire('/');

      expect(focusSpy).toHaveBeenCalledOnce();
      document.body.removeChild(input);
    });

    it('does nothing (no error) when no search input is present', () => {
      expect(() => fire('/')).not.toThrow();
    });
  });

  describe('t key — theme toggle', () => {
    it('sets data-theme to "dark" when no theme is currently set', () => {
      fire('t');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('toggles from dark to light', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      fire('t');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('toggles from light to dark', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      fire('t');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('persists the new theme to localStorage', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      fire('t');
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('does not throw when localStorage is unavailable', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => fire('t')).not.toThrow();
    });
  });

  describe('[ and ] keys — adjacent page navigation', () => {
    it('clicks the previous-page link when [ is pressed', () => {
      const prevLink = document.createElement('a');
      prevLink.className = 'pagination-nav__link--prev';
      document.body.appendChild(prevLink);
      const clickSpy = vi.spyOn(prevLink, 'click');

      fire('[');

      expect(clickSpy).toHaveBeenCalledOnce();
      document.body.removeChild(prevLink);
    });

    it('clicks the next-page link when ] is pressed', () => {
      const nextLink = document.createElement('a');
      nextLink.className = 'pagination-nav__link--next';
      document.body.appendChild(nextLink);
      const clickSpy = vi.spyOn(nextLink, 'click');

      fire(']');

      expect(clickSpy).toHaveBeenCalledOnce();
      document.body.removeChild(nextLink);
    });
  });

  describe('g → h sequence — go home', () => {
    it('clicks the home link when g then h are pressed in quick succession', () => {
      const brand = document.createElement('a');
      brand.className = 'navbar__brand';
      document.body.appendChild(brand);
      const clickSpy = vi.spyOn(brand, 'click');

      fire('g');
      fire('h');

      expect(clickSpy).toHaveBeenCalledOnce();
      document.body.removeChild(brand);
    });

    it('does not click home when h is pressed without a preceding g', () => {
      const brand = document.createElement('a');
      brand.className = 'navbar__brand';
      document.body.appendChild(brand);
      const clickSpy = vi.spyOn(brand, 'click');

      fire('h');

      expect(clickSpy).not.toHaveBeenCalled();
      document.body.removeChild(brand);
    });
  });

  describe('input element guard — shortcuts ignored while typing', () => {
    it('does not open the dialog when ? is pressed inside an input', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);

      fire('?', input);

      expect(dialog()).toBeNull();
      document.body.removeChild(input);
    });

    it('does not toggle theme when t is pressed inside a textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      fire('t', textarea);

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
      document.body.removeChild(textarea);
    });

    it('does not focus search when / is pressed inside a select', () => {
      const input = document.createElement('input');
      input.className = 'navbar__search-input';
      document.body.appendChild(input);
      const focusSpy = vi.spyOn(input, 'focus');

      const select = document.createElement('select');
      document.body.appendChild(select);
      fire('/', select);

      expect(focusSpy).not.toHaveBeenCalled();
      document.body.removeChild(input);
      document.body.removeChild(select);
    });
  });

  describe('modifier key guard — shortcuts ignored with Ctrl/Meta/Alt', () => {
    it('does not open the dialog when Ctrl+? is pressed', () => {
      fire('?', window, { ctrlKey: true });
      expect(dialog()).toBeNull();
    });

    it('does not toggle theme when Meta+t is pressed', () => {
      fire('t', window, { metaKey: true });
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });
  });
});
