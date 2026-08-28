---
time: 15
sidebar_position: 1.5
title: Development Tools
description: Overview of essential tools, IDE extensions, testing frameworks, and monitoring utilities for Soroban smart contract development.
---

# Development Tools

This guide covers the tools this cookbook actually uses: the Stellar CLI, rust-analyzer, the repository Rust toolchain, and the WASM target required to compile examples.

OS install steps: [Linux](./setup-linux.md), [macOS](./setup-macos.md), [Windows](./setup-windows.md). Compile with [Building and Compilation](./building-and-compilation.md).

## Repository toolchain

This repository **does not currently ship** a `rust-toolchain` or `rust-toolchain.toml` file. GitHub Actions installs **Rust stable** with the `wasm32-unknown-unknown` target (`dtolnay/rust-toolchain@stable` in `.github/workflows/ci.yml`). Example crates use **edition 2021** and **soroban-sdk 27.0.3**.

Use rustup's latest stable toolchain. Do not add a toolchain pin unless maintainers add one to the repo.

## WASM target (`wasm32-unknown-unknown`)

Cookbook examples, CI, and `scripts/test-examples.sh` compile for **`wasm32-unknown-unknown`**. Install and verify it the same way on every OS:

```bash
rustup target add wasm32-unknown-unknown
rustup target list --installed
```

`rustup target list --installed` must include `wasm32-unknown-unknown`. The full catalog (`rustup target list`) should show `wasm32-unknown-unknown (installed)`.

## Stellar CLI

The current CLI binary is **`stellar`**. The older `soroban` name is the same product line: **`soroban contract build` is now `stellar contract build`**.

Install (matches [Building and Compilation](./building-and-compilation.md)):

```bash
cargo install --locked stellar-cli --features opt
stellar --version
```

### Key commands used in this cookbook

- **Project initialization**: `stellar contract init`
- **Compilation**: `stellar contract build` (optimizes WASM by default; `--package` and `--out-dir` are supported)
- **Interface**: `stellar contract info interface` (`stellar contract inspect` is deprecated)
- **Deployment / invoke**: `stellar contract deploy`, `stellar contract invoke`

**Usage example** (cookbook Hello World crate):

```bash
cd examples
stellar contract build --package hello-world
stellar contract info interface \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

Do not put private keys or seed phrases in CLI examples or in this repository.

Official install reference: [Install the Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli).

## rust-analyzer

[rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) is the language server for Rust. It is **essential** for editing cookbook examples.

This repo's Cargo **workspace** is `examples/Cargo.toml`, not the git root. If you open the whole cookbook in VS Code, link that workspace:

```json
{
  "rust-analyzer.linkedProjects": ["examples/Cargo.toml"]
}
```

Confirm `soroban_sdk` resolves (no `can't find crate` errors), then run:

```bash
cd examples
cargo test --package hello-world
```

| Extension | Purpose | Recommendation |
|-----------|---------|----------------|
| [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Completion, linting, go-to-definition | **Essential** |
| [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) | Native debugging for Rust | Highly recommended |
| [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) | Syntax highlighting for `Cargo.toml` | Recommended |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | Inline errors and warnings | Recommended |

If rust-analyzer does not start: check `which rustc` / `which cargo` in the editor terminal, then `"terminal.integrated.inheritEnv": true` in VS Code.

## Debugging tools

- **Cargo**: `cargo check`, `cargo clippy`, `cargo test`
- **Contract interface**: `stellar contract info interface --wasm <path>`
- **Verbose CLI**: `--verbose` on Stellar CLI commands when diagnosing network or build failures

See the [Debugging Guide](./debugging.md).

## Testing frameworks

Soroban uses standard Rust tests. Cookbook crates put tests in `src/lib.rs` (or `src/test.rs`) under `#[cfg(test)]`. Hello World tests are `test_default_greeting` and `test_custom_greeting` in [`examples/hello-world/src/lib.rs`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/hello-world/src/lib.rs).

```bash
cd examples
cargo test --package hello-world
```

See the [Contract Testing Guide](./contract-testing.md).

## Deployment and monitoring

- **Stellar CLI** — deploy and invoke after [testnet](./deploy-testnet.md) validation. Mainnet requires the [safety checklist](./deploy-mainnet.md#required-reading--safety-checklist).
- **Stellar Laboratory** — [laboratory.stellar.org](https://laboratory.stellar.org/)
- **Freighter** — [freighter.app](https://www.freighter.app/)
- **Stellar Expert** — [stellar.expert](https://stellar.expert/)
- **Stellar RPC** — [RPC docs](https://developers.stellar.org/docs/data/rpc/api-reference)

## Quick recommendations

| Task | Recommended tool |
|------|------------------|
| **Code editing** | VS Code + rust-analyzer (`examples/Cargo.toml`) |
| **Compilation** | `stellar contract build` or `cargo build --target wasm32-unknown-unknown --release` |
| **Local testing** | `cargo test` |
| **Deployment** | Stellar CLI (testnet first) |
| **Monitoring** | Stellar Expert |

### Next steps

- [Environment Setup](./setup.md)
- [Your First Contract](./first-contract.md)
- [Building and Compilation](./building-and-compilation.md)
