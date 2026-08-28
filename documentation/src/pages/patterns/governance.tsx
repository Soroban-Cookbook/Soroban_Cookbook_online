import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PatternPreview from '@site/src/components/PatternPreview';
import styles from '../index.module.css';
import React from 'react';
import { governancePatterns } from '@site/src/fixtures/patterns';

export default function GovernancePage() {
  return (
    <Layout
      title="Governance Patterns - Soroban Cookbook"
      description="DAO governance, voting systems, and proposal mechanisms for Soroban smart contracts.">
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>Governance & DAO Patterns</h1>

          <p className={styles.subtitle}>
            Implement decentralized governance with voting systems, proposals, and delegation
            mechanisms.
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
          patterns={governancePatterns}
          title="Governance Patterns"
          subtitle="Explore production-ready governance contract implementations"
          showViewAll={false}
          maxVisible={6}
          enableCarousel={false}
        />
      </div>
    </Layout>
  );
}
