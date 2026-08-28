/**
 * Code Snippet Search Utilities — Phase 5 (issue #333)
 *
 * Provides helpers for detecting and classifying search queries that contain
 * code tokens, API function names, or Soroban SDK symbols. These utilities
 * support the search analytics pipeline and can be used by future UI layers
 * (e.g., to hint "searching by code token") without coupling to the indexer.
 *
 * Design principles:
 *  - **Pure functions**: all helpers are stateless and side-effect-free.
 *  - **No network calls**: runs entirely in the browser or in tests.
 *  - **Extensible**: `SOROBAN_API_TOKENS` is the single source of truth; add
 *    new symbols there and all helpers automatically cover them.
 */

// ─── Soroban / Rust API token registry ───────────────────────────────────────

/**
 * Well-known Soroban SDK function names, macros, and type identifiers that
 * a developer might paste or type directly into the search bar.
 *
 * Keep this list sorted alphabetically within each category to ease future
 * maintenance.
 *
 * **Important**: Only include tokens that are unlikely to appear in ordinary
 * English prose to minimise false positives.  In particular, do NOT add bare
 * words like "contract" or "name" whose lowercase forms are common nouns — use
 * the qualified macro/function identifiers (e.g. `contractimpl`) instead.
 */
export const SOROBAN_API_TOKENS: readonly string[] = [
  // Authorization
  'mock_all_auths',
  'require_auth',
  'require_auth_for_args',
  // Contract macros (qualified — `contract` alone is too common a prose word)
  'contractimpl',
  'contracttype',
  'contracterror',
  // Environment & storage
  'env.storage',
  'env.invoker',
  'env.mock_all_auths',
  // Ledger / deployment
  'bump_sequence',
  'set_wasm_hash',
  'update_current_contract_wasm',
  // Token standard — only compound / SDK-specific identifiers
  'soroban_token_sdk',
  'TokenInterface',
  // Types — only SDK-specific; generic names like 'String' are omitted
  'BytesN',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns `true` when `query` contains at least one recognised Soroban API
 * token.  The comparison is case-insensitive so `Require_Auth` matches
 * `require_auth`.
 *
 * @example
 * isCodeSnippetQuery('how to use require_auth') // true
 * isCodeSnippetQuery('soroban hello world')     // false
 */
/**
 * Returns a regex that matches `token` as a whole word (boundary-aware).
 * Tokens containing dots (e.g. `env.storage`) or underscores are treated as
 * word-boundary anchors because `\b` in JS does not recognise them as
 * separators.  We therefore split on any non-alphanumeric, non-dot,
 * non-underscore character to determine a match.
 */
function tokenRegex(token: string): RegExp {
  // Escape any regex special characters in the token
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`, 'i');
}

export function isCodeSnippetQuery(query: string): boolean {
  if (!query) return false;
  return SOROBAN_API_TOKENS.some((token) => tokenRegex(token).test(query));
}

/**
 * Extracts all Soroban API tokens present in `query` (case-insensitive).
 * Returns a de-duplicated array.  Returns an empty array when none match.
 *
 * @example
 * extractApiTokens('require_auth and mint')
 * // => ['require_auth', 'mint']
 */
export function extractApiTokens(query: string): string[] {
  if (!query) return [];
  const found = SOROBAN_API_TOKENS.filter((token) => tokenRegex(token).test(query));
  // De-duplicate (SOROBAN_API_TOKENS is already unique, but guard anyway)
  return [...new Set(found)];
}

/**
 * Classifies a search query into one of four categories:
 *
 * - `'code'`  — the query is dominated by code tokens (≥ 1 API token, short prose)
 * - `'mixed'` — the query contains both prose and at least one code token
 * - `'prose'` — no code tokens detected
 *
 * This is useful for analytics (tracking how often users search by code) and
 * for potential UI hints ("You searched for a code token — see the API docs").
 *
 * @example
 * classifyQuery('require_auth')           // 'code'
 * classifyQuery('how to use require_auth') // 'mixed'
 * classifyQuery('soroban hello world')     // 'prose'
 */
export type QueryCategory = 'code' | 'mixed' | 'prose';

export function classifyQuery(query: string): QueryCategory {
  if (!query || !query.trim()) return 'prose';

  const tokens = extractApiTokens(query);
  if (tokens.length === 0) return 'prose';

  // Heuristic: strip matched tokens from the query and count remaining prose
  // words.  If fewer than 2 prose words remain, the query is code-driven.
  // Sort tokens longest-first to avoid shorter tokens leaving residual text
  // from a longer compound token (e.g. 'contract' inside
  // 'update_current_contract_wasm').
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  let remainder = query;
  for (const token of sortedTokens) {
    remainder = remainder.replace(tokenRegex(token), ' ');
  }
  const proseWordCount = remainder
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1).length;

  return proseWordCount < 2 ? 'code' : 'mixed';
}
