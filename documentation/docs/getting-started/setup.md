---
time: 5
sidebar_position: 0
title: Environment Setup
description: Set up your Soroban development environment — install Rust, Stellar CLI, the WASM target, and rust-analyzer.
---

For platform-specific instructions, see [Linux](./setup-linux.md), [macOS](./setup-macos.md), or [Windows](./setup-windows.md). After tools are installed, compile with [Building and Compilation](./building-and-compilation.md).

## Prerequisites

Before you begin, ensure you have:

- **Rust** — latest **stable** toolchain via [rustup](https://www.rust-lang.org/tools/install)
- **Stellar CLI** (`stellar`) — command-line interface for contract build and deploy
- **wasm32-unknown-unknown** — WASM target used by this repository
- **Code editor** — VS Code or another editor with rust-analyzer
- **Git** — version control

## Repository toolchain

This repository **does not currently include** a `rust-toolchain` or `rust-toolchain.toml` file. CI installs Rust **stable** plus `wasm32-unknown-unknown` (see `.github/workflows/ci.yml`). Example crates use edition **2021** and **soroban-sdk 27.0.3**. Use rustup stable; do not add a toolchain pin unless maintainers add one to the repo.

## Installation overview

These commands are the same idea on every OS. Follow the OS guide for package managers and PATH details.

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify:

```bash
rustc --version
cargo --version
```

### 2. Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
```

Verify:

```bash
stellar --version
```

The older `soroban` CLI name is superseded. **`soroban contract build` is now `stellar contract build`.**

### 3. Add the WASM target (required)

Cookbook examples, CI, and `scripts/test-examples.sh` compile for `wasm32-unknown-unknown`. Install it explicitly:

```bash
rustup target add wasm32-unknown-unknown
```

Verify (same check on Linux, macOS, and Windows):

```bash
rustup target list --installed
```

The list **must** include `wasm32-unknown-unknown`. The full catalog also shows the flag:

```bash
rustup target list
```

Look for `wasm32-unknown-unknown (installed)`.

## rust-analyzer

Install the [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) extension (VS Code / compatible editors). CodeLLDB is optional for debugging.

This repo's Rust **workspace** is `examples/Cargo.toml`, not the git root. If you open the whole cookbook, link that workspace so rust-analyzer can resolve `soroban_sdk`:

```json
{
  "rust-analyzer.linkedProjects": ["examples/Cargo.toml"]
}
```

Confirm the language server loads without `can't find crate` errors, then run `cargo test --package hello-world` from `examples/`.

## Verify your setup

```bash
rustc --version
cargo --version
stellar --version
rustup target list --installed
stellar --help
```

You should see version output and `wasm32-unknown-unknown` among installed targets.

## Next steps

1. [Create your first contract](./first-contract.md) — `examples/hello-world`
2. [Building and Compilation](./building-and-compilation.md)
3. [Development Tools](./development-tools.md) — rust-analyzer and Stellar CLI
4. [Learn core concepts](../concepts/overview.md)
5. [Explore patterns](../patterns/overview.md)

## Troubleshooting

**Rust installation fails:**

- Check your internet connection
- Ensure you have write permissions
- Try manual installation from [rust-lang.org](https://www.rust-lang.org/tools/install)

**`stellar` not found:**

- Restart your terminal after installation
- Ensure `$HOME/.cargo/bin` (or `%USERPROFILE%\.cargo\bin` on Windows) is on `PATH`
- Verify with `cargo install --list`

**Need Help?**

- [Stellar Discord](https://discord.gg/stellardev)
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
