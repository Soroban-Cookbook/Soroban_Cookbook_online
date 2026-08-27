import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PatternPreview from '@site/src/components/PatternPreview';
import styles from '../index.module.css';
import React from 'react';
import { utilityPatterns } from '@site/src/fixtures/patterns';

export default function UtilityPage() {
  return (
    <Layout
      title="Utility Patterns - Soroban Cookbook"
      description="Multisig, escrow, timelock, and utility contracts for Soroban smart contracts.">
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>Utility & Infrastructure Patterns</h1>

          <p className={styles.subtitle}>
            Build essential utility contracts for multi-signature, escrow, and fund management.
          </p>

          <div className={styles.buttons}>
            <Link to="/docs/patterns/overview" className={styles.secondaryBtn}>
              ← Back to Patterns
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <PatternPreview
          patterns={utilityPatterns}
          title="Utility Patterns"
          subtitle="Explore production-ready utility contract implementations"
          showViewAll={false}
          maxVisible={6}
          enableCarousel={false}
        />
      </div>
    </Layout>
  );
}
