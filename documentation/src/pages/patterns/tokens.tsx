import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PatternPreview from '@site/src/components/PatternPreview';
import styles from '../index.module.css';
import React from 'react';
import { tokenPatterns } from '@site/src/fixtures/patterns';

export default function TokensPage() {
  return (
    <Layout
      title="Token Patterns - Soroban Cookbook"
      description="Fungible token standards, wrappers, and vaults for Soroban smart contracts.">
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>Token Standards & Patterns</h1>

          <p className={styles.subtitle}>
            Master fungible token implementation, wrappers, and vault mechanisms for Soroban.
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
          patterns={tokenPatterns}
          title="Token Patterns"
          subtitle="Explore production-ready token contract implementations"
          showViewAll={false}
          maxVisible={6}
          enableCarousel={false}
        />
      </div>
    </Layout>
  );
}
