---
title: Pattern library
description: Reusable Soroban smart contract patterns — storage, tokens, DeFi, and more.
image: /img/soroban-social-card.png
---

# Pattern Library

Reusable smart contract patterns for common use cases.

## Template example

The **[Hello World storage](/docs/patterns/hello-world)** pattern demonstrates the standard pattern page layout (metadata, prerequisites, implementation with code tabs, security, and related links). Copy its structure when adding new patterns.

## Available Patterns

Browse battle-tested contract patterns for various use cases.

### [Hello World Storage](/docs/patterns/hello-world)

<span class="sb-badge sb-badge--beginner">Beginner</span> <span class="sb-tag sb-tag--storage">Storage</span> <span class="sb-badge sb-badge--stable">Stable</span>

Minimal Soroban contract demonstrating instance storage. Perfect starting point for understanding contract structure and basic storage operations.

### [Basic Token Implementation](/docs/patterns/basic-token)

<span class="sb-badge sb-badge--beginner">Beginner</span> <span class="sb-tag sb-tag--token">Token</span> <span class="sb-badge sb-badge--stable">Stable</span>

Complete token contract with mint, transfer, and balance functions. Learn core token mechanics and authorization patterns before advancing to standardized interfaces like SAC.

### [Error Handling](/docs/patterns/error-handling)

**Difficulty**: Intermediate | **Category**: Architecture | **Status**: Stable

Error taxonomy, custom error patterns, error propagation strategies, and user-facing clarity recommendations for robust contract behavior.

### [Error Recovery](/docs/patterns/error-recovery)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--error-handling">Error Handling</span> <span class="sb-badge sb-badge--stable">Stable</span>

Comprehensive error handling patterns including Result types, fallback logic, graceful degradation, transaction rollback, and input validation. Essential for production-ready contracts.

### [Staking with Reward Distribution](/docs/patterns/staking)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--defi">DeFi</span> <span class="sb-badge sb-badge--stable">Stable</span>

Token staking with pro-rata reward distribution over epochs. Demonstrates lazy reward computation, epoch-based accounting, and efficient O(1) per-user storage without batch operations.

## Pattern Categories

### 🪙 [Token Standards](/patterns/tokens)

<span class="sb-tag sb-tag--token">Token</span>

Explore fungible token standards, wrappers, and vault mechanisms for building robust token systems.

- Basic token implementations
- Token wrappers and bridges
- Multi-token vaults

### 💰 [DeFi Patterns](/patterns/defi)

<span class="sb-tag sb-tag--defi">DeFi</span>

Build decentralized finance applications with liquidity pools, staking, atomic swaps, and lending protocols.

- Liquidity pools (AMM)
- **Staking contracts** with epoch-based rewards
- Atomic swaps
- Lending and borrowing

### 🗳️ [Governance](/patterns/governance)

<span class="sb-tag sb-tag--governance">Governance</span>

Implement decentralized governance with voting systems, DAOs, and proposal mechanisms.

- Voting systems
- DAO implementations
- Proposal factories
- Token delegation

### 🎨 [NFT Patterns](/patterns/nft)

<span class="sb-tag sb-tag--nft">NFT</span>

Create and manage non-fungible tokens with marketplaces and collection systems.

- NFT minting and transfers
- Marketplace contracts
- Collection management
- Royalty mechanisms

### 🔧 [Utility & Infrastructure](/patterns/utility)

<span class="sb-badge sb-badge--intermediate">Intermediate</span>

Build essential utility contracts for multi-signature wallets, escrow, and fund management.

- Multi-signature wallets
- Time-locked contracts
- Escrow services
- Registry systems

### ⚡ Advanced Patterns

<span class="sb-badge sb-badge--advanced">Advanced</span>

- Cross-contract calls
- Upgradeable contracts
- Oracle integration

## Using Patterns

Each pattern includes:

- ✅ Complete source code
- ✅ Unit tests
- ✅ Deployment guide
- ✅ Security considerations
- ✅ Best practices

## Contributing

Have a pattern to share? See our [Contributing Guide](https://github.com/Soroban-Cookbook/Soroban-Cookbook-/blob/main/CONTRIBUTING.md).

## Getting Started

Start exploring:

1. Review the [Core Concepts](../concepts/overview)
2. Pick a pattern that fits your use case
3. Study the implementation
4. Adapt it to your needs

## Resources

- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Community Patterns](https://github.com/Soroban-Cookbook/Soroban-Cookbook-)
