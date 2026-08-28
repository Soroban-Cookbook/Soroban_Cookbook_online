import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './CodeComparison.module.css';
import { diffLines, type DiffRow } from './diff';

export interface CodeComparisonProps {
  /** The "before" (old) code shown in the left pane */
  before: string;
  /** The "after" (new) code shown in the right pane */
  after: string;
  /** Label for the left pane */
  beforeLabel?: string;
  /** Label for the right pane */
  afterLabel?: string;
  /** Optional caption above the diff */
  title?: string;
  /** Programming language for the code panes */
  language?: string;
  /** Custom CSS class name */
  className?: string;
  /** Show line numbers in each pane (default true) */
  showLineNumbers?: boolean;
}

const DEFAULT_BEFORE_LABEL = 'Before';
const DEFAULT_AFTER_LABEL = 'After';

/**
 * CodeComparison Component
 * ------------------------
 * Renders two code samples side by side with line-level diff highlighting.
 * Lines only present in the left pane are marked as removed; lines only in the
 * right pane are marked as added. Stacked vertically on narrow viewports.
 *
 * @example
 * ```tsx
 * <CodeComparison
 *   before={oldContract}
 *   after={newContract}
 *   beforeLabel="Before upgrade"
 *   afterLabel="After upgrade"
 *   language="rust"
 * />
 * ```
 */
export default function CodeComparison({
  before,
  after,
  beforeLabel = DEFAULT_BEFORE_LABEL,
  afterLabel = DEFAULT_AFTER_LABEL,
  title,
  language = 'rust',
  className,
  showLineNumbers = true,
}: CodeComparisonProps) {
  const rows: DiffRow[] = useMemo(() => diffLines(before, after), [before, after]);

  return (
    <figure className={clsx(styles.comparison, className)}>
      {title && <figcaption className={styles.caption}>{title}</figcaption>}
      <div className={styles.labels}>
        <span className={clsx(styles.label, styles.labelBefore)}>{beforeLabel}</span>
        <span className={clsx(styles.label, styles.labelAfter)}>{afterLabel}</span>
      </div>
      <div className={styles.diff}>
        <div className={styles.pane} aria-label={beforeLabel}>
          {rows.map((row, index) => {
            const lineNumber = row.before !== null ? index + 1 : null;
            return (
              <DiffLine
                key={index}
                lineNumber={lineNumber}
                row={row}
                side="before"
                showLineNumbers={showLineNumbers}
                language={language}
              />
            );
          })}
        </div>
        <div className={styles.pane} aria-label={afterLabel}>
          {rows.map((row, index) => {
            const lineNumber = row.after !== null ? index + 1 : null;
            return (
              <DiffLine
                key={index}
                lineNumber={lineNumber}
                row={row}
                side="after"
                showLineNumbers={showLineNumbers}
                language={language}
              />
            );
          })}
        </div>
      </div>
    </figure>
  );
}

interface DiffLineProps {
  row: DiffRow;
  side: 'before' | 'after';
  lineNumber: number | null;
  showLineNumbers: boolean;
  language: string;
}

function DiffLine({ row, side, lineNumber, showLineNumbers, language }: DiffLineProps) {
  const line = row[side];
  const hasContent = line !== null;
  const className = clsx(
    styles.line,
    !hasContent && styles.lineEmpty,
    hasContent && styles[`line--${line.status}`],
  );
  const gutter = showLineNumbers ? (
    <span className={styles.gutter}>{hasContent ? lineNumber : '\u00A0'}</span>
  ) : null;

  return (
    <div className={className} data-language={language}>
      {gutter}
      <code className={styles.code}>{hasContent ? line.text || '\u00A0' : '\u00A0'}</code>
    </div>
  );
}
