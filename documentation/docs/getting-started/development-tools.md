---
time: 15
sidebar_position: 1.5
title: Development Tools
description: Overview of essential tools, IDE extensions, testing frameworks, and monitoring utilities for Soroban smart contract development.
---

# Development Tools

This guide provides an overview of the essential tools needed for Soroban smart contract development, including command-line interfaces, IDE extensions, debugging utilities, testing frameworks, and deployment/monitoring tools.

## Soroban CLI

The [Soroban CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/soroban-cli) is the primary tool for building, testing, and deploying Soroban smart contracts.

### Key Features
- **Project Initialization**: Easily scaffold new projects (`soroban contract init`).
- **Compilation**: Compile Rust code into WebAssembly (`soroban contract build`).
- **Deployment**: Deploy contracts to local, testnet, or mainnet networks (`soroban contract deploy`).
- **Invocation**: Interact with deployed contracts directly from the terminal (`soroban contract invoke`).

**Usage Example:**
```bash
# Build the contract
soroban contract build

# Deploy to Testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract.wasm \
  --source admin \
  --network testnet
```

## IDE Extensions and Plugins

For the best development experience, we recommend using [Visual Studio Code (VS Code)](https://code.visualstudio.com/) with the following extensions:

| Extension | Purpose | Recommendation |
|-----------|---------|----------------|
| [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Advanced code completion, linting, and go-to-definition for Rust | **Essential** |
| [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) | Native debugging for Rust | Highly Recommended |
| [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) | Syntax highlighting for `Cargo.toml` files | Recommended |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | Inline display of errors and warnings | Recommended |

## Debugging Tools

When things don't work as expected, you need the right tools to identify the issue:

- **Cargo Toolchain**: Use `cargo check` and `cargo clippy` to catch syntax and logic errors early.
- **Soroban CLI Inspect**: Use `soroban contract inspect` to view contract metadata and storage.
- **Detailed Logs**: Append the `--verbose` flag during CLI invocations to get extended logs and stack traces.

For a deeper dive into debugging workflows and techniques, please see our comprehensive [Debugging Guide](./debugging.md).

## Testing Frameworks

Soroban integrates directly with standard Rust testing infrastructure.

- **Cargo Test**: The built-in testing framework for Rust. Write unit tests directly in your contract files and run them using `cargo test`.
- **Soroban Env Mocking**: The SDK provides mocking utilities (e.g., `env.mock_all_auths()`) to simulate signatures, authorization, and time during tests.

**Usage Example:**
```bash
# Run all tests in the project
cargo test

# Run tests with detailed console output
cargo test -- --nocapture
```

For more details, refer to the [Contract Testing Guide](./contract-testing.md).

## Deployment Tools

After developing and testing your contract, you have several options for deployment:

- **Soroban CLI**: As mentioned above, the primary tool for deploying to any network.
- **Stellar Laboratory**: The [Stellar Laboratory](https://laboratory.stellar.org/) is a web-based tool for creating, signing, and submitting transactions on the Stellar network. It's excellent for manual testing and network interaction.
- **Freighter Wallet**: For browser-based dApps, [Freighter](https://www.freighter.app/) is a non-custodial wallet extension that allows users to securely sign deployment or invocation transactions.

## Monitoring Tools

Monitoring your contracts post-deployment is crucial. Use network explorers to track transactions, events, and contract state.

| Tool | Description | Best For |
|------|-------------|----------|
| [Stellar Expert](https://stellar.expert/) | A comprehensive block explorer and analytics platform for Stellar and Soroban. | Tracking transaction status and contract balances. |
| [Soroban Explorer](https://soroban.stellar.org/) | Official block explorer tailored specifically for smart contract deployments and invocations. | Viewing contract interactions and deployed code. |
| [Stellar RPC](https://developers.stellar.org/docs/data/rpc/api-reference) | Query network data programmatically via standard RPC endpoints. | Building dApp front-ends and automated monitoring. |

## Quick Recommendations Table

| Task | Recommended Tool | Alternative |
|------|------------------|-------------|
| **Code Editing** | VS Code + rust-analyzer | IntelliJ Rust |
| **Compilation** | Cargo / Soroban CLI | - |
| **Local Testing** | Cargo Test | Local Sandbox Network |
| **Deployment** | Soroban CLI | Stellar Laboratory |
| **Monitoring** | Stellar Expert | Custom RPC Scripts |

---

### Next Steps

Now that you're familiar with the tools, you can proceed to:
- Review [Environment Setup](./setup.md) to ensure your tools are properly configured.
- Start writing code in [Create Your First Contract](./first-contract.md).
