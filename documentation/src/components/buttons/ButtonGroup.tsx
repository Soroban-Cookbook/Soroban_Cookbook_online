/**
 * ButtonGroup Component - Connected button sets
 * 
 * Features:
 * - Connected button styling
 * - Segmented control style
 * - Full keyboard navigation
 * - Dark mode support
 */

import React, { type ReactNode } from 'react';
import styles from './buttons.module.css';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type ButtonGroupVariant = 'default' | 'connected' | 'segmented';

export interface ButtonGroupProps {
  /** Button elements */
  children: ReactNode;
  /** Group variant style */
  variant?: ButtonGroupVariant;
  /** Additional CSS class */
  className?: string;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export function ButtonGroup({
  children,
  variant = 'default',
  className = '',
  ariaLabel,
}: ButtonGroupProps): JSX.Element {
  const classNames = [
    styles.btnGroup,
    variant === 'connected' && styles.btnGroupConnected,
    variant === 'segmented' && styles.btnGroupSegmented,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

/* ── Default Export ─────────────────────────────────────────────────────────── */

export default ButtonGroup;
