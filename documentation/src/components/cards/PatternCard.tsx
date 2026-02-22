import { useState } from 'react';
import clsx from 'clsx';
import BaseCard from './BaseCard';
import styles from './cards.module.css';

export interface PatternCardProps {
    contractName: string;
    description: string;
    tag: string;
    code: string;
    href?: string;
}

/**
 * PatternCard
 * -----------
 * Special card for showcasing Soroban smart contract patterns.
 * Has an expandable code block — click "Show example" to reveal it.
 *
 * Usage:
 *   <PatternCard
 *     contractName="hello_world"
 *     tag="#storage"
 *     description="A minimal contract demonstrating persistent storage."
 *     code={`pub fn hello(env: Env) -> String { ... }`}
 *   />
 */
export default function PatternCard({
    contractName,
    description,
    tag,
    code,
    href,
}: PatternCardProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <BaseCard className={clsx(styles.patternCard)} ariaLabel={contractName}>
            {/* Header row */}
            <div className={styles.patternHeader}>
                <span className={styles.patternBadge}>SOROBAN CONTRACT</span>
                <span className={styles.patternTag}>{tag}</span>
            </div>

            {/* Contract name — monospace, feels like code */}
            <h3 className={styles.patternTitle}>
                {href ? <a href={href}>{contractName}</a> : contractName}
            </h3>

            <p className={styles.patternDescription}>{description}</p>

            {/* Toggle code block */}
            <button
                className={styles.patternToggle}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={`code-${contractName}`}
            >
                {expanded ? '▲ Hide' : '▼ Show'} example
            </button>

            {expanded && (
                <pre
                    id={`code-${contractName}`}
                    className={styles.patternCode}
                    tabIndex={0}
                    aria-label={`Code example for ${contractName}`}
                >
                    <code>{code}</code>
                </pre>
            )}
        </BaseCard>
    );
}