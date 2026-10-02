import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

vi.mock('@docusaurus/Link', () => {
  return {
    default: ({ to, children, ...props }: any) =>
      React.createElement('a', { href: to, ...props }, children),
  };
});

vi.mock('@docusaurus/router', async () => {
  // Delegate to the shared mutable mockLocation so tests that import and
  // mutate it (e.g. SearchAnalytics route tests) actually control what the
  // component under test observes.
  const { mockLocation } = await import('./__mocks__/docusaurus-router');
  return {
    useLocation: () => ({ ...mockLocation }),
    useHistory: () => ({ push: () => {}, replace: () => {} }),
  };
});

vi.mock('@docusaurus/Head', () => {
  return {
    default: (props: any) => React.createElement('head', null, props?.children),
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
// Mock IntersectionObserver (needed for components like Stats and the
// below-fold lazy sections on the homepage).
// - `mockImplementation` (not `mockReturnValue`) so the mock also works when a
//   component invokes it with `new` — vitest 5 rejects mockReturnValue there.
// - `observe` immediately reports the target as intersecting, because jsdom
//   performs no real layout and would otherwise never fire the callback.
const mockIntersectionObserver = vi.fn().mockImplementation(function (
  callback?: (entries: IntersectionObserverEntry[], observer: unknown) => void,
) {
  return {
    observe: (target: Element) => {
      callback?.(
        [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
        mockIntersectionObserver,
      );
    },
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: () => [],
    root: null,
    rootMargin: '',
    thresholds: [],
  };
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

// Mock requestAnimationFrame and cancelAnimationFrame (needed for stats/counters animations).
// Deferred with setTimeout so recursive animation loops (requestAnimationFrame →
// animate → requestAnimationFrame) don't blow the call stack the way a
// synchronous mock would.
window.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  const id = window.setTimeout(() => cb(Date.now()), 16);
  return id;
});
window.cancelAnimationFrame = vi.fn().mockImplementation((id) => {
  window.clearTimeout(id as number);
});
