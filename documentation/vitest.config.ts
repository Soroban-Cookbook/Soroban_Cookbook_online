import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      '**/sanitizeUrl.test.ts',
      'src/utils/__tests__/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        '__mocks__/**',
        'src/**/*.d.ts',
        'src/theme/**',
      ],
      thresholds: {
        // Global floor — set from measured baseline (2026-08-31).
        // These values represent the minimum acceptable coverage across the
        // whole codebase. They should only move upward as tests are added.
        // To update: run `bun run test:coverage`, check the summary table,
        // and raise each value to the new floor (rounded down).
        lines: 26,
        statements: 26,
        functions: 27,
        branches: 30,

        // Per-file high-water marks for well-tested modules.
        'src/components/SearchFilters/SearchFilters.tsx': {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 80,
        },
        'src/components/SearchAnalytics/SearchAnalytics.tsx': {
          lines: 90,
          statements: 90,
          functions: 90,
          branches: 80,
        },
        'src/utils/searchFilterUtils.ts': {
          lines: 95,
          statements: 95,
          functions: 95,
          branches: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@site': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, './src'),
      '@docusaurus/Link': path.resolve(__dirname, './src/__mocks__/@docusaurus/Link.tsx'),
      '@docusaurus/router': path.resolve(__dirname, './src/__mocks__/@docusaurus/router.tsx'),
      '@docusaurus/theme-common': path.resolve(
        __dirname,
        './src/__mocks__/@docusaurus/theme-common.tsx',
      ),
      '@docusaurus/useDocusaurusContext': path.resolve(
        __dirname,
        './src/test-mocks/useDocusaurusContext.ts',
      ),
      '@docusaurus/Head': path.resolve(__dirname, './src/__mocks__/docusaurus-head.tsx'),
      '@docusaurus/plugin-content-docs/client': path.resolve(
        __dirname,
        './src/__mocks__/docusaurus-plugin-content-docs-client.ts',
      ),
      '@theme/Layout': path.resolve(__dirname, './src/__mocks__/@theme/Layout.tsx'),
    },
  },
});
