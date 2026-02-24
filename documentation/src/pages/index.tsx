import Link from "@docusaurus/Link";
import PatternPreview, { Pattern } from "@site/src/components/PatternPreview";
import Layout from "@theme/Layout";
import Stats from "@site/src/components/Stats";
import styles from "./index.module.css";
import React from "react";

const samplePatterns: Pattern[] = [
  {
    id: "1",
    contractName: "hello_world",
    description:
      "A minimal contract demonstrating persistent storage and basic contract structure.",
    tag: "#storage",
    category: "storage",
    difficulty: "beginner",
    popularity: 95,
    code: `pub fn hello(env: Env) -> String {
    env.storage().instance().get(&String::from_slice(&env, "hello"))
        .unwrap_or(String::from_slice(&env, "Hello, Soroban!"))
}`,
    href: "/docs/patterns/hello-world",
    icon: "👋",
  },
  {
    id: "2",
    contractName: "token_contract",
    description:
      "Implementation of a fungible token with mint, transfer, and balance functionality.",
    tag: "#tokens",
    category: "tokens",
    difficulty: "intermediate",
    popularity: 88,
    code: `pub fn mint(env: Env, to: Address, amount: i128) {
    env.storage().instance().extend_ttl(100, 100);
    // Mint logic here
}`,
    href: "/docs/patterns/token-contract",
    icon: "🪙",
  },
  {
    id: "3",
    contractName: "voting_contract",
    description:
      "Decentralized voting system with proposal creation and voting mechanisms.",
    tag: "#governance",
    category: "governance",
    difficulty: "advanced",
    popularity: 76,
    code: `pub fn vote(env: Env, voter: Address, proposal_id: u64, choice: bool) {
    require_auth(voter);
    // Voting logic here
}`,
    href: "/docs/patterns/voting-contract",
    icon: "🗳️",
  },
  {
    id: "4",
    contractName: "nft_contract",
    description:
      "Non-fungible token contract with mint, transfer, and metadata support.",
    tag: "#nft",
    category: "nft",
    difficulty: "intermediate",
    popularity: 82,
    code: `pub fn mint_nft(env: Env, to: Address, token_id: u64, metadata: String) {
    // NFT minting logic
}`,
    href: "/docs/patterns/nft-contract",
    icon: "🎨",
  },
  {
    id: "5",
    contractName: "liquidity_pool",
    description:
      "Automated market maker with liquidity provision and swap functionality.",
    tag: "#defi",
    category: "defi",
    difficulty: "advanced",
    popularity: 79,
    code: `pub fn swap(env: Env, token_a: Address, token_b: Address, amount_in: i128) -> i128 {
    // AMM swap logic
}`,
    href: "/docs/patterns/liquidity-pool",
    icon: "💧",
  },
  {
    id: "6",
    contractName: "multisig_wallet",
    description:
      "Multi-signature wallet for secure fund management with threshold requirements.",
    tag: "#utility",
    category: "utility",
    difficulty: "advanced",
    popularity: 71,
    code: `pub fn submit_transaction(env: Env, from: Address, to: Address, amount: i128) {
    // Multisig transaction logic
}`,
    href: "/docs/patterns/multisig-wallet",
    icon: "🔐",
  },
  {
    id: "7",
    contractName: "time_lock",
    description:
      "Time-locked contract for delayed fund release with vesting schedules.",
    tag: "#utility",
    category: "utility",
    difficulty: "intermediate",
    popularity: 68,
    code: `pub fn lock_funds(env: Env, amount: i128, release_time: u64) {
    // Time lock logic
}`,
    href: "/docs/patterns/time-lock",
    icon: "⏰",
  },
  {
    id: "8",
    contractName: "escrow_contract",
    description:
      "Secure escrow service for conditional fund release between parties.",
    tag: "#utility",
    category: "utility",
    difficulty: "intermediate",
    popularity: 74,
    code: `pub fn create_escrow(env: Env, buyer: Address, seller: Address, amount: i128) {
    // Escrow creation logic
}`,
    href: "/docs/patterns/escrow-contract",
    icon: "🤝",
  },
];

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
          <h1 className={styles.title}>Build Smart Contracts</h1>

          <p className={styles.subtitle}>
            A modern, practical guide to building secure and optimized Soroban
            applications on Stellar.
          </p>

          <div className={styles.buttons}>
            <Link to="/docs" className={styles.primaryBtn}>
              Get Started
            </Link>

            <Link to="/docs/patterns/overview" className={styles.secondaryBtn}>
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

      {/* Pattern Preview Section */}
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
    </Layout>
  );
}
