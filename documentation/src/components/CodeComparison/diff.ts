/**
 * CodeComparison diff utilities
 * Line-based LCS diff that aligns two code blocks for side-by-side rendering.
 */

export type DiffStatus = 'unchanged' | 'added' | 'removed';

export interface DiffLine {
  /** Line content without trailing newline */
  text: string;
  status: DiffStatus;
}

export interface DiffRow {
  before: DiffLine | null;
  after: DiffLine | null;
}

/**
 * Split a code string into lines, dropping a single trailing newline.
 */
export function splitLines(code: string): string[] {
  if (code === '') return [];
  return code.replace(/\n$/, '').split('\n');
}

/**
 * Compute the length of the longest common subsequence between two arrays.
 * Used to keep diff memory bounded for typical doc code blocks.
 */
function lcsLengths(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

/**
 * Align two code blocks into side-by-side rows.
 *
 * Lines that exist only in `before` are marked as removed and aligned against
 * an empty slot on the right; lines that exist only in `after` are marked as
 * added and aligned against an empty slot on the left.
 *
 * @example
 * diffLines('a\nb', 'a\nc') returns rows where `b` is removed and `c` is added.
 */
export function diffLines(before: string, after: string): DiffRow[] {
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const table = lcsLengths(beforeLines, afterLines);

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;

  while (i < beforeLines.length && j < afterLines.length) {
    if (beforeLines[i] === afterLines[j]) {
      rows.push({
        before: { text: beforeLines[i], status: 'unchanged' },
        after: { text: afterLines[j], status: 'unchanged' },
      });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ before: { text: beforeLines[i], status: 'removed' }, after: null });
      i++;
    } else {
      rows.push({ before: null, after: { text: afterLines[j], status: 'added' } });
      j++;
    }
  }

  while (i < beforeLines.length) {
    rows.push({ before: { text: beforeLines[i], status: 'removed' }, after: null });
    i++;
  }

  while (j < afterLines.length) {
    rows.push({ before: null, after: { text: afterLines[j], status: 'added' } });
    j++;
  }

  return rows;
}
