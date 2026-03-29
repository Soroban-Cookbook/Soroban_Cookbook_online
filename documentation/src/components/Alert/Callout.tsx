import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import { Info, AlertTriangle, XCircle, CheckCircle, Lightbulb } from 'lucide-react';
import styles from './Callout.module.css';

export type CalloutVariant = 'info' | 'warning' | 'error' | 'success' | 'tip';
export type CalloutDisplay = 'block' | 'inline';

export interface CalloutProps {
  variant?: CalloutVariant;
  display?: CalloutDisplay;
  children: ReactNode;
  title?: string;
  icon?: ReactNode | boolean;
  className?: string;
}

const variantIcons: Record<CalloutVariant, React.ComponentType<{ size?: number }>> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
  tip: Lightbulb,
};

/**
 * Callout Component
 * -----------------
 * Displays emphasized content blocks for documentation with visual distinction.
 * Similar to Alert but designed for static content emphasis rather than notifications.
 * 
 * Features:
 * - Five semantic variants (info, warning, error, success, tip)
 * - Block and inline display modes
 * - Optional icon support (auto, custom, or none)
 * - Optional title
 * - Accessible with proper ARIA attributes
 * - Dark mode support
 * 
 * Usage:
 *   <Callout variant="tip">Pro tip: Use this pattern for better performance</Callout>
 *   <Callout variant="warning" title="Important">Read this carefully</Callout>
 *   <Callout variant="info" icon={<CustomIcon />}>Custom icon example</Callout>
 */
export default function Callout({
  variant = 'info',
  display = 'block',
  children,
  title,
  icon = true,
  className,
}: CalloutProps) {
  const IconComponent = variantIcons[variant];
  const showIcon = icon !== false;
  const customIcon = typeof icon !== 'boolean' ? icon : null;

  return (
    <aside
      role="note"
      aria-label={title || `${variant} callout`}
      className={clsx(
        styles.callout,
        styles[`callout--${variant}`],
        styles[`callout--${display}`],
        className
      )}>
      {showIcon && (
        <div className={styles.callout__icon}>
          {customIcon || <IconComponent size={20} />}
        </div>
      )}
      <div className={styles.callout__content}>
        {title && <div className={styles.callout__title}>{title}</div>}
        <div className={styles.callout__body}>{children}</div>
      </div>
    </aside>
  );
}
