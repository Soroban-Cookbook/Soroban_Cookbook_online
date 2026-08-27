---
time: 5
sidebar_position: 1
title: Environment Setup
description: Set up your Soroban development environment — install Rust, Soroban CLI, and configure your system for smart contract development.
---

# Environment Setup

For platform-specific instructions, see [Linux Environment Setup](/docs/getting-started/setup-linux) or [Windows Environment Setup](/docs/getting-started/setup-windows).

<PrerequisitesChecker />

## Prerequisites

Before you begin, ensure you have:


- **Rust** - Latest stable version
- **Soroban CLI** - Command-line interface for Soroban
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

### 2. Install Soroban CLI

```bash
cargo install --locked soroban-cli
```

Verify installation:

```bash
soroban --version
```

### 3. Configure Target

Add the WebAssembly target:

```bash
rustup target add wasm32-unknown-unknown
```

## Verify Your Setup

Test your environment with:

```bash
soroban --help
```

You should see the Soroban CLI help output.

## Next Steps

Now that your environment is ready:

1. [Create your first contract](./first-contract.md)
2. [Learn core concepts](../concepts/overview)
3. [Explore patterns](../patterns/overview)

## Troubleshooting

### Common Issues

**Rust installation fails:**

- Check your internet connection
- Ensure you have write permissions
- Try manual installation from [rust-lang.org](https://www.rust-lang.org/tools/install)

**Soroban CLI not found:**

- Restart your terminal after installation
- Check if cargo bin directory is in your PATH
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

### How do I install the Soroban CLI?
You can install it via Cargo:
```bash
cargo install --locked soroban-cli
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
      "name": "How do I install the Soroban CLI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can install it by running cargo install --locked soroban-cli."
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
