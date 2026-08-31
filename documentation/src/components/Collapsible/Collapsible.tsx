import React, { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import styles from './Collapsible.module.css';

export interface CollapsibleProps {
  /** The visible summary / trigger text. */
  summary: ReactNode;
  /** Collapsed content. */
  children: ReactNode;
  /** Whether the section starts expanded (default false). */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Callback when toggle happens (controlled mode). */
  onToggle?: (open: boolean) => void;
  /** Visual variant. */
  variant?: 'default' | 'bordered' | 'ghost';
  /** Additional class name. */
  className?: string;
}

/**
 * Collapsible — Expandable/collapsible documentation section
 * with design-system styling and full keyboard support.
 *
 * Uses the semantic `<details>` / `<summary>` HTML pattern for
 * built-in accessibility and keyboard interaction.
 *
 * Keyboard navigation:
 * - Enter/Space: Toggle open/close
 * - Tab: Move focus in/out
 *
 * @example
 * <Collapsible summary="Click to expand">
 *   Hidden content here
 * </Collapsible>
 *
 * <Collapsible summary="Advanced details" defaultOpen>
 *   Pre-expanded content
 * </Collapsible>
 */
export default function Collapsible({
  summary,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  variant = 'default',
  className,
}: CollapsibleProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const handleToggle = useCallback(() => {
    if (!isControlled) {
      setInternalOpen((prev) => !prev);
    }
    onToggle?.(!isOpen);
  }, [isControlled, isOpen, onToggle]);

  const handleSummaryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setContentHeight(el.scrollHeight);
  }, [isOpen, children]);

  return (
    <details
      className={clsx(
        styles.collapsible,
        styles[`collapsibleVariant${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
        isOpen && styles.collapsibleOpen,
        className,
      )}
      open={isOpen}
      onToggle={handleToggle}>
      <summary
        className={styles.collapsibleSummary}
        aria-expanded={isOpen}
        onKeyDown={handleSummaryKeyDown}>
        <span className={styles.collapsibleSummaryText}>{summary}</span>
        <span
          className={clsx(styles.collapsibleIcon, isOpen && styles.collapsibleIconOpen)}
          aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </summary>
      <div
        className={styles.collapsibleContent}
        style={
          {
            '--content-height': `${contentHeight}px`,
          } as React.CSSProperties
        }
        ref={contentRef}>
        <div className={styles.collapsibleContentInner}>{children}</div>
      </div>
    </details>
  );
}
