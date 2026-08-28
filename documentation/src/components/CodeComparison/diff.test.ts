/**
 * Tests for CodeComparison diff utilities
 */

import { describe, it, expect } from 'vitest';
import { diffLines, splitLines, type DiffRow } from './diff';

describe('splitLines', () => {
  it('splits code into lines', () => {
    expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('drops a single trailing newline', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
  });

  it('returns a single line for code without newlines', () => {
    expect(splitLines('hello')).toEqual(['hello']);
  });
});

describe('diffLines', () => {
  it('returns unchanged rows for identical code', () => {
    const rows = diffLines('a\nb', 'a\nb');
    expect(rows).toEqual([
      { before: { text: 'a', status: 'unchanged' }, after: { text: 'a', status: 'unchanged' } },
      { before: { text: 'b', status: 'unchanged' }, after: { text: 'b', status: 'unchanged' } },
    ]);
  });

  it('marks removed lines in before and added lines in after', () => {
    const rows = diffLines('a\nb', 'a\nc');
    const removed = rows.filter((r) => r.before?.status === 'removed');
    const added = rows.filter((r) => r.after?.status === 'added');
    expect(removed).toHaveLength(1);
    expect(removed[0].before?.text).toBe('b');
    expect(added).toHaveLength(1);
    expect(added[0].after?.text).toBe('c');
  });

  it('aligns removed lines against an empty after slot', () => {
    const rows = diffLines('a\nb', 'a');
    const row = rows.find((r) => r.before?.text === 'b');
    expect(row?.after).toBeNull();
  });

  it('aligns added lines against an empty before slot', () => {
    const rows = diffLines('a', 'a\nb');
    const row = rows.find((r) => r.after?.text === 'b');
    expect(row?.before).toBeNull();
  });

  it('handles empty before code', () => {
    const rows = diffLines('', 'a\nb');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.before === null && r.after?.status === 'added')).toBe(true);
  });

  it('handles empty after code', () => {
    const rows = diffLines('a\nb', '');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.after === null && r.before?.status === 'removed')).toBe(true);
  });

  it('preserves total line count from both inputs', () => {
    const before = 'x\n1\n2\n3\ny';
    const after = 'x\na\nb\nc\ny';
    const rows = diffLines(before, after);
    const beforeCount = rows.filter((r) => r.before !== null).length;
    const afterCount = rows.filter((r) => r.after !== null).length;
    expect(beforeCount).toBe(5);
    expect(afterCount).toBe(5);
  });
});

const hasStatus = (rows: DiffRow[], side: 'before' | 'after', status: string): boolean =>
  rows.some((r) => r[side]?.status === status);

describe('diffLines output shape', () => {
  it('only emits before/after line objects with expected fields', () => {
    const rows = diffLines('a\nb', 'a\nc');
    rows.forEach((row) => {
      if (row.before) {
        expect(typeof row.before.text).toBe('string');
        expect(['unchanged', 'added', 'removed']).toContain(row.before.status);
      }
      if (row.after) {
        expect(typeof row.after.text).toBe('string');
        expect(['unchanged', 'added', 'removed']).toContain(row.after.status);
      }
    });
    expect(hasStatus(rows, 'before', 'removed')).toBe(true);
    expect(hasStatus(rows, 'after', 'added')).toBe(true);
  });
});
