import type { ReactNode } from 'react';
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
                style={style}
            >
                {children}
            </a>
        );
    }

    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={ariaLabel}
            onClick={onClick}
            onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
            className={clsx(styles.baseCard, isInteractive && styles.interactive, className)}
            style={style}
        >
            {children}
        </div>
    );
}