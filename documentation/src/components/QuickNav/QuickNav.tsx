import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { List, ChevronUp } from 'lucide-react';
import styles from './QuickNav.module.css';

export interface QuickNavItem {
  id: string;
  text: string;
  level: number;
}

export interface QuickNavProps {
  className?: string;
  /** Minimum number of headings required to show the nav (default 2). */
  minHeadings?: number;
  /** Heading levels to extract (default [2, 3]). */
  headingLevels?: number[];
  /** The container element selector to search for headings (default '.theme-doc-markdown'). */
  containerSelector?: string;
}

/**
 * QuickNav — Floating quick navigation menu that extracts headings from the document
 * and provides jump links for easy section navigation.
 *
 * Designed for long pattern pages like the optimization-playbook.mdx.
 *
 * Keyboard support:
 * - Tab/Shift+Tab to navigate links
 * - Enter to jump to section
 * - Escape to close mobile menu
 *
 * @example
 * <QuickNav />
 */
export default function QuickNav({
  className,
  minHeadings = 2,
  headingLevels = [2, 3],
  containerSelector = '.theme-doc-markdown',
}: QuickNavProps) {
  const [headings, setHeadings] = useState<QuickNavItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Extract headings from the DOM
  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const selector = headingLevels.map((l) => `h${l}[id]`).join(',');
    const elements = container.querySelectorAll(selector);

    const items: QuickNavItem[] = [];
    elements.forEach((el) => {
      const id = el.getAttribute('id');
      const text = el.textContent?.trim();
      const tag = el.tagName.toLowerCase();
      const level = parseInt(tag.slice(1), 10);
      if (id && text) {
        items.push({ id, text, level });
      }
    });

    setHeadings(items);

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (items.length === 0) return;

    // Set up IntersectionObserver to track active heading
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      },
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [containerSelector, headingLevels]);

  // Scroll to section when link is clicked
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      setIsOpen(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        navRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (headings.length < minHeadings) return null;

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close quick navigation' : 'Open quick navigation'}
        aria-expanded={isOpen}
        aria-controls="quicknav-menu"
        type="button">
        <List size={18} aria-hidden="true" />
        <span className={styles.toggleLabel}>On this page</span>
      </button>

      {/* Navigation menu — mobile overlay + desktop fixed sidebar */}
      <nav
        ref={navRef}
        id="quicknav-menu"
        className={clsx(styles.quicknav, isOpen && styles.quicknavOpen, className)}
        aria-label="Quick section navigation"
        role="navigation">
        <div className={styles.quicknavHeader}>
          <span className={styles.quicknavTitle}>On this page</span>
          <button
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close quick navigation"
            type="button">
            <ChevronUp size={16} aria-hidden="true" />
          </button>
        </div>

        <ul className={styles.quicknavList}>
          {headings.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={clsx(
                  styles.quicknavLink,
                  styles[`quicknavLinkLevel${item.level}`],
                  activeId === item.id && styles.quicknavLinkActive,
                )}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.id);
                }}
                aria-current={activeId === item.id ? 'true' : undefined}>
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
