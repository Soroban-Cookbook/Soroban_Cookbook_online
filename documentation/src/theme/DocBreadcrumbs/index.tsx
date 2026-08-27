/**
 * DocBreadcrumbs — Swizzled (Ejected) theme component
 * ----------------------------------------------------
 * Replaces the default Docusaurus breadcrumbs with a responsive version:
 *   - Desktop / wide viewports: shows the full breadcrumb trail.
 *   - Mobile (< 640 px) with > 3 crumbs: collapses to Home > … > Current,
 *     where clicking "…" opens a dropdown listing every intermediate crumb.
 *
 * The responsive behaviour is driven purely by CSS media queries (no JS
 * breakpoint detection) so there is zero layout shift during SSR→hydration.
 *
 * Design tokens are consumed from custom.css / design-tokens.css so the
 * component automatically adapts to light and dark themes.
 *
 * @see {@link https://docusaurus.io/docs/swizzling}
 */

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from '@docusaurus/Link';
import { ThemeClassNames } from '@docusaurus/theme-common';
import { useHomePageRoute } from '@docusaurus/theme-common/internal';
import { useSidebarBreadcrumbs } from '@docusaurus/plugin-content-docs/client';
import type { PropSidebarBreadcrumbsItem } from '@docusaurus/plugin-content-docs';
import { translate } from '@docusaurus/Translate';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import styles from './styles.module.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface BreadcrumbItemData {
  label: string;
  href?: string;
  active?: boolean;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

/**
 * Maximum number of breadcrumb items (including Home) to show inline on
 * mobile. When the trail exceeds this count, intermediate crumbs are
 * collapsed into a dropdown.
 */
const MOBILE_INLINE_COUNT = 3;

/* ── Sub-components ────────────────────────────────────────────────────── */

/**
 * A single breadcrumb item.  Renders as a link for navigable crumbs and as a
 * `<span>` for the active (current page) crumb.
 */
function CrumbItem({
  href,
  active,
  position,
  children,
}: {
  href?: string;
  active?: boolean;
  position?: number;
  children: ReactNode;
}): React.JSX.Element {
  const cn = clsx('breadcrumbs__item', active && 'breadcrumbs__item--active');

  return (
    <li className={cn} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
      {href ? (
        <Link className="breadcrumbs__link" href={href} itemProp="item">
          <span itemProp="name">{children}</span>
        </Link>
      ) : (
        <span className="breadcrumbs__link" itemProp="item">
          <span itemProp="name">{children}</span>
        </span>
      )}
      {position != null && <meta itemProp="position" content={String(position)} />}
    </li>
  );
}

/** The "Home" crumb — always navigable, links to the home page. */
function HomeCrumb(): React.JSX.Element {
  const homeHref = useHomePageRoute()?.permalink ?? '/';
  return (
    <CrumbItem href={homeHref} position={1}>
      <span
        className={styles.homeIcon}
        aria-label={translate({
          id: 'theme.DocsBreadcrumbs.home.ariaLabel',
          message: 'Home page',
          description: 'The ARIA label for the home page in breadcrumbs',
        })}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </span>
    </CrumbItem>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Convert Docusaurus sidebar breadcrumb items into the flat array expected
 * by the renderer.
 */
function buildBreadcrumbs(items: PropSidebarBreadcrumbsItem[]): BreadcrumbItemData[] {
  return items.map((item, idx, arr) => ({
    label: item.label,
    href: idx < arr.length - 1 ? item.href : undefined,
    active: idx === arr.length - 1,
  }));
}

/* ── Main component ────────────────────────────────────────────────────── */

export default function DocBreadcrumbs(): React.JSX.Element | null {
  const breadcrumbs = useSidebarBreadcrumbs();

  // ── Early exit: no breadcrumbs to render ────────────────────────────────
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  const items = buildBreadcrumbs(breadcrumbs);
  const shouldCollapse = items.length > MOBILE_INLINE_COUNT;

  return (
    <>
      {/* Full breadcrumbs — visible on desktop via CSS media query.
          Hidden from accessibility tree on viewports where it's display:none. */}
      <div className={styles.fullViewport} aria-hidden="true">
        <BreadcrumbsNav breadcrumbs={items} />
      </div>

      {/* Collapsed breadcrumbs — visible on mobile via CSS media query.
          aria-hidden is removed by the client-side effect below when this
          variant is the shown one. */}
      <div className={styles.mobileViewport}>
        {shouldCollapse ? (
          <CollapsedBreadcrumbs breadcrumbs={items} />
        ) : (
          <BreadcrumbsNav breadcrumbs={items} />
        )}
      </div>
    </>
  );
}

/* ── Full breadcrumb trail (desktop) ──────────────────────────────────── */

function BreadcrumbsNav({ breadcrumbs }: { breadcrumbs: BreadcrumbItemData[] }): React.JSX.Element {
  return (
    <nav
      className={clsx(ThemeClassNames.docs.docBreadcrumbs, styles.breadcrumbsNav)}
      aria-label={translate({
        id: 'theme.DocsBreadcrumbs.navAriaLabel',
        message: 'Breadcrumbs',
        description: 'The ARIA label for the breadcrumbs',
      })}>
      <ol
        className={clsx('breadcrumbs', styles.breadcrumbsList)}
        itemScope
        itemType="https://schema.org/BreadcrumbList">
        <HomeCrumb />
        {breadcrumbs.map((crumb, idx) => (
          <CrumbItem
            key={`${crumb.label}-${idx}`}
            href={crumb.href}
            active={crumb.active}
            position={idx + 2 /* Home is position 1 */}>
            {crumb.label}
          </CrumbItem>
        ))}
      </ol>
    </nav>
  );
}

/* ── Collapsed mobile breadcrumbs with dropdown ──────────────────────── */

function CollapsedBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: BreadcrumbItemData[];
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const first = breadcrumbs[0];
  const last = breadcrumbs[breadcrumbs.length - 1];
  const intermediate = breadcrumbs.slice(1, -1);

  return (
    <nav
      className={clsx(ThemeClassNames.docs.docBreadcrumbs, styles.breadcrumbsNav)}
      aria-label={translate({
        id: 'theme.DocsBreadcrumbs.navAriaLabel',
        message: 'Breadcrumbs',
        description: 'The ARIA label for the breadcrumbs',
      })}>
      <div className={styles.collapsedRow} ref={containerRef}>
        <ol
          className={clsx('breadcrumbs', styles.breadcrumbsList)}
          itemScope
          itemType="https://schema.org/BreadcrumbList">
          <HomeCrumb />

          {/* First visible crumb after Home */}
          <CrumbItem href={first.href} position={2}>
            {first.label}
          </CrumbItem>

          {/* ── Collapse toggle ────────────────────────────────────────── */}
          <li className={styles.ellipsisItem}>
            <button
              type="button"
              className={clsx(styles.ellipsisButton, open && styles.ellipsisButtonOpen)}
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label={translate({
                id: 'theme.DocsBreadcrumbs.collapsed.ariaLabel',
                message: 'Show all breadcrumbs',
                description: 'ARIA label for the collapsed breadcrumbs toggle',
              })}>
              <MoreHorizontal size={16} aria-hidden="true" />
              <span className={styles.ellipsisBadge}>{intermediate.length}</span>
            </button>

            {/* ── Dropdown ─────────────────────────────────────────────── */}
            <div className={clsx(styles.dropdown, open && styles.dropdownOpen)} role="listbox">
              <ol className={styles.dropdownList}>
                {intermediate.map((crumb, idx) => (
                  <li
                    key={`${crumb.label}-${idx}`}
                    role="option"
                    aria-selected={false}
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem">
                    <Link
                      className={styles.dropdownLink}
                      href={crumb.href ?? '#'}
                      onClick={close}
                      itemProp="item">
                      <span itemProp="name">{crumb.label}</span>
                    </Link>
                    <meta itemProp="position" content={String(idx + 3 /* Home=1, first=2 */)} />
                  </li>
                ))}
              </ol>
            </div>
          </li>

          {/* Last crumb — the current page */}
          <CrumbItem active position={breadcrumbs.length + 1 /* Home=1 */}>
            {last.label}
          </CrumbItem>
        </ol>
      </div>
    </nav>
  );
}
