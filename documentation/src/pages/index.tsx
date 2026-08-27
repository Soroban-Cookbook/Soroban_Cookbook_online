/**
 * Homepage — index.tsx
 *
 * Issue #134: Page Speed Optimization
 * - Testimonials and NewsletterSignup are below-fold; lazy-loaded via
 *   React.lazy + Suspense so they are excluded from the critical bundle.
 * - A lightweight IntersectionObserver-based hook defers rendering until
 *   the section scrolls into view, reducing main-thread work on load.
 * - PatternPreview, Stats, and QuickStartSection remain eagerly loaded
 *   because they appear above the fold on most viewport sizes.
 */
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Link from '@docusaurus/Link';
import PatternPreview from '@site/src/components/PatternPreview';
import Layout from '@theme/Layout';
import Stats from '@site/src/components/Stats';
import QuickStartSection from '@site/src/components/QuickStartSection';
import { samplePatterns } from '@site/src/fixtures/patterns';
import { trackCtaClick } from '@site/src/utils/analytics';
import styles from './index.module.css';

// ── Lazy-loaded below-fold components ─────────────────────────────────────────
// Splitting these out keeps them out of the initial JS bundle, reducing parse
// time and improving TTI / LCP on the critical above-fold content.
const NewsletterSignup = lazy(() => import('@site/src/components/NewsletterSignup'));
const Testimonials = lazy(() => import('@site/src/components/UI/Testimonials'));

// ── IntersectionObserver hook ─────────────────────────────────────────────────
// Returns true once the ref'd element enters the viewport (with a 200 px
// rootMargin so content starts loading just before it scrolls into view).
// Falls back to `true` immediately in environments without IntersectionObserver
// (e.g. SSR / old browsers) so nothing is hidden.
function useInView(rootMargin = '200px'): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView];
}

// ── Minimal skeleton shown while lazy chunks load ────────────────────────────
function SectionSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        background: 'var(--ifm-background-surface-color, #f0f0f0)',
        borderRadius: 8,
        margin: '2rem auto',
        maxWidth: 960,
      }}
    />
  );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function Home() {
  // Defer rendering of below-fold sections until they near the viewport.
  const [newsletterRef, newsletterInView] = useInView();
  const [testimonialsRef, testimonialsInView] = useInView();

  return (
    <Layout
      title="Soroban Cookbook"
      description="Master Soroban smart contracts with practical patterns and production-ready guides.">
      {/* ── Above-fold hero ───────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>Build Smart Contracts</h1>

          <p className={styles.subtitle}>
            A modern, practical guide to building secure and optimized Soroban applications on
            Stellar.
          </p>

          <div className={styles.buttons}>
            <Link
              to="/docs"
              className={styles.primaryBtn}
              onClick={() => trackCtaClick('hero_get_started', '/docs')}>
              Get Started
            </Link>

            <Link
              to="/docs/patterns/overview"
              className={styles.secondaryBtn}
              onClick={() => trackCtaClick('hero_view_patterns', '/docs/patterns/overview')}>
              View Patterns
            </Link>
          </div>

          <div className={styles.features}>
            <div>⚡ Production-ready examples</div>
            <div>🔐 Security-first patterns</div>
            <div>📦 Reusable contract modules</div>
            <div>🚀 Performance optimization tips</div>
          </div>
        </div>
      </header>

      {/* ── Critical above-fold content ──────────────────────────────────── */}
      <div className={styles.container}>
        <PatternPreview
          patterns={samplePatterns}
          title="Popular Patterns"
          subtitle="Explore production-ready smart contract patterns used by developers worldwide"
          showViewAll={true}
          viewAllHref="/docs/patterns/overview"
          maxVisible={6}
          enableCarousel={true}
        />
        <Stats />
      </div>

      <QuickStartSection />

      {/* ── Below-fold: lazy-loaded with IntersectionObserver deferral ────── */}
      {/* NewsletterSignup */}
      <div ref={newsletterRef}>
        {newsletterInView && (
          <Suspense fallback={<SectionSkeleton height={220} />}>
            <NewsletterSignup />
          </Suspense>
        )}
      </div>

      {/* Testimonials */}
      <div ref={testimonialsRef}>
        {testimonialsInView && (
          <Suspense fallback={<SectionSkeleton height={300} />}>
            <Testimonials />
          </Suspense>
        )}
      </div>
    </Layout>
  );
}
