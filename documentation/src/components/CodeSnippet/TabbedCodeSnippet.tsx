import React, { useMemo, useState } from 'react';
import styles from './styles.module.css';

type SnippetTab = {
  label: string;
  code: string;
  language?: string;
  fileName?: string;
  highlightLines?: number[];
};

type CodeSnippetProps = {
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
  const hasTabs = Boolean(tabs && tabs.length > 0);
  const [activeTab, setActiveTab] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const resolved =
    hasTabs && tabs
      ? tabs[Math.max(0, Math.min(activeTab, tabs.length - 1))]
      : { code, language, fileName, highlightLines };

  const rawLines = useMemo(() => resolved.code.replace(/\n$/, '').split('\n'), [resolved.code]);
  const shouldCollapse = rawLines.length > collapseAt;
  const visibleLines = shouldCollapse && !expanded ? rawLines.slice(0, collapseAt) : rawLines;
  const highlighted = normalizeHighlight(resolved.highlightLines);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resolved.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className={styles.wrapper}>
      {hasTabs && tabs && (
        <div className={styles.tabs} role="tablist" aria-label="Code snippet variants">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              role="tab"
              aria-selected={idx === activeTab}
              className={`${styles.tabButton} ${idx === activeTab ? styles.tabButtonActive : ''}`}
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
        <button className={styles.copyButton} onClick={handleCopy} aria-label="Copy code snippet">
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
        <button className={styles.expandButton} onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Collapse' : `Expand (${rawLines.length - collapseAt} more lines)`}
        </button>
      )}
    </div>
  );
}
