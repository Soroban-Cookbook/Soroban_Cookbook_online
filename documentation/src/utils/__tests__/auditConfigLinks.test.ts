/**
 * Unit tests for src/utils/auditConfigLinks.js (issue #1567)
 *
 * Covers:
 *  - normalizeConfigLink: filtering, stripping, path normalization
 *  - resolveDocFilePath: candidate resolution with mocked fs
 *  - extractConfigLinks: extraction from config text, dedup, filtering
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeConfigLink, resolveDocFilePath, extractConfigLinks } from '../auditConfigLinks.js';

// ── normalizeConfigLink ───────────────────────────────────────────────────────

describe('normalizeConfigLink', () => {
  it('returns null for https URLs', () => {
    expect(normalizeConfigLink('https://example.com')).toBeNull();
  });

  it('returns null for http URLs', () => {
    expect(normalizeConfigLink('http://example.com')).toBeNull();
  });

  it('returns null for mailto links', () => {
    expect(normalizeConfigLink('mailto:a@b.com')).toBeNull();
  });

  it('returns null for anchor-only links', () => {
    expect(normalizeConfigLink('#section')).toBeNull();
  });

  it('returns null for non-doc root path /privacy', () => {
    expect(normalizeConfigLink('/privacy')).toBeNull();
  });

  it('returns null for root /', () => {
    expect(normalizeConfigLink('/')).toBeNull();
  });

  it('returns the path for a valid /docs/... link', () => {
    expect(normalizeConfigLink('/docs/design-system/buttons')).toBe('/docs/design-system/buttons');
  });

  it('strips trailing slash from /docs/... path', () => {
    expect(normalizeConfigLink('/docs/getting-started/')).toBe('/docs/getting-started');
  });

  it('strips anchor fragment from /docs/... path', () => {
    expect(normalizeConfigLink('/docs/concepts/overview#section')).toBe('/docs/concepts/overview');
  });

  it('strips query string from /docs/... path', () => {
    expect(normalizeConfigLink('/docs/patterns/overview?tab=1')).toBe('/docs/patterns/overview');
  });

  it('returns null for empty string', () => {
    expect(normalizeConfigLink('')).toBeNull();
  });
});

// ── resolveDocFilePath ────────────────────────────────────────────────────────

vi.mock('fs');
import fs from 'fs';

describe('resolveDocFilePath', () => {
  const docsRoot = '/fake/docs';

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReset();
  });

  it('returns .md path when it exists', () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => p === '/fake/docs/getting-started/setup.md',
    );
    const result = resolveDocFilePath('/docs/getting-started/setup', docsRoot);
    expect(result).toBe('/fake/docs/getting-started/setup.md');
  });

  it('returns .mdx path when only the mdx variant exists', () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (p) => p === '/fake/docs/design-system/buttons.mdx',
    );
    const result = resolveDocFilePath('/docs/design-system/buttons', docsRoot);
    expect(result).toBe('/fake/docs/design-system/buttons.mdx');
  });

  it('returns null when no candidate file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const result = resolveDocFilePath('/docs/nonexistent/page', docsRoot);
    expect(result).toBeNull();
  });

  it('returns index.md for /docs root', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => p === '/fake/docs/index.md');
    const result = resolveDocFilePath('/docs', docsRoot);
    expect(result).toBe('/fake/docs/index.md');
  });
});

// ── extractConfigLinks ────────────────────────────────────────────────────────

describe('extractConfigLinks', () => {
  it('extracts to: values from config text', () => {
    const text = `items: [{ to: '/docs/getting-started/setup' }]`;
    expect(extractConfigLinks(text)).toContain('/docs/getting-started/setup');
  });

  it('extracts href: /docs/... values', () => {
    const text = `{ href: '/docs/patterns/overview' }`;
    expect(extractConfigLinks(text)).toContain('/docs/patterns/overview');
  });

  it('ignores external href values', () => {
    const text = `{ href: 'https://github.com/example' }`;
    expect(extractConfigLinks(text)).toHaveLength(0);
  });

  it('deduplicates repeated paths', () => {
    const text = `to: '/docs/concepts/overview', to: '/docs/concepts/overview'`;
    const result = extractConfigLinks(text);
    expect(result.filter((l) => l === '/docs/concepts/overview')).toHaveLength(1);
  });

  it('returns empty array for config with no internal doc links', () => {
    const text = `{ href: 'https://discord.gg/example', to: '/privacy' }`;
    expect(extractConfigLinks(text)).toHaveLength(0);
  });

  it('ignores anchor-only links', () => {
    const text = `{ to: '#section' }`;
    expect(extractConfigLinks(text)).toHaveLength(0);
  });

  it('extracts to: values written with double quotes', () => {
    const text = `items: [{ to: "/docs/getting-started/setup" }]`;
    expect(extractConfigLinks(text)).toContain('/docs/getting-started/setup');
  });

  it('extracts href: /docs/... values written with double quotes', () => {
    const text = `{ href: "/docs/patterns/overview" }`;
    expect(extractConfigLinks(text)).toContain('/docs/patterns/overview');
  });
});
