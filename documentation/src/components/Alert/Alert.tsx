import React, { type ReactNode } from 'react';
import clsx from 'clsx';
import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import styles from './Alert.module.css';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';
export type AlertDisplay = 'block' | 'inline';

export interface AlertProps {
  variant?: AlertVariant;
  display?: AlertDisplay;
  children: ReactNode;
  title?: string;
  icon?: ReactNode | boolean;
  className?: string;
  onClose?: () => void;
}

const variantIcons: Record<AlertVariant, React.ComponentType<{ size?: number }>> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

/**
 * Alert Component
 * ---------------
 * Displays important messages with visual emphasis for info, warning, error, and success states.
 * 
 * Features:
 * - Four semantic variants (info, warning, error, success)
 * - Block and inline display modes
 * - Optional icon support (auto, custom, or none)
 * - Optional title
 * - Accessible with proper ARIA attributes
 * - Dark mode support
 * 
 * Usage:
 *   <Alert variant="info">This is an informational message</Alert>
 *   <Alert variant="warning" title="Warning">Be careful with this action</Alert>
 *   <Alert variant="error" icon={false}>Error without icon</Alert>
 *   <Alert variant="success" display="inline">Inline success message</Alert>
 */
export default function Alert({
  variant = 'info',
  display = 'block',
  children,
  title,
  icon = true,
  className,
  onClose,
}: AlertProps) {
  const IconComponent = variantIcons[variant];
  const showIcon = icon !== false;
  const customIcon = typeof icon !== 'boolean' ? icon : null;

  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={clsx(
        styles.alert,
        styles[`alert--${variant}`],
        styles[`alert--${display}`],
        className
      )}>
      {showIcon && (
        <div className={styles.alert__icon}>
          {customIcon || <IconComponent size={20} />}
        </div>
      )}
      <div className={styles.alert__content}>
        {title && <div className={styles.alert__title}>{title}</div>}
        <div className={styles.alert__body}>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={styles.alert__close}
          aria-label="Close alert">
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}
