import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import PatternPreview from '@site/src/components/PatternPreview';
import styles from '../index.module.css';
import React from 'react';
import { nftPatterns } from '@site/src/fixtures/patterns';

export default function NftPage() {
  return (
    <Layout
      title="NFT Patterns - Soroban Cookbook"
      description="Non-fungible tokens, marketplaces, and collections for Soroban smart contracts.">
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>NFT Patterns & Standards</h1>

          <p className={styles.subtitle}>
            Create and manage non-fungible tokens with marketplaces and collection systems.
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
          patterns={nftPatterns}
          title="NFT Patterns"
          subtitle="Explore production-ready NFT contract implementations"
          showViewAll={false}
          maxVisible={6}
          enableCarousel={false}
        />
      </div>
    </Layout>
  );
}
