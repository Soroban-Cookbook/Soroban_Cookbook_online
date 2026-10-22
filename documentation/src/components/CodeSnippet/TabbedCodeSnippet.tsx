import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles.module.css';

export type SnippetTab = {
  label: string;
  code: string;
  language?: string;
  fileName?: string;
  highlightLines?: number[];
};

export type CodeSnippetProps = {
  code?: string;
  language?: string;
  fileName?: string;
  highlightLines?: number[];
  tabs?: SnippetTab[];
  collapseAt?: number;
};

function normalizeHighlight(highlightLines: number[] | undefined): Set<number> {
  return new Set((highlightLines ?? []).filter((line) => line > 0));
}

export default function TabbedCodeSnippet({
  code = '',
  language = 'text',
  fileName,
  highlightLines,
  tabs,
  collapseAt = 14,
}: CodeSnippetProps): React.ReactElement {
  const isExplicitEmptyTabs = Array.isArray(tabs) && tabs.length === 0;
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const isEmptyState = isExplicitEmptyTabs || (!hasTabs && code.trim().length === 0);

  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const copyGeneration = useRef(0);

  const clampedTabIndex =
    hasTabs && tabs ? Math.max(0, Math.min(activeTab, tabs.length - 1)) : 0;

  useEffect(() => {
    if (!tabs || tabs.length === 0) {
      if (activeTab !== 0) {
        setActiveTab(0);
      }
      return;
    }
    if (activeTab >= tabs.length) {
      setActiveTab(tabs.length - 1);
    }
  }, [tabs, activeTab]);

  const resolved =
    hasTabs && tabs
      ? tabs[clampedTabIndex]
      : { code, language, fileName, highlightLines };

const rawLines = useMemo(() => resolved.code.replace(/\n$/, '').split('\n'), [resolved.code]);
  const shouldCollapse = rawLines.length > collapseAt;
  const visibleLines = shouldCollapse && !expanded ? rawLines.slice(0, collapseAt) : rawLines;
  const highlighted = normalizeHighlight(resolved?.highlightLines);

  if (isEmptyState) {
    return (
      <div
        className={styles.wrapper}
        role="status"
        aria-label="Empty code snippet"
        data-testid="tabbed-code-snippet-empty">
        <div className={styles.header}>
          <span className={styles.fileName}>{fileName ?? 'snippet'}</span>
          <span className={styles.language}>{language ?? 'text'}</span>
        </div>
        <div className={styles.pre}>
          <span className={styles.line}>
            <span className={styles.content}>No code snippet available.</span>
          </span>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const generation = copyGeneration.current;
    await navigator.clipboard.writeText(resolved.code);
    if (generation !== copyGeneration.current) return;
    window.clearTimeout(copyTimer.current);
    setCopied(true);
    copyTimer.current = window.setTimeout(() => {
      copyTimer.current = undefined;
      setCopied(false);
    }, 1200);
  };

  return (
    <div className={styles.wrapper}>
      {hasTabs && tabs && (
        <div className={styles.tabs} role="tablist" aria-label="Code snippet variants">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={idx === clampedTabIndex}
              className={`${styles.tabButton} ${idx === clampedTabIndex ? styles.tabButtonActive : ''}`}
              onClick={() => {
                setActiveTab(idx);
                setExpanded(false);
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.fileName}>{resolved.fileName ?? 'snippet'}</span>
        <span className={styles.language}>{resolved.language ?? 'text'}</span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label="Copy code snippet">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <pre className={styles.pre} data-language={resolved.language ?? 'text'}>
        <code className={`language-${resolved.language ?? 'text'}`}>
          {visibleLines.map((line, idx) => {
            const lineNumber = idx + 1;
            return (
              <span
                key={`${lineNumber}-${line}`}
                className={`${styles.line} ${highlighted.has(lineNumber) ? styles.lineHighlighted : ''}`}>
                <span className={styles.gutter}>{lineNumber}</span>
                <span className={styles.content}>{line || ' '}</span>
              </span>
            );
          })}
        </code>
      </pre>

      {shouldCollapse && (
        <button
          type="button"
          className={styles.expandButton}
          onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Collapse' : `Expand (${rawLines.length - collapseAt} more lines)`}
        </button>
      )}
    </div>
  );
}
