/**
 * snippetDrift.ts — Phase 8 (issue #644)
 *
 * Utilities for detecting when a Rust code fence tagged with `src=<path>`
 * in an MDX pattern file has drifted from the referenced example file.
 *
 * Convention
 * ──────────
 * A code fence is "source-linked" when its info string contains a `src=`
 * attribute pointing to a path relative to the `examples/` directory:
 *
 *   ```rust src=counter/src/lib.rs
 *   …exact copy of examples/counter/src/lib.rs…
 *   ```
 *
 * Blocks without `src=` are ignored; they are covered by the separate
 * check-snippets.sh illustrative/tested audit.
 */

/** A single source-linked snippet extracted from an MDX file. */
export interface SourceLinkedSnippet {
  /** Path of the MDX file the snippet was found in. */
  mdxFile: string;
  /** Value of the `src=` attribute, relative to `examples/`. */
  srcPath: string;
  /** Raw text inside the fenced block. */
  body: string;
}

/**
 * Parse all `src=`-tagged Rust fences from MDX source text.
 *
 * The parser is intentionally simple: it looks for lines that start with
 * ```` ```rust ````  and contain a `src=` token, accumulates everything
 * until the closing ```` ``` ````, then moves on.
 *
 * @param mdxContent  Full text content of an MDX file.
 * @param mdxFile     File path used to populate {@link SourceLinkedSnippet.mdxFile}.
 * @returns           Array of extracted snippets (may be empty).
 */
export function parseSourceLinkedSnippets(
  mdxContent: string,
  mdxFile: string,
): SourceLinkedSnippet[] {
  const snippets: SourceLinkedSnippet[] = [];
  const lines = mdxContent.split('\n');

  let inFence = false;
  let srcPath = '';
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!inFence) {
      // Opening fence: starts with ```rust and has src=<value>
      const match = line.match(/^```rust\s+src=(\S+)/);
      if (match) {
        inFence = true;
        srcPath = match[1];
        bodyLines.length = 0;
      }
    } else {
      // Closing fence
      if (/^```\s*$/.test(line)) {
        inFence = false;
        snippets.push({ mdxFile, srcPath, body: bodyLines.join('\n') });
        srcPath = '';
        bodyLines.length = 0;
      } else {
        bodyLines.push(line);
      }
    }
  }

  return snippets;
}

/**
 * Normalise source text for comparison: trim trailing whitespace from every
 * line and remove leading/trailing blank lines.
 *
 * This mirrors the normalisation done in check-snippet-drift.sh so that the
 * TypeScript tests reflect the real check behaviour.
 */
export function normalise(text: string): string {
  return text
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

/**
 * Compare a snippet's body against the content of the referenced example file.
 *
 * @param snippet       A {@link SourceLinkedSnippet} from {@link parseSourceLinkedSnippets}.
 * @param exampleContent  Content of the referenced example file.
 * @returns `true` when the normalised snippet matches the normalised file.
 */
export function snippetMatchesFile(snippet: SourceLinkedSnippet, exampleContent: string): boolean {
  return normalise(snippet.body) === normalise(exampleContent);
}
