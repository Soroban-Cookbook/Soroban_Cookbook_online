/**
 * Button Component - Comprehensive button system with dark mode support
 * 
 * Features:
 * - Variants: primary, secondary, tertiary, ghost, danger
 * - Sizes: small, medium, large
 * - States: default, hover, active, focus, disabled, loading
 * - Icon support: icon buttons, icon-only buttons
 * - Button groups: connected button sets
 * - Accessibility: WCAG 2.1 AA compliant, keyboard navigation
 * - Dark mode: optimized colors and contrast
 */

import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import styles from './buttons.module.css';

/* ── Types ──────────────────────────────────────────────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show loading state */
  loading?: boolean;
  /** Loading text (shown when loading) */
  loadingText?: string;
  /** Icon to display before the label */
  startIcon?: ReactNode;
  /** Icon to display after the label */
  endIcon?: ReactNode;
  /** Render as icon-only button (no text) */
  iconOnly?: boolean;
  /** Make button full width */
  fullWidth?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Button label (children) */
  children?: ReactNode;
}

/* ── Component ──────────────────────────────────────────────────────────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      loadingText,
      startIcon,
      endIcon,
      iconOnly = false,
      fullWidth = false,
      className = '',
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Build class names
    const classNames = [
      styles.btn,
      styles[`btn${capitalize(variant)}`],
      styles[`btn${capitalize(size)}`],
      iconOnly && styles.btnIcon,
      iconOnly && styles.btnIconOnly,
      loading && styles.btnLoading,
      fullWidth && styles.btnFullWidth,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Determine if we should show loading spinner
    const showLoading = loading && !loadingText;
    const showLoadingText = loading && loadingText;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={classNames}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {/* Loading Spinner */}
        {showLoading && <span className={styles.loadingSpinner} aria-hidden="true" />}

        {/* Start Icon (hidden when loading without text) */}
        {startIcon && !showLoading && (
          <span className={styles.btnWithIcon} aria-hidden="true">
            {startIcon}
          </span>
        )}

        {/* Button Content */}
        <span className={loading ? styles.loadingText : undefined}>
          {showLoadingText ? loadingText : children}
        </span>

        {/* End Icon (hidden when loading) */}
        {endIcon && !loading && (
          <span className={styles.btnWithIcon} aria-hidden="true">
            {endIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/* ── Helper Functions ───────────────────────────────────────────────────────── */

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── Default Export ─────────────────────────────────────────────────────────── */

export default Button;
