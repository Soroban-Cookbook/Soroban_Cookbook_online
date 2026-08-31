---
time: 5
sidebar_position: 1
title: Environment Setup
description: Set up your Soroban development environment — install Rust, Stellar CLI, and configure your system for smart contract development.
---

# Environment Setup

For platform-specific instructions, see [macOS Environment Setup](/docs/getting-started/setup-macos), [Linux Environment Setup](/docs/getting-started/setup-linux), or [Windows Environment Setup](/docs/getting-started/setup-windows). If you are upgrading from older tooling, check the [Stellar CLI Migration Guide](/docs/getting-started/stellar-cli-migration).

<PrerequisitesChecker />

## Prerequisites

Before you begin, ensure you have:

- **Rust** - Latest stable version
- **Stellar CLI** - Command-line interface for Stellar and Soroban smart contracts
- **Code Editor** - VS Code or your preferred editor
- **Git** - Version control

## Installation Steps

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Verify installation:

```bash
rustc --version
cargo --version
```

### 2. Install Stellar CLI

Install the official Stellar CLI with built-in Wasm optimization features:

```bash
cargo install --locked stellar-cli --features opt
```

Verify installation:

```bash
stellar --version
```

### 3. Configure Target

Add the WebAssembly target:

```bash
rustup target add wasm32-unknown-unknown
```

## Verify Your Setup

Test your environment with:

```bash
stellar --help
```

You should see the Stellar CLI help output with contract, keys, network, and account subcommands.

## Next Steps

Now that your environment is ready:

1. [Create your first contract](./first-contract.md)
2. [Review development tools](./development-tools.md)
3. [Learn core concepts](../concepts/overview)
4. [Explore patterns](../patterns/overview)

## Troubleshooting

### Common Issues

**Rust installation fails:**

- Check your internet connection
- Ensure you have write permissions
- Try manual installation from [rust-lang.org](https://www.rust-lang.org/tools/install)

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

