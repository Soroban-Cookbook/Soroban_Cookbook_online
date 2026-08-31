---
title: Pattern library
description: Reusable Soroban smart contract patterns — storage, tokens, DeFi, and more.
image: /img/soroban-social-card.png
---

# Pattern Library

Reusable smart contract patterns for common use cases.

## Template example

The [**Hello World storage*] (/docs/patterns/hello-world) pattern demonstrates the standard pattern page layout (metadata, prerequisites, implementation with code tabs, security, and related links). Copy its structure when adding new patterns.

## Available Patterns

Browse combat-tested contract patterns for various use cases.

### [Hello World Storage](/docs/patterns/hello-world)

<span class="sb-badge sb-badge--beginner">Beginner</span> <span class="sb-tag sb-tag--storage">Storage</span> <span class="sb-badge sb-badge--stable">Stable</span>

Minimal Soroban contract demonstrating instance storage. Perfect starting point for understanding contract structure and basic storage operations.

### [Basic Token Implementation](/docs/patterns/basic-token)

<span class="sb-badge sb-badge--beginner">Beginner</span> <span class="sb-tag sb-tag--token">Token</span> <span class="sb-badge sb-badge--stable">Stable</span>

Complete token contract with mint, transfer, and balance functions. Learn core token mechanics and authorization patterns before advancing to standardized interfaces like SAC.

### [Token Wrapper with Transfer Fee](/docs/patterns/token-wrapper)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--token">Token</span> <span class="sb-badge sb-badge--stable">Stable</span>

Minimal wrapper contract that applies a basis-point fee on transfers and routes the collected fees to a treasury address.

### [Error Handling](/docs/patterns/error-handling)

**Difficulty**: Intermediate | **Category**: Architecture | **Status**: Stable

Error taxonomy, custom error patterns, error propagation strategies, and user-facing clarity recommendations for robust contract behavior.

### [Error Recovery](/docs/patterns/error-recovery)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--error-handling">Error Handling</span> <span class="sb-badge sb-badge--stable">Stable</span>

Comprehensive error handling patterns including Result types, fallback logic, graceful degradation, transaction rollback, and input validation. Essential for production-ready contracts.

### [Staking with Reward Distribution](/docs/patterns/staking)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--defi">DeFi</span> <span class="sb-badge sb-badge--stable">Stable</span>

Token staking with pro-rata reward distribution over epocs. Demonstrates lazy reward computation, epoch-based accounting, and efficient O(1) per-user storage without batch operations.

### [HTLC Atomic Swap](/docs/patterns/htlc-swap)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--defi">DeFi</span> <span class="sb-badge sb-badge--stable">Stable</span>

Hash-time-locked contract for cross-party atomic swaps. Demonstrates hashlock, timelock, and refund mechanisms for trustless exchanges.

### [Batch Operations](/docs/patterns/batch-operations)

**Difficulty**: Intermediate | **Category**: Architecture | **Status**: Stable

Bound caller-controlled batches, amortize shared authorization and storage work, test the exact 20-operation limit, and size the guard against measured instruction and resource usage.

### [Basic Escrow](/docs/patterns/escrow-basic)

<span class="sb-badge sb-badge--beginner">Beginner</span> <span class="sb-tag sb-tag--utility">Utility</span> <span class="sb-badge sb-badge--stable">Stable</span>

Two-party escrow holding funds until a release condition is met. The starting point before the multi-party escrow pattern.

### [Timelock Vault](/docs/patterns/timelock-vault)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--utility">Utility</span> <span class="sb-badge sb-badge--stable">Stable</span>

Funds locked until a release timestamp, with tests covering early-withdrawal rejection and post-unlock release.

### [Contract Factory](/docs/patterns/contract-factory)

<span class="sb-badge sb-badge--advanced">Advanced</span> <span class="sb-tag sb-tag--architecture">Architecture</span> <span class="sb-badge sb-badge--stable">Stable</span>

Deploy and track multiple contract instances from a single factory contract, with deterministic child addresses.

### [Oracle Consumer](/docs/patterns/oracle-consumer)

<span class="sb-badge sb-badge--intermediate">Intermediate</span> <span class="sb-tag sb-tag--defi">DeFi</span> <span class="sb-badge sb-badge--stable">Stable</span>

Consume external price/data feeds from an oracle contract safely, including staleness checks and fallback handling.

### [Constant-Product AMM](/docs/patterns/constant-product-amm)

<span class="sb-badge sb-badge--advanced">Advanced</span> <span class="sb-tag sb-tag--defi">DeFi</span> <span class="sb-badge sb-badge--stable">Stable</span>

Full x·y=k AMM with swap, liquidity provision, and LP token accounting. Covers invariant math, integer rounding, and donation-attack mitigations.

## Pattern Categories

### 🪙 Token Standards

<span class="sb-tag sb-tag--token">Token</span>

Explore fungible token standards, wrappers, and vault mechanisms for building robust token systems.

- [Basic Token Implementation](/docs/patterns/basic-token)
- [Token Standards](/docs/patterns/token-standards)
- [Multi-Token Vault](/docs/patterns/multi-token-vault)

### 💰 DeFi Patterns

<span class="sb-tag sb-tag--defi">DeFi</span>

Build decentralized finance applications with liquidity pools, staking, atomic swaps, and lending protocols.

- [Constant-Product AMM](/docs/patterns/constant-product-amm) — x·y=k liquidity pool
- [Staking](/docs/patterns/staking) — epoch-based reward distribution
- [Streaming Payments](/docs/patterns/streaming-payments)
- [Timelock Vault](/docs/patterns/timelock-vault)

### 🗳️ Governance

<span class="sb-tag sb-tag--governance">Governance</span>

Implement decentralized governance with voting systems, DAOs, and proposal mechanisms.

- [Proposal Lifecycle](/docs/patterns/proposal-lifecycle)

### 🎨 NFT Patterns

<span class="sb-tag sb-tag--nft">NFT</span>

Create and manage non-fungible tokens. NFT-specific pattern pages are planned — see the [Token Standards](/docs/patterns/token-standards) page for current token primitives.

> **Note:** Dedicated NFT minting and marketplace patterns are tracked in the backlog. Contributions welcome — see the [Contributing Guide](#contributing).

### 🔧 Utility & Infrastructure

<span class="sb-badge sb-badge--intermediate">Intermediate</span>

Build essential utility contracts for multi-signature wallets, escrow, and fund management.

- [Escrow (Basic)](/docs/patterns/escrow-basic)
- [Escrow (Multi-party)](/docs/patterns/escrow-multiparty)
- [Contract Registry](/docs/patterns/contract-registry)
- [Contract Factory](/docs/patterns/contract-factory)
- [Oracle Consumer](/docs/patterns/oracle-consumer)

### ✨ Advanced Patterns
### ⚣ Advanced Patterns

<span class="sb-badge sb-badge--advanced">Advanced</span>

- [Authorization & Access Control](/docs/patterns/authorization)
- [Lifecycle & Upgrades](/docs/patterns/lifecycle-upgrades)
- [Reentrancy Guard](/docs/patterns/reentrancy-guard)
- [Optimization Playbook](/docs/patterns/optimization-playbook)

## Using Patterns
The patterns in this library provide practical, battle-tested Soroban contract examples covering common use cases such as storage, tokens, DeFi, access control, and governance. Each pattern is designed to be immediately useful and includes the following:

- **Source code** — Complete contract implementations with `#[contract]` and `#[contractimppled]` blocks
- **Tests** — Unit tests embedded within each pattern for verification of contract behavior
- **Security considerations** — Highlighted callouts and checklists addressing common security pitfalls, storage scope, authorization, and production readiness
- **Best practice callouts** — Guidance on topics such as input validation, error handling, and graceful degradation
- **Related patterns and concepts** — Links to connected patterns, concepts, and external resources for deeper learning

Some patterns also include deployment guidance, state migration strategies, and optimization techniques. The [hello world storage](/docs/patterns/hello-world) pattern demonstrates the standard pattern page layout and can be used as a template when adding new patterns.

## Examples Index

Browse the [Examples Index](/docs/patterns/examples-index) for a complete list of all example crates with their difficulty levels and pattern documentation status.

Browse the [Available Patterns](/docs/patterns/overview) to find the right pattern for your use case.

## Contributing

Have a pattern to share? See our [Contributing Guide](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/CONTRIBUTING.md).

## Getting Started

Start exploring:

1. Review the [Core Concepts](../concepts/overview)
2. Pick a pattern that fits your use case
3. Study the implementation
4. Adapt it to your needs

## Resources

- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Community Patterns](https://github.com/Soroban-Cookbook)