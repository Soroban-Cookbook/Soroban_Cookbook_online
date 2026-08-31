/**
 * Unit tests for src/utils/snippetDrift.ts — Phase 8 (issue #644)
 *
 * Covers:
 *  - parseSourceLinkedSnippets: extraction, multiple fences, no-match cases
 *  - normalise: trailing whitespace, blank lines
 *  - snippetMatchesFile: matching and drifted scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  parseSourceLinkedSnippets,
  normalise,
  snippetMatchesFile,
  type SourceLinkedSnippet,
} from './snippetDrift';

// ─── parseSourceLinkedSnippets ────────────────────────────────────────────────

describe('parseSourceLinkedSnippets', () => {
  it('returns an empty array when there are no src= fences', () => {
    const mdx = `
# Hello

\`\`\`rust
fn main() {}
\`\`\`
`;
    expect(parseSourceLinkedSnippets(mdx, 'hello.mdx')).toEqual([]);
  });

  it('returns an empty array when the only rust block is illustrative', () => {
    const mdx = `
\`\`\`rust illustrative
fn main() {}
\`\`\`
`;
    expect(parseSourceLinkedSnippets(mdx, 'hello.mdx')).toEqual([]);
  });

  it('extracts a single src= fence', () => {
    const mdx = [
      '```rust src=counter/src/lib.rs',
      '#![no_std]',
      'use soroban_sdk::Env;',
      '```',
    ].join('\n');

    const snippets = parseSourceLinkedSnippets(mdx, 'counter.mdx');
    expect(snippets).toHaveLength(1);
    expect(snippets[0].srcPath).toBe('counter/src/lib.rs');
    expect(snippets[0].mdxFile).toBe('counter.mdx');
    expect(snippets[0].body).toContain('soroban_sdk::Env');
  });

  it('extracts multiple src= fences from the same file', () => {
    const mdx = [
      '```rust src=counter/src/lib.rs',
      'fn a() {}',
      '```',
      '',
      'Some prose in between.',
      '',
      '```rust src=hello-world/src/lib.rs',
      'fn b() {}',
      '```',
    ].join('\n');

    const snippets = parseSourceLinkedSnippets(mdx, 'mixed.mdx');
    expect(snippets).toHaveLength(2);
    expect(snippets[0].srcPath).toBe('counter/src/lib.rs');
    expect(snippets[1].srcPath).toBe('hello-world/src/lib.rs');
  });

  it('ignores plain ```rust blocks that have no src= attribute', () => {
    const mdx = [
      '```rust',
      'fn plain() {}',
      '```',
      '',
      '```rust src=counter/src/lib.rs',
      'fn sourced() {}',
      '```',
    ].join('\n');

    const snippets = parseSourceLinkedSnippets(mdx, 'mixed.mdx');
    expect(snippets).toHaveLength(1);
    expect(snippets[0].srcPath).toBe('counter/src/lib.rs');
  });

  it('populates mdxFile on every snippet', () => {
    const mdx = '```rust src=counter/src/lib.rs\nfn x() {}\n```';
    const snippets = parseSourceLinkedSnippets(mdx, 'docs/patterns/counter.mdx');
    expect(snippets[0].mdxFile).toBe('docs/patterns/counter.mdx');
  });

  it('preserves the exact body text (internal whitespace unchanged)', () => {
    const body = '    let x = 1;\n    let y = 2;';
    const mdx = `\`\`\`rust src=counter/src/lib.rs\n${body}\n\`\`\``;
    const snippets = parseSourceLinkedSnippets(mdx, 'counter.mdx');
    expect(snippets[0].body).toBe(body);
  });

  it('handles an unclosed fence without throwing', () => {
    const mdx = '```rust src=counter/src/lib.rs\nfn x() {}\n';
    expect(() => parseSourceLinkedSnippets(mdx, 'counter.mdx')).not.toThrow();
    // Unclosed fences are not emitted
    expect(parseSourceLinkedSnippets(mdx, 'counter.mdx')).toHaveLength(0);
  });
});

// ─── normalise ────────────────────────────────────────────────────────────────

describe('normalise', () => {
  it('trims trailing spaces from each line', () => {
    expect(normalise('fn main() {   \n}')).toBe('fn main() {\n}');
  });

  it('removes leading blank lines', () => {
    expect(normalise('\n\nfn main() {}')).toBe('fn main() {}');
  });

  it('removes trailing blank lines', () => {
    expect(normalise('fn main() {}\n\n')).toBe('fn main() {}');
  });

  it('leaves internal blank lines intact', () => {
    const text = 'fn a() {}\n\nfn b() {}';
    expect(normalise(text)).toBe(text);
  });

  it('handles an empty string', () => {
    expect(normalise('')).toBe('');
  });

  it('handles a string of only whitespace', () => {
    expect(normalise('   \n   \n')).toBe('');
  });
});

// ─── snippetMatchesFile ───────────────────────────────────────────────────────

describe('snippetMatchesFile', () => {
  const makeSnippet = (body: string): SourceLinkedSnippet => ({
    mdxFile: 'counter.mdx',
    srcPath: 'counter/src/lib.rs',
    body,
  });

  it('returns true when snippet body exactly matches file content', () => {
    const code = '#![no_std]\nuse soroban_sdk::Env;';
    expect(snippetMatchesFile(makeSnippet(code), code)).toBe(true);
  });

  it('returns true when only trailing spaces differ (normalised away)', () => {
    const snippet = 'fn main() {   ';
    const file = 'fn main() {';
    expect(snippetMatchesFile(makeSnippet(snippet), file)).toBe(true);
  });

  it('returns true when only surrounding blank lines differ', () => {
    const snippet = '\nfn main() {}\n\n';
    const file = 'fn main() {}';
    expect(snippetMatchesFile(makeSnippet(snippet), file)).toBe(true);
  });

  it('returns false when snippet has an extra line (drift)', () => {
    const snippet = 'fn main() {}\nfn extra() {}';
    const file = 'fn main() {}';
    expect(snippetMatchesFile(makeSnippet(snippet), file)).toBe(false);
  });

  it('returns false when snippet is missing a line (drift)', () => {
    const snippet = 'fn main() {}';
    const file = 'fn main() {}\nfn second() {}';
    expect(snippetMatchesFile(makeSnippet(snippet), file)).toBe(false);
  });

  it('returns false when a line differs by even one character (drift)', () => {
    const snippet = 'let x: u32 = 1;';
    const file = 'let x: u64 = 1;';
    expect(snippetMatchesFile(makeSnippet(snippet), file)).toBe(false);
  });

  it('returns false for completely different content', () => {
    expect(snippetMatchesFile(makeSnippet('fn a() {}'), 'fn b() {}')).toBe(false);
  });

  it('returns true for identical multi-line blocks', () => {
    const code = '#![no_std]\nuse soroban_sdk::{contract, contractimpl, Env};\n\n#[contract]\npub struct Counter;';
    expect(snippetMatchesFile(makeSnippet(code), code)).toBe(true);
  });
});
