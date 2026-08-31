import React, { useEffect, useRef, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import styles from './KeyboardShortcuts.module.css';

/**
 * Site-wide keyboard shortcuts: navigation, search focus, and theme toggle.
 * Press `?` to open the help dialog listing every shortcut.
 */

const SEARCH_INPUT_SELECTOR = '.navbar__search-input';
const HOME_LINK_SELECTOR = '.navbar__brand';
const G_PREFIX_WINDOW_MS = 600;

interface ShortcutEntry {
  keys: string;
  description: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: '/', description: 'Focus search' },
  { keys: 'g then h', description: 'Go to homepage' },
  { keys: '[', description: 'Previous page' },
  { keys: ']', description: 'Next page' },
  { keys: 't', description: 'Toggle light / dark theme' },
  { keys: '?', description: 'Show this help dialog' },
  { keys: 'Esc', description: 'Close this dialog' },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function focusSearch(): void {
  document.querySelector<HTMLInputElement>(SEARCH_INPUT_SELECTOR)?.focus();
}

function goHome(): void {
  document.querySelector<HTMLAnchorElement>(HOME_LINK_SELECTOR)?.click();
}

function goToAdjacentPage(direction: 'prev' | 'next'): void {
  document.querySelector<HTMLAnchorElement>(`.pagination-nav__link--${direction}`)?.click();
}

export default function KeyboardShortcuts(): React.JSX.Element | null {
  const [helpOpen, setHelpOpen] = useState(false);
  const { colorMode, setColorMode } = useColorMode();
  const gPressedAtRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === 'Escape') {
        setHelpOpen(false);
        return;
      }

      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case '?':
          event.preventDefault();
          setHelpOpen((open) => !open);
          break;
        case '/':
          event.preventDefault();
          focusSearch();
          break;
        case 't':
          setColorMode(colorMode === 'dark' ? 'light' : 'dark');
          break;
        case '[':
          goToAdjacentPage('prev');
          break;
        case ']':
          goToAdjacentPage('next');
          break;
        case 'g':
          gPressedAtRef.current = Date.now();
          break;
        case 'h':
          if (Date.now() - gPressedAtRef.current < G_PREFIX_WINDOW_MS) {
            goHome();
            gPressedAtRef.current = 0;
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [colorMode, setColorMode]);

  if (!helpOpen) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts">
        <div className={styles.header}>
          <h2 className={styles.title}>Keyboard shortcuts</h2>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close keyboard shortcuts dialog"
            onClick={() => setHelpOpen(false)}>
            &times;
          </button>
        </div>
        <ul className={styles.list}>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className={styles.item}>
              <kbd className={styles.kbd}>{shortcut.keys}</kbd>
              <span className={styles.description}>{shortcut.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
