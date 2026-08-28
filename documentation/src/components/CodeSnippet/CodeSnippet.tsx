import React, { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import styles from './CodeSnippet.module.css';
import { CodeSnippetProps } from './types';
import { hasCommentLines, getDisplayCode, downloadFile, formatFilename } from './utils';
import TabbedCodeSnippet from './TabbedCodeSnippet';

type SnippetTab = {
  label: string;
  code: string;
  language?: string;
  fileName?: string;
  highlightLines?: number[];
};

type UnifiedCodeSnippetProps = CodeSnippetProps & {
  code?: string;
  tabs?: SnippetTab[];
  collapseAt?: number;
  fileName?: string;
  highlightLines?: number[];
};

function CommentCodeSnippet({
  code = '',
  language = 'rust',
  defaultShowComments = true,
  className,
  onCommentToggle,
  filename,
  showDownload = true,
}: CodeSnippetProps) {
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading'>('idle');

  const hasComments = useMemo(() => hasCommentLines(code), [code]);
  const displayCode = useMemo(() => getDisplayCode(code, showComments), [code, showComments]);

  const handleToggle = () => {
    const newState = !showComments;
    setShowComments(newState);
    onCommentToggle?.(newState);
  };

  const handleDownload = useCallback(() => {
    try {
      setDownloadStatus('downloading');
      const finalFilename = filename
        ? formatFilename(filename, language)
        : formatFilename(`code-${Date.now()}`, language);
      downloadFile(code ?? '', finalFilename);
      setTimeout(() => setDownloadStatus('idle'), 500);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('idle');
    }
  }, [code, filename, language]);

  if (!hasComments) {
    return (
      <div className={clsx(styles.wrapper, className)}>
        <div className={styles.header}>
          {showDownload && (
            <button
              className={styles.downloadButton}
              onClick={handleDownload}
              disabled={downloadStatus === 'downloading'}
              aria-label={`Download code as ${formatFilename(filename || 'code', language)}`}
              title={`Download as ${formatFilename(filename || 'code', language)}`}>
              <span className={styles.icon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <span>Download</span>
            </button>
          )}
        </div>
        <div className={styles.codeBlock}>
          <code>{code}</code>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div className={styles.header}>
        <button
          className={clsx(styles.toggleButton, !showComments && styles.hidden)}
          onClick={handleToggle}
          aria-label={showComments ? 'Hide comments' : 'Show comments'}
          title={showComments ? 'Hide detailed comments' : 'Show detailed comments'}>
          <span className={styles.icon}>
            {showComments ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </span>
          <span>{showComments ? 'Hide' : 'Show'} comments</span>
        </button>

        {showDownload && (
          <button
            className={styles.downloadButton}
            onClick={handleDownload}
            disabled={downloadStatus === 'downloading'}
            aria-label={`Download code as ${formatFilename(filename || 'code', language)}`}
            title={`Download as ${formatFilename(filename || 'code', language)}`}>
            <span className={styles.icon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </span>
            <span>Download</span>
          </button>
        )}
      </div>

      {!showComments && (
        <div className={clsx(styles.commentStatus, !showComments && styles.hidden)}>
          Detailed comments hidden
        </div>
      )}

      <div className={styles.codeBlock}>
        <code>{displayCode}</code>
      </div>
    </div>
  );
}

/**
 * CodeSnippet Component
 *
 * Supports either a single code block (with optional comment toggle/download)
 * or a tabbed multi-snippet view.
 */
export default function CodeSnippet({
  code = '',
  language = 'rust',
  defaultShowComments = true,
  className,
  onCommentToggle,
  filename,
  showDownload = true,
  tabs,
  collapseAt,
  fileName,
  highlightLines,
}: UnifiedCodeSnippetProps) {
  if (tabs && tabs.length > 0) {
    return (
      <TabbedCodeSnippet
        code={code}
        language={language}
        fileName={fileName ?? filename}
        highlightLines={highlightLines}
        tabs={tabs}
        collapseAt={collapseAt}
      />
    );
  }

  return (
    <CommentCodeSnippet
      code={code}
      language={language}
      defaultShowComments={defaultShowComments}
      className={className}
      onCommentToggle={onCommentToggle}
      filename={filename}
      showDownload={showDownload}
    />
  );
}
