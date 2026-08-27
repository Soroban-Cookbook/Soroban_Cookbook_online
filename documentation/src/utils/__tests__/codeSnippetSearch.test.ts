/**
 * Unit tests for src/utils/codeSnippetSearch.ts — Phase 5 (issue #333)
 *
 * Covers:
 *  - SOROBAN_API_TOKENS: registry shape and uniqueness
 *  - isCodeSnippetQuery: detection, case-insensitivity, edge cases
 *  - extractApiTokens: extraction, de-duplication, empty inputs
 *  - classifyQuery: code / mixed / prose categories
 */

import { describe, it, expect } from 'vitest';
import {
  SOROBAN_API_TOKENS,
  isCodeSnippetQuery,
  extractApiTokens,
  classifyQuery,
} from '../codeSnippetSearch';

// ─── SOROBAN_API_TOKENS ───────────────────────────────────────────────────────

describe('SOROBAN_API_TOKENS', () => {
  it('is a non-empty array', () => {
    expect(SOROBAN_API_TOKENS.length).toBeGreaterThan(0);
  });

  it('contains no duplicate entries', () => {
    const lower = SOROBAN_API_TOKENS.map((t) => t.toLowerCase());
    const unique = new Set(lower);
    expect(unique.size).toBe(lower.length);
  });

  it('includes the primary authorization token require_auth', () => {
    expect(SOROBAN_API_TOKENS).toContain('require_auth');
  });

  it('includes qualified contract macro identifiers', () => {
    // 'contract' alone was removed (too common in prose) — only qualified forms
    expect(SOROBAN_API_TOKENS).toContain('contractimpl');
    expect(SOROBAN_API_TOKENS).toContain('contracttype');
    expect(SOROBAN_API_TOKENS).toContain('contracterror');
    expect(SOROBAN_API_TOKENS).not.toContain('contract');
  });

  it('includes upgrade-related tokens', () => {
    expect(SOROBAN_API_TOKENS).toContain('update_current_contract_wasm');
    expect(SOROBAN_API_TOKENS).toContain('set_wasm_hash');
  });

  it('does not contain generic prose words', () => {
    // These were intentionally excluded to prevent false positives
    const excluded = ['contract', 'name', 'deploy', 'install', 'mint', 'balance'];
    for (const word of excluded) {
      expect(SOROBAN_API_TOKENS).not.toContain(word);
    }
  });
});

// ─── isCodeSnippetQuery ───────────────────────────────────────────────────────

describe('isCodeSnippetQuery', () => {
  it('returns true for a query containing require_auth', () => {
    expect(isCodeSnippetQuery('how do I use require_auth')).toBe(true);
  });

  it('returns true for a query containing only a code token', () => {
    expect(isCodeSnippetQuery('require_auth')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isCodeSnippetQuery('REQUIRE_AUTH')).toBe(true);
    expect(isCodeSnippetQuery('TokenInterface')).toBe(true);
  });

  it('returns false for a pure prose query', () => {
    // 'contract' was intentionally excluded from the token list
    expect(isCodeSnippetQuery('hello world soroban guide')).toBe(false);
    expect(isCodeSnippetQuery('soroban smart contract guide')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isCodeSnippetQuery('')).toBe(false);
  });

  it('returns true for a query containing env.storage', () => {
    expect(isCodeSnippetQuery('how to read env.storage persistent')).toBe(true);
  });

  it('returns true for a query with contractimpl', () => {
    expect(isCodeSnippetQuery('how to use contractimpl macro')).toBe(true);
  });

  it('returns true for mock_all_auths', () => {
    expect(isCodeSnippetQuery('env.mock_all_auths in tests')).toBe(true);
  });

  it('returns true for update_current_contract_wasm', () => {
    expect(isCodeSnippetQuery('update_current_contract_wasm upgrade')).toBe(true);
  });

  it('does not match generic word "contract" as a code token', () => {
    // 'contract' alone was removed from the registry
    expect(isCodeSnippetQuery('smart contract deployment')).toBe(false);
  });
});

// ─── extractApiTokens ─────────────────────────────────────────────────────────

describe('extractApiTokens', () => {
  it('extracts require_auth from a prose query', () => {
    const result = extractApiTokens('use require_auth for access control');
    expect(result).toContain('require_auth');
  });

  it('extracts multiple tokens', () => {
    const result = extractApiTokens('require_auth and contractimpl and contracterror');
    expect(result).toContain('require_auth');
    expect(result).toContain('contractimpl');
    expect(result).toContain('contracterror');
  });

  it('returns an empty array for a pure prose query', () => {
    // 'contract' was intentionally excluded — prose queries should not match
    expect(extractApiTokens('soroban smart contract guide')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(extractApiTokens('')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const result = extractApiTokens('REQUIRE_AUTH contractimpl contracterror');
    expect(result).toContain('require_auth');
    expect(result).toContain('contractimpl');
    expect(result).toContain('contracterror');
  });

  it('returns a de-duplicated list even when the token appears multiple times', () => {
    const result = extractApiTokens('require_auth require_auth');
    const count = result.filter((t) => t.toLowerCase() === 'require_auth').length;
    expect(count).toBe(1);
  });
});

// ─── classifyQuery ────────────────────────────────────────────────────────────

describe('classifyQuery', () => {
  describe("returns 'code'", () => {
    it('for a query that is just a code token', () => {
      expect(classifyQuery('require_auth')).toBe('code');
    });

    it('for a query with one small qualifier word alongside a token', () => {
      // "contractimpl macro" — "macro" is 1 prose word (< 2 threshold)
      expect(classifyQuery('contractimpl macro')).toBe('code');
    });

    it('for update_current_contract_wasm alone', () => {
      expect(classifyQuery('update_current_contract_wasm')).toBe('code');
    });

    it('for require_auth_for_args alone', () => {
      expect(classifyQuery('require_auth_for_args')).toBe('code');
    });
  });

  describe("returns 'mixed'", () => {
    it('for a natural-language question containing a code token', () => {
      expect(classifyQuery('how do I use require_auth in my contract')).toBe('mixed');
    });

    it('for multiple prose words surrounding a token', () => {
      expect(classifyQuery('what does contractimpl do in soroban')).toBe('mixed');
    });
  });

  describe("returns 'prose'", () => {
    it('for a pure prose query', () => {
      expect(classifyQuery('soroban smart contract guide overview')).toBe('prose');
    });

    it('for an empty string', () => {
      expect(classifyQuery('')).toBe('prose');
    });

    it('for whitespace only', () => {
      expect(classifyQuery('   ')).toBe('prose');
    });
  });

  it('is case-insensitive when classifying', () => {
    // Uppercase token in a mostly-prose context
    expect(classifyQuery('how do I use REQUIRE_AUTH in my contract')).toBe('mixed');
  });
});
