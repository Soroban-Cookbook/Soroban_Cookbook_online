import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import styles from './TutorialProgress.module.css';

export type TutorialProgressProps = {
  /**
   * Ordered step labels, from the `steps` frontmatter field. Each label must
   * match a heading's visible text on the page — its id is derived with the
   * same slug algorithm Docusaurus uses to generate heading anchors, so the
   * progress bar can find and scroll-spy the real section.
   */
  steps: string[];
  className?: string;
};

/**
 * Slugify a heading label the way Docusaurus's github-slugger generates
 * heading anchor ids: lowercase, drop punctuation, collapse whitespace to a
 * single hyphen. Good enough for the plain ASCII headings tutorial steps use;
 * it is not a full reimplementation of github-slugger's unicode handling.
 */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function computeProgressPercent(activeIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(activeIndex, 0), total - 1);
  return Math.round(((clamped + 1) / total) * 100);
}

/**
 * Given each tracked heading's current top offset (px, relative to the
 * viewport, e.g. from `getBoundingClientRect().top`) and a horizontal
 * threshold line, returns the index of the step whose heading was most
 * recently scrolled past — the last one at or above the line — or `0` if
 * the user hasn't reached the first heading yet.
 *
 * Pure by design: the component supplies live measurements, but the
 * "which step is active" decision itself needs no DOM or observer to test.
 */
export function pickActiveIndex(tops: number[], thresholdY: number): number {
  let active = 0;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= thresholdY) {
      active = i;
    }
  }
  return active;
}

/**
 * TutorialProgress — horizontal step bar for multi-step "getting started"
 * tutorials, driven by the `steps` frontmatter array (Phase 4 / issue #306).
 *
 * The active step advances as the reader scrolls past each heading
 * (IntersectionObserver-driven, re-measured with `pickActiveIndex` on every
 * observer callback) and clicking a step jumps straight to its section.
 */
export function TutorialProgress({ steps, className }: TutorialProgressProps) {
  const ids = useMemo(() => steps.map(slugify), [steps]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      return;
    }

    // Threshold line: 20% down the viewport. A heading counts as "passed"
    // once it scrolls above this line.
    const thresholdY = () => window.innerHeight * 0.2;

    const recompute = () => {
      const tops = elements.map((el) => el.getBoundingClientRect().top);
      setActiveIndex(pickActiveIndex(tops, thresholdY()));
    };

    const observer = new IntersectionObserver(recompute, {
      rootMargin: '0px',
      threshold: [0, 1],
    });
    elements.forEach((el) => observer.observe(el));

    // Also catch the initial position before any intersection fires.
    recompute();

    return () => observer.disconnect();
  }, [ids]);

  if (steps.length === 0) {
    return null;
  }

  const percent = computeProgressPercent(activeIndex, steps.length);

  const goToStep = (index: number) => {
    const id = ids[index];
    const el = id ? document.getElementById(id) : null;
    if (el) {
      setActiveIndex(index);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className={clsx(styles.progress, className)} aria-label="Tutorial progress">
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <ol className={styles.steps}>
        {steps.map((label, index) => {
          const status =
            index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming';
          return (
            <li key={ids[index] || label} className={styles.step}>
              <button
                type="button"
                className={clsx(styles.stepButton, styles[status])}
                aria-current={status === 'current' ? 'step' : undefined}
                onClick={() => goToStep(index)}>
                <span className={styles.stepMarker} aria-hidden="true">
                  {status === 'complete' ? '✓' : index + 1}
                </span>
                <span className={styles.stepLabel}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
