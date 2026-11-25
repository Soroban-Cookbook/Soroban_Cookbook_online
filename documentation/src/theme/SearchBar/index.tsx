import React, { useState, useEffect, useRef } from 'react';
import OriginalSearchBar from '@theme-original/SearchBar';
import type SearchBarType from '@theme/SearchBar';
import type { WrapperProps } from '@docusaurus/types';
import styles from './styles.module.css';
import { safeLocalStorage } from '../../utils/safeLocalStorage';

type Props = WrapperProps<typeof SearchBarType>;

const STORAGE_KEY = 'soroban_search_history';
const MAX_HISTORY = 5;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

export default function SearchBarWrapper(props: Props): React.ReactElement {
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load history from localStorage (safe: storage failures or corrupt JSON
  // simply start with an empty history)
  useEffect(() => {
    const stored = safeLocalStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setHistory(JSON.parse(stored));
    } catch {
      // Corrupt history payload — ignore and start fresh.
    }
  }, []);

  // Save history to localStorage (best-effort: the in-memory history stays
  // usable even when the write fails)
  const saveQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Find the input element inside the original search bar
  useEffect(() => {
    if (containerRef.current) {
      const input = containerRef.current.querySelector('input');
      if (input) {
        inputRef.current = input;

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            saveQuery(input.value);
            setIsOpen(false);
          }
        };

        const handleFocus = () => {
          setIsOpen(true);
        };

        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('focus', handleFocus);

        return () => {
          input.removeEventListener('keydown', handleKeyDown);
          input.removeEventListener('focus', handleFocus);
        };
      }
    }
  }, [containerRef]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Escape closes search focus / dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }

      const input = (containerRef.current?.querySelector('input[type="search"]') ||
        containerRef.current?.querySelector('input.navbar__search-input') ||
        document.querySelector('.navbar__search-input')) as HTMLElement | null;

      if (input) {
        input.blur();
      }
      setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleSelectHistory = (query: string) => {
    if (inputRef.current) {
      inputRef.current.value = query;
      inputRef.current.focus();
      const event = new Event('input', { bubbles: true });
      inputRef.current.dispatchEvent(event);
      saveQuery(query);
    }
    setIsOpen(false);
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    safeLocalStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return (
    <div ref={containerRef} className={styles.searchBarContainer}>
      <OriginalSearchBar {...props} />
      {isOpen && history.length > 0 && (
        <div className={styles.historyDropdown}>
          <div className={styles.historyHeader}>
            <span>Recent Searches</span>
            <button className={styles.clearButton} onClick={handleClearHistory}>
              Clear
            </button>
          </div>
          <ul className={styles.historyList}>
            {history.map((item, index) => (
              <li key={index} className={styles.historyItem}>
                <button
                  type="button"
                  className={styles.historyItemButton}
                  onClick={() => handleSelectHistory(item)}>
                  <svg
                    className={styles.clockIcon}
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className={styles.historyText}>{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
