import React from "react";
import { LucideIcon, LucideProps } from "lucide-react";
import clsx from "clsx";

/**
 * Icon sizes following the design system
 */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

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
export interface IconProps extends Omit<LucideProps, "size"> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** The size of the icon (xs, sm, md, lg, xl) */
  size?: IconSize;
  /** Custom size in pixels (overrides size prop) */
  customSize?: number;
  /** Whether the icon is decorative (will be hidden from screen readers) */
  decorative?: boolean;
  /** Custom className for additional styling */
  className?: string;
  /** Label for accessibility (required if not decorative) */
  ariaLabel?: string;
}

/**
 * A reusable, accessible icon wrapper component using Lucide icons.
 * Provides consistent sizing, styling, and accessibility features.
 *
 * @example
 * ```tsx
 * import { Box, Copy, Settings } from 'lucide-react';
 *
 * // Decorative icon (screen reader will ignore)
 * <Icon icon={Box} size="md" decorative />
 *
 * // Interactive icon with label
 * <Icon icon={Copy} size="sm" ariaLabel="Copy to clipboard" />
 *
 * // Custom size
 * <Icon icon={Settings} customSize={48} ariaLabel="Settings" />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = "md",
  customSize,
  decorative = false,
  className,
  ariaLabel,
  ...props
}) => {
  const iconSize = customSize ?? iconSizes[size];

  // Accessibility: If not decorative, we need a label
  const accessibilityProps = decorative
    ? {
        role: "img",
        "aria-hidden": true,
      }
    : {
        role: "img",
        "aria-label": ariaLabel,
      };

  return (
    <IconComponent
      size={iconSize}
      className={clsx("icon", `icon--${size}`, className)}
      {...accessibilityProps}
      {...props}
    />
  );
};

export default Icon;
