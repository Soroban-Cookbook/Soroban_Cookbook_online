import type { ReactNode } from 'react';
import BaseCard from './BaseCard';
import styles from './cards.module.css';

export interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: ReactNode;
    accent?: string;
    href?: string;
}

/**
 * FeatureCard
 * -----------
 * Used on the homepage to highlight key features/benefits.
 * Icon wiggles on hover. Accent color tints the icon pill.
 *
 * Usage:
 *   <FeatureCard
 *     icon="⚡"
 *     title="Fast Performance"
 *     description="Optimized rendering with zero layout shifts."
 *     accent="#6366f1"
 *   />
 */
export default function FeatureCard({
    icon,
    title,
    description,
    accent = '#6366f1',
    href,
}: FeatureCardProps) {
    return (
        <BaseCard href={href} ariaLabel={href ? title : undefined} className={styles.featureCard}>
            {/* Icon pill — tinted with accent color via inline CSS variable */}
            <div
                className={styles.featureIcon}
                style={{ '--accent': accent } as React.CSSProperties}
                aria-hidden="true"
            >
                {icon}
            </div>

            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureDescription}>{description}</p>
        </BaseCard>
    );
}