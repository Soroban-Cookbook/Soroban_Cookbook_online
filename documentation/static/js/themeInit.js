/**
 * Theme Initialization Script
 * 
 * This script runs immediately to prevent flash of incorrect theme (FOIT).
 * It should be included in the <head> of the document.
 * 
 * How it works:
 * 1. Checks localStorage for saved theme preference
 * 2. Falls back to system preference (prefers-color-scheme)
 * 3. Applies theme before page renders
 * 4. Prevents flash of wrong theme
 */

(function() {
  'use strict';

  const THEME_KEY = 'theme';
  const THEME_ATTRIBUTE = 'data-theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#1e1e2e' : '#ffffff'
      );
    }
  }

  // Initialize theme immediately
  const storedTheme = getStoredTheme();
  const systemTheme = getSystemTheme();
  const theme = storedTheme || systemTheme;

  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    // Only update if no stored preference
    if (!getStoredTheme()) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
