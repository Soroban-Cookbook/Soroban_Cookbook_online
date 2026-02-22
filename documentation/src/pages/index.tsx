import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import styles from "./index.module.css";

export default function Home() {
  return (
    <Layout
      title="Soroban Cookbook"
      description="Master Soroban smart contracts with practical patterns and production-ready guides."
    >
      <header className={styles.hero}>
        <div className={styles.glowOne}></div>
        <div className={styles.glowTwo}></div>

        <div className={styles.container}>
          <h1 className={styles.title}>
            Build Smart Contracts 
          </h1>

          <p className={styles.subtitle}>
            A modern, practical guide to building secure and optimized
            Soroban applications on Stellar.
          </p>

          <div className={styles.buttons}>
            <Link to="/docs" className={styles.primaryBtn}>
              Get Started
            </Link>

            <Link to="/docs/category/patterns" className={styles.secondaryBtn}>
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
    </Layout>
  );
}