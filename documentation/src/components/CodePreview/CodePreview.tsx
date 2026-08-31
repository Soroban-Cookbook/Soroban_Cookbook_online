import React, { useState, useCallback, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import clsx from 'clsx';
import styles from './CodePreview.module.css';
import type { CodePreviewProps } from './types';

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * CodePreview – read-only code block with Prism syntax highlighting
 * and copy-to-clipboard.  Intended for embedding Soroban/Rust examples
 * in MDX documentation pages.
 *
 * @example
 * ```mdx
 * import { CodePreview } from '@site/src/components/CodePreview';
 *
 * <CodePreview language="rust" code={someVariable} title="lib.rs" />
 * ```
 */
export default function CodePreview({
  code,
  language = 'rust',
  fileName,
  title,
  className,
  showLineNumbers = true,
  collapseAt = 0,
}: CodePreviewProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }, [code]);

  const trimmedCode = useMemo(() => code.replace(/\n$/, ''), [code]);
  const lineCount = useMemo(() => trimmedCode.split('\n').length, [trimmedCode]);
  const shouldCollapse = collapseAt > 0 && lineCount > collapseAt;
  const displayCode = shouldCollapse && !expanded
    ? trimmedCode.split('\n').slice(0, collapseAt).join('\n')
    : trimmedCode;

  const headerLabel = title ?? fileName ?? language;

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div className={styles.header}>
        <span className={styles.title}>{headerLabel}</span>
        <span className={styles.language}>{language}</span>
        <button
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}>
          {copied ? (
            <>
              <CheckIcon className={styles.copyIcon} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className={styles.copyIcon} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <Highlight theme={themes.vsDark} code={displayCode} language={language}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={clsx(styles.pre, hlClassName)}
            style={{ ...style, background: 'transparent', margin: 0 }}>
            {tokens.map((line, lineIdx) => {
              const lineNumber = lineIdx + 1;
              const lineProps = getLineProps({ line, key: lineIdx });
              return (
                <div
                  key={lineNumber}
                  {...lineProps}
                  className={clsx(styles.line, lineProps.className)}>
                  {showLineNumbers && (
                    <span className={styles.gutter}>{lineNumber}</span>
                  )}
                  <span className={styles.content}>
                    {line.map((token, tokenIdx) => (
                      <span key={tokenIdx} {...getTokenProps({ token, key: tokenIdx })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>

      {shouldCollapse && (
        <button
          className={styles.expandButton}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}>
          {expanded ? 'Collapse' : `Expand (${lineCount - collapseAt} more lines)`}
        </button>
      )}
    </div>
  );
}
