import type { ReactNode } from 'react';
import clsx from 'clsx';
import BaseCard from './BaseCard';
import styles from './cards.module.css';

export type ActionCardVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ActionCardProps {
    title: string;
    description: ReactNode;
    cta: string;
    variant?: ActionCardVariant;
    ctaHref?: string;
    onCtaClick?: () => void;
}

/**
 * ActionCard
 * ----------
 * Card with a prominent CTA button. Four variants for different contexts:
 *   default  — neutral, general purpose
 *   success  — positive action (deploy, confirm, save)
 *   warning  — caution required (update, review)
 *   danger   — destructive action (delete, reset)
 *
 * Usage:
 *   <ActionCard
 *     variant="success"
 *     title="Deploy Ready"
 *     description="All checks passed."
 *     cta="Deploy now"
 *     ctaHref="/deploy"
 *   />
 */
export default function ActionCard({
    title,
    description,
    cta,
    variant = 'default',
    ctaHref,
    onCtaClick,
}: ActionCardProps) {
    return (
        <BaseCard className={clsx(styles.actionCard, styles[`actionCard--${variant}`])}>
            <h3 className={styles.actionTitle}>{title}</h3>
            <p className={styles.actionDescription}>{description}</p>

            {ctaHref ? (
                <a
                    href={ctaHref}
                    className={clsx(styles.actionButton, styles[`actionButton--${variant}`])}
                >
                    {cta} →
                </a>
            ) : (
                <button
                    onClick={onCtaClick}
                    className={clsx(styles.actionButton, styles[`actionButton--${variant}`])}
                >
                    {cta} →
                </button>
            )}
        </BaseCard>
    );
}