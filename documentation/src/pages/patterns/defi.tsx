import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PatternPreview from '@site/src/components/PatternPreview';
import styles from '../index.module.css';
import React from 'react';
import { defiPatterns } from '@site/src/fixtures/patterns';

export default function DefiPage() {
  return (
    <Layout
      title="DeFi Patterns - Soroban Cookbook"
      description="Liquidity pools, staking, swaps, and lending protocols for Soroban smart contracts.">
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>DeFi Patterns & Protocols</h1>

          <p className={styles.subtitle}>
            Build decentralized finance applications with liquidity pools, staking, and swap
            mechanisms.
          </p>
          <p role="note">
            Educational examples only. The single-range concentrated-liquidity pool is explicitly
            non-production software and must not be used with real funds.
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
          patterns={defiPatterns}
          title="DeFi Patterns"
          subtitle="Explore DeFi concepts and educational contract examples"
          showViewAll={false}
          maxVisible={6}
          enableCarousel={false}
        />
      </div>
    </Layout>
  );
}
