import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import React from 'react';
import styles from './404.module.css';

const recoveryLinks = [
  {
    href: '/docs',
    icon: '📚',
    label: 'Documentation',
    description: 'Browse all guides and references',
  },
  {
    href: '/docs/patterns/overview',
    icon: '🧩',
    label: 'Pattern Library',
    description: 'Explore production-ready contract patterns',
  },
  {
    href: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online',
    icon: '⭐',
    label: 'GitHub',
    description: 'View source and contribute',
    external: true,
  },
];

export default function NotFound() {
  return (
    <Layout title="404 – Page Not Found">
      <main className={styles.wrapper}>
        <div className={styles.glowOne} aria-hidden="true" />
        <div className={styles.glowTwo} aria-hidden="true" />
        <div className={styles.container}>
          <h1 className={styles.title}>Page Not Found</h1>
          <img
            src="/img/undraw_docusaurus_mountain.svg"
            alt="Illustration of a mountain landscape displayed on the 404 page not found error screen"
            className={styles.illustration}
            width={300}
            height={250}
            loading="lazy"
            decoding="async"
          />
          <p className={styles.subtitle}>
            This page doesn&apos;t exist in the cookbook — yet. It may have moved, <br />
            been renamed, or never been written.
          </p>
          <Link to="/" className={`sb-btn sb-btn--primary sb-btn--lg ${styles.homeBtn}`}>
            ← Back to Home
          </Link>
          <nav aria-label="Recovery navigation" className={styles.linksGrid}>
            {recoveryLinks.map(({ href, icon, label, description, external }) => (
              <Link
                key={href}
                to={href}
                className={styles.linkCard}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                <span className={styles.linkIcon} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.linkBody}>
                  <span className={styles.linkLabel}>{label}</span>
                  <span className={styles.linkDesc}>{description}</span>
                </span>
              </Link>
            ))}
          </nav>

          {/* Search hint */}
          <p className={styles.searchHint}>
            Looking for something specific?{' '}
            <Link to="/docs" className={styles.searchLink}>
              Try searching the docs ↗
            </Link>
          </p>
        </div>
      </main>
    </Layout>
  );
}
