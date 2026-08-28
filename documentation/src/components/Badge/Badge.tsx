import React from 'react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────

export type BadgeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type BadgeStatus =
  'new' | 'updated' | 'coming-soon' | 'deprecated' | 'stable' | 'experimental' | 'draft';
export type TagCategory =
  'token' | 'defi' | 'nft' | 'security' | 'storage' | 'auth' | 'governance' | 'error-handling';
export type BadgeSize = 'sm' | 'md' | 'lg';

type BadgeVariant = BadgeDifficulty | BadgeStatus;

export interface BadgeProps {
  /** Difficulty or status variant */
  variant: BadgeVariant;
  /** Size — defaults to 'md' */
  size?: BadgeSize;
  /** Make the badge interactive (adds cursor + hover/focus styles) */
  clickable?: boolean;
  /** Accessible label override (use when badge is the only indicator) */
  'aria-label'?: string;
  /** Render as a role="status" element */
  asStatus?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface TagProps {
  /** Category variant */
  variant: TagCategory;
  /** Size — defaults to 'md' */
  size?: BadgeSize;
  /** Make the tag interactive */
  clickable?: boolean;
  /** Render as <button> or <a> when clickable */
  as?: 'span' | 'button' | 'a';
  href?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler;
}

// ── Badge ─────────────────────────────────────────────────────────────────

/**
 * Badge — pill-shaped status/difficulty indicator.
 *
 * Uses global `.sb-badge` classes from badges-tags.css.
 *
 * @example
 * <Badge variant="beginner" />
 * <Badge variant="new" size="sm" />
 * <Badge variant="stable" size="lg" />
 */
export function Badge({
  variant,
  size = 'md',
  clickable = false,
  asStatus = false,
  className,
  children,
  'aria-label': ariaLabel,
}: BadgeProps) {
  const label = children ?? variant;
  return (
    <span
      className={clsx(
        'sb-badge',
        `sb-badge--${variant}`,
        size !== 'md' && `sb-badge--${size}`,
        clickable && 'sb-badge--clickable',
        className,
      )}
      role={asStatus ? 'status' : undefined}
      aria-label={ariaLabel}>
      {label}
    </span>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────

/**
 * Tag — rounded-rectangle category label.
 *
 * Uses global `.sb-tag` classes from badges-tags.css.
 *
 * @example
 * <Tag variant="storage" />
 * <Tag variant="defi" size="sm" />
 * <Tag variant="token" clickable as="button" onClick={...} />
 */
export function Tag({
  variant,
  size = 'md',
  clickable = false,
  as: As = 'span',
  href,
  className,
  children,
  onClick,
}: TagProps) {
  const label = children ?? variant;
  const Element = href ? 'a' : As;
  return (
    <Element
      href={href}
      onClick={onClick}
      className={clsx(
        'sb-tag',
        `sb-tag--${variant}`,
        size !== 'md' && `sb-tag--${size}`,
        clickable && 'sb-tag--clickable',
        className,
      )}>
      {label}
    </Element>
  );
}
