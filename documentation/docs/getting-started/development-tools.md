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
## Stellar CLI

The [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) (`stellar`) is the official, unified command-line tool for building, testing, deploying, and interacting with Soroban smart contracts and the Stellar network.

### Key Features
- **Project Initialization**: Easily scaffold new projects (`stellar contract init`).
- **Compilation & Optimization**: Compile Rust code into optimized WebAssembly (`stellar contract build`).
- **Deployment**: Deploy contracts to local sandbox, testnet, or mainnet networks (`stellar contract deploy`).
- **Invocation**: Interact with deployed contracts directly from the terminal (`stellar contract invoke`).
- **Key Management**: Securely create and manage keypairs and identities (`stellar keys generate`, `stellar keys fund`).

```bash
rustup target add wasm32-unknown-unknown
rustup target list --installed
```

`rustup target list --installed` must include `wasm32-unknown-unknown`. The full catalog (`rustup target list`) should show `wasm32-unknown-unknown (installed)`.
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

## Stellar CLI

The current CLI binary is **`stellar`**. The older `soroban` name is the same product line: **`soroban contract build` is now `stellar contract build`**.

Install (matches [Building and Compilation](./building-and-compilation.md)):
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

```bash
cargo install --locked stellar-cli --features opt
stellar --version
```

### Key commands used in this cookbook
- **Cargo Toolchain**: Use `cargo check` and `cargo clippy` to catch syntax and logic errors early.
- **Stellar CLI Inspect**: Use `stellar contract inspect` to view contract metadata, functions, and storage specs.
- **Detailed Logs**: Append the `--verbose` flag during CLI invocations to get extended logs and stack traces.

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
- **Stellar CLI**: As mentioned above, the primary tool for deploying to any network.
- **Stellar Laboratory**: The [Stellar Laboratory](https://laboratory.stellar.org/) is a web-based tool for creating, signing, and submitting transactions on the Stellar network. It's excellent for manual testing and network interaction.
- **Freighter Wallet**: For browser-based dApps, [Freighter](https://www.freighter.app/) is a non-custodial wallet extension that allows users to securely sign deployment or invocation transactions.

## Debugging tools

- **Cargo**: `cargo check`, `cargo clippy`, `cargo test`
- **Contract interface**: `stellar contract info interface --wasm <path>`
- **Verbose CLI**: `--verbose` on Stellar CLI commands when diagnosing network or build failures

See the [Debugging Guide](./debugging.md).

## Testing frameworks

Soroban uses standard Rust tests. Cookbook crates put tests in `src/lib.rs` (or `src/test.rs`) under `#[cfg(test)]`. Hello World tests are `test_default_greeting` and `test_custom_greeting` in [`examples/hello-world/src/lib.rs`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/hello-world/src/lib.rs).
| Task | Recommended Tool | Alternative |
|------|------------------|-------------|
| **Code Editing** | VS Code + rust-analyzer | IntelliJ Rust |
| **Compilation** | Cargo / Stellar CLI | - |
| **Local Testing** | Cargo Test | Local Sandbox Network |
| **Deployment** | Stellar CLI | Stellar Laboratory |
| **Monitoring** | Stellar Expert | Custom RPC Scripts |

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
