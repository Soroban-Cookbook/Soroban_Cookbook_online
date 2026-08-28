---
sidebar_position: 0
title: What is Soroban?
description: Learn what Soroban is — Stellar's smart contract platform built for speed, scalability, and developer experience with Rust.
---

# What is Soroban?

title: What is Soroban?
description: Introduction to Soroban, Stellar's smart contract platform.
sidebar_position: 1
---

Welcome to Soroban, Stellar's smart contract platform. This guide introduces you to Soroban and explains why it matters in the Stellar ecosystem.

## The Basics

**Soroban** is a smart contract platform built on the Stellar network that lets you write, deploy, and execute smart contracts using Rust. Think of smart contracts as programs that run on a blockchain—they execute automatically when conditions are met, and their results are permanently recorded.

Unlike traditional applications that run on centralized servers, smart contracts run on a decentralized network, making them transparent, secure, and resistant to censorship.

## Why Soroban Matters

### 1. Built for Real-World Use

Soroban is designed for practical applications, not just experimentation. It combines:

- **Speed** - Sub-second transaction finality means your transactions confirm almost instantly
- **Low Costs** - Minimal fees make it economical for frequent transactions
- **Scalability** - Handles high transaction volumes without congestion

### 2. Developer-Friendly

- **Rust-Powered** - Leverage Rust's memory safety and rich ecosystem
- **Familiar Tools** - Use standard Rust tooling (Cargo, testing frameworks)
- **Clear Documentation** - Comprehensive guides and examples

### 3. Part of Stellar's Vision

Soroban extends Stellar's mission to democratize financial access by enabling:

- **Programmable Finance** - Create custom financial instruments and protocols
- **Cross-Border Payments** - Build applications that work globally
- **Asset Tokenization** - Represent real-world assets on-chain

## Key Concepts

### Smart Contracts

A smart contract is code that automatically executes when specific conditions are met. For example:

```rust
// A simple contract that stores a greeting
#[contract]
pub struct GreetingContract;

#[contractimpl]
impl GreetingContract {
    pub fn greet(env: Env, name: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}
```

### The Stellar Network

Soroban contracts run on the Stellar network, a decentralized payment network. This means:

- Your contracts benefit from Stellar's security and reliability
- You can interact with Stellar's native assets and accounts
- Your contracts are part of a global, open financial system

### WebAssembly (WASM)

Soroban contracts compile to WebAssembly, a portable binary format. This means:

- Contracts run efficiently on any platform
- Multiple languages could theoretically be supported (currently Rust)
- Contracts are deterministic and reproducible

### Ledger State

Contracts store data on the Stellar ledger. This data:

- Persists across transactions
- Is cryptographically secured
- Can be queried by anyone
- Costs fees based on storage size

## Common Use Cases

### 1. Token Management

Create and manage custom tokens with specific rules:

```
- Mint new tokens
- Transfer between accounts
- Implement access controls
- Track balances
```

### 2. Decentralized Finance (DeFi)

Build financial protocols:

```
- Automated market makers (AMMs)
- Lending and borrowing platforms
- Atomic swaps
- Liquidity pools
```

### 3. Governance

Implement decision-making systems:

```
- Voting mechanisms
- Proposal systems
- Multi-signature approvals
- Treasury management
```

### 4. Cross-Contract Interactions

Contracts can call other contracts:

```
- Compose functionality
- Build complex applications
- Reuse existing contracts
```

## How Soroban Fits in Stellar

```
┌─────────────────────────────────────┐
│     Stellar Network                 │
│  (Payments & Asset Exchange)        │
├─────────────────────────────────────┤
│     Soroban Smart Contracts         │
│  (Programmable Logic & Rules)       │
└─────────────────────────────────────┘
```

Soroban adds programmability to Stellar without compromising its core strengths: speed, low cost, and accessibility.

## Key Differences from Other Platforms

| Feature      | Soroban        | Ethereum        | Others |
| ------------ | -------------- | --------------- | ------ |
| **Language** | Rust           | Solidity        | Varies |
| **Finality** | Sub-second     | ~12 seconds     | Varies |
| **Fees**     | Very low       | Variable/High   | Varies |
| **Focus**    | Real-world use | General purpose | Varies |

## Your Learning Path

Ready to start building? Here's the recommended path:

1. **[Environment Setup](../getting-started/setup.md)** - Get your development tools ready
2. **[Your First Contract](../getting-started/first-contract.md)** - Build and test a simple contract
3. **[Core Concepts](./overview)** - Understand storage, authorization, and events
4. **[Deploy to Testnet](../getting-started/deploy-testnet.md)** - Put your contract on the network
5. **[Explore Patterns](../patterns/overview)** - Learn reusable contract patterns

## Essential Terminology

- **Contract** - A program deployed on Soroban that executes code
- **Ledger** - The distributed database where contract state is stored
- **Transaction** - A request to execute a contract function
- **Account** - An identity on the Stellar network (can invoke contracts)
- **WASM** - WebAssembly, the binary format contracts compile to
- **Testnet** - A test version of Stellar for development (free, no real value)
- **Mainnet** - The production Stellar network (real value, real fees)

## What You Can Build

With Soroban, you can create:

- ✅ Token contracts with custom logic
- ✅ DeFi protocols and financial instruments
- ✅ Governance and voting systems
- ✅ Cross-contract applications
- ✅ Real-world asset representations
- ✅ Payment automation systems

## Next Steps

- **Just starting?** → [Set up your environment](../getting-started/setup.md)
- **Want to understand more?** → [Read core concepts](./overview)
- **Ready to code?** → [Build your first contract](../getting-started/first-contract.md)

## Resources

- [Official Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Soroban SDK Reference](https://docs.rs/soroban-sdk)
- [Soroban Examples Repository](https://github.com/stellar/soroban-examples)
- [Stellar Developer Discord](https://discord.gg/stellardev)
- [Stellar Website](https://www.stellar.org)

## Questions?

Join the community:

- **Discord** - [Stellar Developer Community](https://discord.gg/stellardev)
- **GitHub** - [Soroban Cookbook Issues](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues)
- **Stack Overflow** - Tag your questions with `soroban`
