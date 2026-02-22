/**
 * ThemeToggle Component - Dark mode toggle with persistence
 * 
 * Features:
 * - Smooth toggle animation
 * - LocalStorage persistence
 * - Respects system preference
 * - No flash on page load (use with ThemeProvider)
 * - Accessible: WCAG 2.1 AA compliant
 * - Keyboard navigation support
 */

import React, { useCallback, useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

export interface ThemeToggleProps {
  /** Additional CSS class */
  className?: string;
  /** Show label alongside toggle */
  showLabel?: boolean;
  /** Custom label for light mode */
  lightLabel?: string;
  /** Custom label for dark mode */
  darkLabel?: string;
  /** Size of the toggle */
  size?: 'small' | 'medium' | 'large';
  /** Callback when theme changes */
  onThemeChange?: (theme: Theme) => void;
}

/* ── Constants ──────────────────────────────────────────────────────────────── */

const THEME_STORAGE_KEY = 'theme';
const THEME_ATTRIBUTE = 'data-theme';

/* ── Component ──────────────────────────────────────────────────────────────── */

export function ThemeToggle({
  className = '',
  showLabel = false,
  lightLabel = 'Light',
  darkLabel = 'Dark',
  size = 'medium',
  onThemeChange,
}: ThemeToggleProps): JSX.Element {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): Theme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof document === 'undefined') return;
    
    document.documentElement.setAttribute(THEME_ATTRIBUTE, newTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        newTheme === 'dark' ? '#1e1e2e' : '#ffffff'
      );
    }
  }, []);

  // Handle theme toggle
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    onThemeChange?.(newTheme);
  }, [theme, applyTheme, onThemeChange]);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initialTheme = savedTheme || getSystemTheme();
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, [applyTheme, getSystemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no saved preference
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!savedTheme) {
        const newTheme: Theme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return <div className={`${styles.placeholder} ${styles[size]}`} />;
  }

  const classNames = [
    styles.toggle,
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
      title={`Current: ${theme} mode`}
    >
      {/* Sun Icon (Light Mode) */}
      <span className={styles.sunIcon} aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </span>

      {/* Moon Icon (Dark Mode) */}
      <span className={styles.moonIcon} aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Label (optional) */}
      {showLabel && (
        <span className={styles.label}>
          {theme === 'dark' ? darkLabel : lightLabel}
        </span>
      )}
    </button>
  );
}

/* ── Theme Utilities ────────────────────────────────────────────────────────── */

/**
 * Get the current theme from localStorage or system preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
}

/**
 * Set theme in localStorage and apply to document
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

/**
 * Initialize theme immediately (call in head to prevent flash)
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return;
  
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  const theme = savedTheme || systemTheme;
  
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

/* ── Default Export ─────────────────────────────────────────────────────────── */

export default ThemeToggle;
