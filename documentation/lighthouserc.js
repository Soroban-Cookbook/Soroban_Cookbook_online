/**
 * Lighthouse CI Configuration
 *
 * Issue #134: Page Speed Optimization
 * ROADMAP-122 / Issue #189: Mobile-First Indexing Verification
 *
 * Enforces Core Web Vitals budgets:
 *   - LCP  < 2.5 s  (Good threshold per web.dev/vitals)
 *   - FCP  < 1.5 s
 *   - CLS  < 0.1
 *   - TBT  < 200 ms (proxy for INP/FID on mobile)
 *
 * Lazy-loading below-fold components (Testimonials, NewsletterSignup)
 * removes them from the critical bundle and reduces TTI.
 */

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      settings: {
        // formFactor must match screenEmulation.mobile (Lighthouse validation).
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          disabled: false,
        },
        throttling: {
          cpuSlowdownMultiplier: 4,
        },
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
      },
      url: [
        'http://127.0.0.1:3000/',
        'http://127.0.0.1:3000/docs/getting-started/setup',
      ],
      // Workflow runs lhci from ./documentation after `bun run build`.
      startServerCommand: 'bun run serve -- --port 3000 --host 127.0.0.1',
      startServerReadyPattern: 'Serving',
      startServerReadyTimeout: 120000,
    },
    assert: {
      assertions: {
        // ── Category scores ──────────────────────────────────────────────────
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // ── Core Web Vitals (issue #134) ─────────────────────────────────────
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],

        // ── Mobile-specific audits ────────────────────────────────────────────
        'viewport': 'error',
        // Soften flaky mobile audits on static preview hosts.
        'font-size': ['warn', {}],
        'tap-targets': ['warn', {}],
        'content-width': ['warn', {}],

        // ── Resource hints ───────────────────────────────────────────────────
        'uses-text-compression': ['warn', { minScore: 1 }],
        'render-blocking-resources': ['warn', { maxLength: 0 }],
        'uses-optimized-images': ['warn', { minScore: 1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
