import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

vi.mock('@docusaurus/Link', () => {
  return {
    default: ({ to, children, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
  };
});

vi.mock('@docusaurus/router', () => {
  return {
    useLocation: () => ({ pathname: '/' }),
  };
});

vi.mock('@docusaurus/Head', () => {
  return {
    default: (props: any) => React.createElement('head', null, props?.children),
  };
});

vi.mock('@docusaurus/useDocusaurusContext', () => {
  return {
    default: () => ({
      siteConfig: {
        url: 'https://soroban-cookbook.dev',
        baseUrl: '/',
      },
    }),
  };
});

vi.mock('@docusaurus/plugin-content-docs/client', () => {
  return {
    useSidebarBreadcrumbs: () => [],
    useDoc: () => ({
      metadata: {
        title: 'Doc',
        permalink: '/docs/doc',
      },
    }),
  };
});
import { toHaveNoViolations } from 'jest-axe';
// Pull `expect` out of vitest explicitly so TypeScript recognises the symbol
// inside this setup file. vitest injects a global `expect` at runtime when
// `test.globals` is true (see vitest.config.ts), but tsc only learns about
// symbols it can resolve through imports. Importing it here both typechecks
// cleanly and survives if the global-flag contract ever changes.
import { expect } from 'vitest';

// Register jest-axe matchers globally so accessibility assertions like
// `expect(results).toHaveNoViolations()` are available in every Vitest spec.
// Tests that don't use it are unaffected. The type declaration lives in
// vitest-axe.d.ts so the matcher typechecks across the project.
expect.extend(toHaveNoViolations);
// Mock IntersectionObserver (needed for components like Stats)
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame and cancelAnimationFrame (needed for stats/counters animations)
window.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  cb(Date.now());
  return 1;
});
window.cancelAnimationFrame = vi.fn();
