import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import styles from './QuickNav.module.css';

export interface QuickNavItem {
  id: string;
  label: string;
  href?: string;
  level?: number;
}

export interface QuickNavProps {
  items?: QuickNavItem[];
  loading?: boolean;
  title?: string;
  className?: string;
}

export default function QuickNav({
  items = [],
  loading = false,
  title = 'On this page',
  className,
}: QuickNavProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (loading) {
    return (
      <nav className={clsx(styles.quickNav, className)} aria-label="Quick navigation">
        <div className={styles.title}>{title}</div>
        <div className={styles.loadingSkeleton}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonItem} />
          ))}
        </div>
      </nav>
    );
  }

  if (items.length === 0) {
    return (
      <nav className={clsx(styles.quickNav, className)} aria-label="Quick navigation">
        <div className={styles.title}>{title}</div>
        <p className={styles.emptyText}>No headings found.</p>
      </nav>
    );
  }

  return (
    <nav className={clsx(styles.quickNav, className)} aria-label="Quick navigation">
      <div className={styles.title}>{title}</div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            key={item.id}
            className={clsx(styles.item, item.level && item.level > 1 && styles.nested)}
            style={
              item.level
                ? ({ '--indent': `${(item.level - 1) * 0.75}rem` } as React.CSSProperties)
                : undefined
            }>
            <a
              href={item.href ?? `#${item.id}`}
              className={clsx(styles.link, activeId === item.id && styles.active)}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
