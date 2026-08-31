---
time: 15
sidebar_position: 1.5
title: Development Tools
description: Overview of essential tools, IDE extensions, testing frameworks, and monitoring utilities for Soroban smart contract development.
---

# Development Tools

This guide provides an overview of the essential tools needed for Soroban smart contract development, including command-line interfaces, IDE extensions, debugging utilities, testing frameworks, and deployment/monitoring tools.

## Stellar CLI

The [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (`stellar`) is the official, unified command-line tool for building, testing, deploying, and interacting with Soroban smart contracts and the Stellar network.

### Key Features
- **Project Initialization**: Easily scaffold new projects (`stellar contract init`).
- **Compilation & Optimization**: Compile Rust code into optimized WebAssembly (`stellar contract build`).
- **Deployment**: Deploy contracts to local sandbox, testnet, or mainnet networks (`stellar contract deploy`).
- **Invocation**: Interact with deployed contracts directly from the terminal (`stellar contract invoke`).
- **Key Management**: Securely create and manage keypairs and identities (`stellar keys generate`, `stellar keys fund`).

**Usage Example:**
```bash
# Build the contract
stellar contract build

# Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract.wasm \
  --source admin \
  --network testnet
```

> [!TIP]
> For a full side-by-side command translation from older `soroban-cli` tooling, see the [Stellar CLI Migration Guide](./stellar-cli-migration.md).

## IDE Extensions and Plugins

For the best development experience, we recommend using [Visual Studio Code (VS Code)](https://code.visualstudio.com/) with the following extensions:

| Extension | Purpose | Recommendation |
|-----------|---------|----------------|
| [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) | Advanced code completion, linting, and go-to-definition for Rust | **Essential** |
| [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) | Native debugging for Rust | Highly Recommended |
| [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) | Syntax highlighting for `Cargo.toml` files | Recommended |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | Inline display of errors and warnings | Recommended |

### Configuring rust-analyzer for the WASM target

By default, rust-analyzer analyzes your contract against the **native host target** (e.g. `x86_64-pc-windows-msvc`). Soroban contracts compile for `wasm32-unknown-unknown` and typically build with `#![no_std]`-style constraints, so code that is perfectly valid for a WASM build can show false red squiggles, missing `soroban_sdk` completions, or spurious "unresolved import" errors in the editor.

Point rust-analyzer at the WASM target to make the editor agree with the compiler.

#### VS Code workspace settings

Add this to `.vscode/settings.json` **in the contract project folder** (not your user settings — the target is per-project):

```json
{
  "rust-analyzer.cargo.target": "wasm32-unknown-unknown",
  "rust-analyzer.cfg.setTest": false
}
```

What each setting does:

| Setting | Effect |
|---------|--------|
| `rust-analyzer.cargo.target` | Makes rust-analyzer run `cargo metadata`/`cargo check` against `wasm32-unknown-unknown`, so the code model matches the real build. |
| `rust-analyzer.cfg.setTest` | Defaults to `true`, which enables `cfg(test)` for local crates. Soroban tests run on the **native** target (via `cargo test`), so leaving this on while targeting WASM can produce contradictory analysis. Set it to `false` unless you rely on in-editor `#[cfg(test)]` highlighting. |

After saving, run **Developer: Reload Window** (or use the rust-analyzer status-bar "Reload" action) so the server picks up the new target.

#### Keeping `cargo test` on the native target

`rust-analyzer.cargo.target` only affects the editor. Your own commands stay unchanged:

```bash
# Editor and builds agree on WASM
cargo build --target wasm32-unknown-unknown --release

# Tests still compile and run natively (fast feedback loop)
cargo test
```

To make the target the default for every cargo invocation in the project (including `cargo build` without flags), pin it in `.cargo/config.toml` at the project root:

```toml
[build]
target = "wasm32-unknown-unknown"
```

With this in place, `rust-analyzer.cargo.target` becomes redundant for cargo itself, but keeping the editor setting is still recommended so rust-analyzer and cargo can never disagree.

The equivalent environment variable, useful in CI or shells:

```bash
export CARGO_BUILD_TARGET=wasm32-unknown-unknown   # Linux/macOS
setx CARGO_BUILD_TARGET wasm32-unknown-unknown     # Windows (then reopen the shell)
```

#### Platform notes

The target triple and settings are identical on all platforms; only the rustup invocation and toolchain prerequisites differ:

| Platform | Install the target | Notes |
|----------|--------------------|-------|
| Linux | `rustup target add wasm32-unknown-unknown` | No extra linker needed for `cargo check`/rust-analyzer; WASM linking is done by rust-lld. |
| macOS (Intel & Apple Silicon) | `rustup target add wasm32-unknown-unknown` | Same as Linux. On Apple Silicon the *host* triple is `aarch64-apple-darwin` — this does not affect the WASM target. |
| Windows | `rustup target add wasm32-unknown-unknown` | Works with both `x86_64-pc-windows-msvc` and `gnu` host toolchains. No WASM-specific linker install is required. |

Verify the target is installed:

```bash
rustup target list --installed | grep wasm32-unknown-unknown
# or on Windows PowerShell:
rustup target list --installed | Select-String wasm32-unknown-unknown
```

#### Verifying the fix

1. Open a contract file that previously showed false errors (e.g. one using `soroban_sdk::contracttype` derives).
2. Check the rust-analyzer output panel (**View → Output → rust-analyzer**): the `cargo metadata` invocation should include `--target wasm32-unknown-unknown`.
3. Squiggles on valid `soroban_sdk` code should disappear; completions for SDK types should resolve.

If errors persist, confirm the target is installed (table above) and that `.vscode/settings.json` lives in the **workspace root** that VS Code opened — rust-analyzer reads settings from the opened folder, not a subfolder.

## Debugging Tools

When things don't work as expected, you need the right tools to identify the issue:

- **Cargo Toolchain**: Use `cargo check` and `cargo clippy` to catch syntax and logic errors early.
- **Stellar CLI Inspect**: Use `stellar contract inspect` to view contract metadata, functions, and storage specs.
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

- **Stellar CLI**: As mentioned above, the primary tool for deploying to any network.
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
| **Compilation** | Cargo / Stellar CLI | - |
| **Local Testing** | Cargo Test | Local Sandbox Network |
| **Deployment** | Stellar CLI | Stellar Laboratory |
| **Monitoring** | Stellar Expert | Custom RPC Scripts |

---

### Next Steps

Now that you're familiar with the tools, you can proceed to:
- Review [Environment Setup](./setup.md) to ensure your tools are properly configured.
- Start writing code in [Create Your First Contract](./first-contract.md).
