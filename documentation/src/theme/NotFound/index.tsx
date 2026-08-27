import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import React from 'react';
import styles from '../../pages/404.module.css';

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
  {
    href: '/docs/patterns/hello-world',
    icon: '👋',
    label: 'Hello World',
    description: 'A minimal contract example',
  },
];

export default function NotFound() {
  return (
    <Layout title="404 – Page Not Found">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className={styles.wrapper}>
        <div className={styles.glowOne} aria-hidden="true" />
        <div className={styles.glowTwo} aria-hidden="true" />

        <div className={styles.container}>
          <h1 className={styles.title}>Page Not Found</h1>

          <img
            src="/img/404.png"
            alt="A confused person flipping through a cookbook unable to find the page"
            className={styles.illustration}
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
