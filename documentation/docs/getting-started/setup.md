# Environment Setup

Set up your Soroban development environment to start building smart contracts.

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
2. [Learn core concepts](../concepts/overview.md)
3. [Explore patterns](../patterns/overview.md)

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
- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)
