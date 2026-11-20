---
sidebar_position: 1
title: Core Concepts
description: Essential Soroban concepts — storage, authorization, events, error handling, and contract lifecycle for robust smart contracts.
---

# Core Concepts

Essential concepts for building Soroban smart contracts.

## Overview

Understanding these core concepts will help you build robust and efficient Soroban contracts.

## Key Topics

### [Storage & State Management](/docs/concepts/storage)

Learn how to persist data in your contracts using Soroban's storage system.

### [Storage TTL & State Archival](/docs/concepts/storage-ttl)

Manage entry lifetimes, extend TTLs, and understand state archival costs.

### [Authorization & Access Control](/docs/concepts/authorization)

Implement secure authentication and authorization patterns.

### [Events & Logging](/docs/concepts/events)

Emit events and logs for contract monitoring and debugging.

### [Error Handling](/docs/concepts/error-handling)

Proper error handling and recovery strategies.

### [Simulation & Footprints](./simulation-and-footprints)

Understand preflight simulation, ledger footprints, authorization modes, and why simulation success can still fail on-chain.

### [Contract Lifecycle](/docs/patterns/lifecycle-upgrades)

Understanding deployment, upgrades, and contract lifecycle management.

## Getting Started

Start with:

1. [What is Soroban?](/docs/concepts/introduction) — Beginner-friendly introduction
2. [Soroban Best Practices](/docs/concepts/best-practices) — do/don't rules for new developers
3. [Storage Patterns](/docs/concepts/storage) — Learn data persistence
4. [Authorization](/docs/concepts/authorization) — Secure your contracts
5. [Events](/docs/concepts/events) — Monitor contract activity
6. [Simulation and Footprints](./simulation-and-footprints) — Preflight lifecycle and footprints

## Security: Keys, Wallets, RPC, and Networks

Before you run CLI commands, sign transactions, connect to RPC, or prepare a deployment, read this section. It applies to every workflow on this page that touches keys, wallets, R PC, or a network.

### Key handling

- **Never commit or paste secret keys or seed phrases.** Treat them like passwords: keep them out of source control, chat, tickets, screenshots, and logs.
- **Prefer named identities or a wallet extension.** Use the CLI's secret key management (e.g. named identities) or a wallet extension to sign, rather than hardcoding secrets in scripts or shell history.
- **Use separate keys per environment.** Keep development, testnet, and mainnet identities distinct, so a compromised test key cannot move real funds.
- **Rotate any key that may have leaked.** If a secret key or seed phrase is exposed, move assets to a new identity immediately.

### Network risk

- **Testnet vs mainnet.** Testnet is for experimentation and discardable data. Mainnet handles real funds and real users — treat every deploy, upgrade, and signed transaction as production change.
- **Real-fund risk.** On mainnet, bugs, wrong addresses, and missing authorization checks can cost real assets. Test on testnet and review authorization and storage behavior first.
- **RPC and public endpoints are not a substitute for careful ops.** Public RPC endpoints can be slow, intermittent, or unauthenticated; depend on them for development, but use a trusted RPC provider and verify transaction results for anything touching real funds.

For the canonical checklist, see [Soroban Best Practices](/docs/concepts/best-practices). See also the deploy and mainnet guidance in this documentation before shipping to a public network.

## Resources

- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [SDK Reference](https://docs.rs/soroban-sdk)
