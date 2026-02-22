import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './cards.module.css';

export interface GradientCardProps {
    gradient: string;
    icon: ReactNode;
    stat: string;
    label: string;
    title: string;
    href?: string;
}

/**
 * GradientCard
 * ------------
 * Eye-catching metric/stat card with a gradient background.
 * Great for dashboards, "by the numbers" sections, or KPI highlights.
 *
 * Usage:
 *   <GradientCard
 *     gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
 *     icon="🚀"
 *     stat="12k"
 *     label="Total deploys"
 *     title="Deployments"
 *   />
 */
export default function GradientCard({
    gradient,
    icon,
    stat,
    label,
    title,
    href,
}: GradientCardProps) {
    const Tag = href ? 'a' : 'div';

    return (
        <Tag
            href={href}
            aria-label={`${title}: ${stat}`}
            className={clsx(styles.gradientCard, href && styles.interactive)}
            style={{ background: gradient }}
        >
            {/* Shimmer overlay */}
            <div className={styles.gradientShimmer} aria-hidden="true" />

            <div className={styles.gradientContent}>
                <span className={styles.gradientIcon} aria-hidden="true">{icon}</span>
                <span className={styles.gradientStat}>{stat}</span>
                <span className={styles.gradientLabel}>{label}</span>
                <span className={styles.gradientTitle}>{title}</span>
            </div>
        </Tag>
    );
}