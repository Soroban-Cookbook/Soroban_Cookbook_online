import React from 'react';
import clsx from 'clsx';
import styles from './PatternDoc.module.css';
import { Badge } from '../Badge';
import type { BadgeDifficulty, BadgeStatus, TagCategory } from '../Badge';

export type PatternMetaProps = {
  slug: string;
  difficulty: BadgeDifficulty;
  category: TagCategory | string;
  status?: BadgeStatus;
  lastReviewed?: string;
  /** Optional estimated completion time (minutes or human-readable string). */
  time?: string | number;
};

/**
 * Normalize a `time` frontmatter / prop value into a display label.
 * Accepts minutes as a number, or strings like `5`, `5m`, `5 min`, `10 minutes`, `1h`.
 */
export function parseEstimatedTime(time: string | number | undefined | null): string | null {
  if (time == null || time === '') {
    return null;
  }

  if (typeof time === 'number') {
    if (!Number.isFinite(time) || time <= 0) {
      return null;
    }
    const minutes = Math.round(time);
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }

  const raw = String(time).trim();
  if (!raw) {
    return null;
  }

  const hourMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i);
  if (hourMatch) {
    const hours = Number(hourMatch[1]);
    const minutes = Math.round(hours * 60);
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }

  const minMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)?$/i);
  if (minMatch) {
    const minutes = Math.round(Number(minMatch[1]));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return null;
    }
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }

  // Preserve already-formatted labels (e.g. "10–15 min", "about 20 minutes").
  return raw;
}

export type EstimatedTimeProps = {
  /** Estimated minutes (number) or a human-readable time string from frontmatter. */
  time: string | number;
  className?: string;
};

/**
 * EstimatedTime — compact badge showing expected tutorial / pattern completion time.
 *
 * Typically driven by the `time` frontmatter field (see DocItem/Content wrapper).
 *
 * @example
 * <EstimatedTime time={5} />
 * <EstimatedTime time="10 min" />
 */
export function EstimatedTime({ time, className }: EstimatedTimeProps) {
  const label = parseEstimatedTime(time);
  if (!label) {
    return null;
  }

  return (
    <span
      className={clsx(styles.estimatedTime, className)}
      data-estimated-time={label}
      role="status"
      aria-label={`Estimated time: ${label}`}>
      <span className={styles.estimatedTimePrefix} aria-hidden="true">
        Est.
      </span>
      <span className={styles.estimatedTimeLabel}>{label}</span>
    </span>
  );
}

export function PatternMeta({
  slug,
  difficulty,
  category,
  status = 'stable',
  lastReviewed,
  time,
}: PatternMetaProps) {
  const estimated = parseEstimatedTime(time);

  return (
    <div className={styles.metaCard} data-pattern-slug={slug}>
      <div className={styles.metaHeader}>
        {estimated ? <EstimatedTime time={time!} /> : null}
        <Badge variant={difficulty} size="md" asStatus />
        {status && status !== 'stable' && <Badge variant={status} size="sm" />}
      </div>
      <dl className={styles.metaGrid}>
        <div>
          <dt>Category</dt>
          <dd>{category}</dd>
        </div>
        <div>
          <dt>Pattern ID</dt>
          <dd>
            <code>{slug}</code>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
        {estimated ? (
          <div>
            <dt>Est. time</dt>
            <dd>{estimated}</dd>
          </div>
        ) : null}
        {lastReviewed ? (
          <div>
            <dt>Last reviewed</dt>
            <dd>{lastReviewed}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function PatternSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} className={styles.section} aria-labelledby={headingId}>
      <h2 className={styles.sectionTitle} id={headingId}>
        {title}
      </h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export function PatternCallout({
  variant = 'info',
  title,
  children,
}: {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={clsx(styles.callout, styles[`callout${variant}`])} role="note">
      {title ? <p className={styles.calloutTitle}>{title}</p> : null}
      <div>{children}</div>
    </aside>
  );
}
