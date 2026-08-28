import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './cards.module.css';

export interface BaseCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

/**
 * BaseCard
 * --------
 * The foundation every card variant builds on.
 * Provides: shadow, padding, border, border-radius, hover lift, focus ring.
 *
 * Usage:
 *   <BaseCard>Plain content</BaseCard>
 *   <BaseCard href="/docs">Clickable link card</BaseCard>
 *   <BaseCard onClick={() => doSomething()} ariaLabel="Open dialog">...</BaseCard>
 */
export default function BaseCard({
  children,
  className,
  href,
  onClick,
  ariaLabel,
  style,
}: BaseCardProps) {
  const isInteractive = Boolean(href || onClick);

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={clsx(styles.baseCard, isInteractive && styles.interactive, className)}
        style={style}>
        {children}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className={clsx(styles.baseCard, styles.interactive, className)}
        style={style}>
        {children}
      </button>
    );
  }

  return (
    <div aria-label={ariaLabel} className={clsx(styles.baseCard, className)} style={style}>
      {children}
    </div>
  );
}
