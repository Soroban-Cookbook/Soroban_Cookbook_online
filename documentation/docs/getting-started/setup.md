---
time: 5
sidebar_position: 0
title: Environment Setup
description: Set up your Soroban development environment — install Rust, Stellar CLI, the WASM target, and rust-analyzer.
---

For platform-specific instructions, see [Linux](./setup-linux.md), [macOS](./setup-macos.md), or [Windows](./setup-windows.md). After tools are installed, compile with [Building and Compilation](./building-and-compilation.md).
description: Set up your Soroban development environment — install Rust, Stellar CLI, and configure your system for smart contract development.
---

# Environment Setup

For platform-specific instructions, see [macOS Environment Setup](/docs/getting-started/setup-macos), [Linux Environment Setup](/docs/getting-started/setup-linux), or [Windows Environment Setup](/docs/getting-started/setup-windows). If you are upgrading from older tooling, check the [Stellar CLI Migration Guide](/docs/getting-started/stellar-cli-migration).

<PrerequisitesChecker />

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
- **Rust** - Latest stable version
- **Stellar CLI** - Command-line interface for Stellar and Soroban smart contracts
- **Code Editor** - VS Code or your preferred editor
- **Git** - Version control

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

Install the official Stellar CLI with built-in Wasm optimization features:

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
stellar --help
```

You should see the Stellar CLI help output with contract, keys, network, and account subcommands.

## rust-analyzer

Install the [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) extension (VS Code / compatible editors). CodeLLDB is optional for debugging.

This repo's Rust **workspace** is `examples/Cargo.toml`, not the git root. If you open the whole cookbook, link that workspace so rust-analyzer can resolve `soroban_sdk`:
1. [Create your first contract](./first-contract.md)
2. [Review development tools](./development-tools.md)
3. [Learn core concepts](../concepts/overview)
4. [Explore patterns](../patterns/overview)

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
**Stellar CLI not found:**

- Restart your terminal after installation
- Check if the Cargo bin directory (`~/.cargo/bin`) is in your `PATH`
- Verify with `cargo install --list`

**Need Help?**

- [Stellar Discord](https://discord.gg/stellardev)
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)

## Frequently Asked Questions

### How do I install Rust for Soroban development?
You can install Rust by running:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
And verify with `rustc --version`.

### How do I install the Stellar CLI?
You can install it via Cargo:
```bash
cargo install --locked stellar-cli --features opt
```

### Why do I need the wasm32-unknown-unknown target?
Soroban smart contracts are compiled to WebAssembly (WASM). The `wasm32-unknown-unknown` target tells the Rust compiler to target WASM bytecode instead of native machine code.

<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I install Rust for Soroban development?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can install Rust by running curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh and verify it with rustc --version."
      }
    },
    {
      "@type": "Question",
      "name": "How do I install the Stellar CLI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can install it by running cargo install --locked stellar-cli --features opt."
      }
    },
    {
      "@type": "Question",
      "name": "Why do I need the wasm32-unknown-unknown target?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Soroban smart contracts are compiled to WebAssembly (WASM). The wasm32-unknown-unknown target tells the Rust compiler to target WASM bytecode instead of native machine code."
      }
    }
  ]
})}
</script>

