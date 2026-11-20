import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import clsx from 'clsx';

/**
 * Icon sizes following the design system
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Mapping of icon sizes to pixel values
 */
export const iconSizes: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Props for the Icon component
 */
export interface IconProps extends Omit<LucideProps, 'size' | 'title'> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** The size of the icon (xs, sm, md, lg, xl) */
  size?: IconSize;
  /** Custom size in pixels (overrides size prop) */
  customSize?: number;
  /**
   * When true (default), the icon is decorative: aria-hidden is set and it is
   * ignored by screen readers (avoids double announcement next to visible text).
   * When false, a non-empty `title` is required for an accessible name.
   */
  decorative?: boolean;
  /**
   * Accessible name. Required when `decorative={false}`.
   * Prefer a short label (e.g. "Copy to clipboard").
   */
  title?: string;
  /**
   * @deprecated Prefer `title` when `decorative={false}`.
   * Still accepted so existing callers keep working; used as the name if `title` is omitted.
   */
  ariaLabel?: string;
  /** Custom className for additional styling */
  className?: string;
}

/**
 * A reusable, accessible icon wrapper component using Lucide icons.
 * Provides consistent sizing, styling, and accessibility features.
 *
 * By default icons are decorative (`aria-hidden`). Pass `decorative={false}`
 * and a `title` when the icon is the sole accessible label (e.g. icon-only button).
 *
 * @example
 * ```tsx
 * import { Box, Copy, Settings } from 'lucide-react';
 *
 * // Decorative (default) — next to visible text
 * <Icon icon={Box} size="md" />
 *
 * // Named icon (icon-only control)
 * <Icon icon={Copy} size="sm" decorative={false} title="Copy to clipboard" />
 *
 * // Custom size
 * <Icon icon={Settings} customSize={48} decorative={false} title="Settings" />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  customSize,
  decorative = true,
  className,
  title,
  ariaLabel,
  ...props
}) => {
  const iconSize = customSize ?? iconSizes[size];
  const accessibleName = (title ?? ariaLabel)?.trim() || undefined;

  if (!decorative && !accessibleName) {
    throw new Error(
      'Icon: when decorative is false, a non-empty title is required (ariaLabel is accepted as a fallback).',
    );
  }

  const accessibilityProps = decorative
    ? {
        'aria-hidden': true as const,
      }
    : {
        role: 'img' as const,
        'aria-hidden': false as const,
        'aria-label': accessibleName,
        title: accessibleName,
      };

  return (
    <IconComponent
      size={iconSize}
      className={clsx('icon', `icon--${size}`, className)}
      {...accessibilityProps}
      {...props}
    />
  );
};

export default Icon;
