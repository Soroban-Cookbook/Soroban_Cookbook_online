---
time: 20
title: Building and Compilation
description: A complete guide to compiling Soroban smart contracts — from source to WebAssembly artifact, including flags, optimization strategies, and common build error remediation.
sidebar_position: 4
---

This guide walks through the complete compilation pipeline for Soroban contracts: from Rust source code to a deployable WebAssembly (WASM) artifact. You will learn how each build step works, how to control build flags for debug versus release output, and how to diagnose common compilation errors.

OS-specific install steps, rust-analyzer, and WASM target checklists are in the [Environment Setup](./setup.md) guides: [Linux](./setup-linux.md), [macOS](./setup-macos.md), [Windows](./setup-windows.md).

## Repository toolchain

This cookbook **does not currently ship** a `rust-toolchain` or `rust-toolchain.toml` pin at the repository root. CI installs **Rust stable** and the `wasm32-unknown-unknown` target via `dtolnay/rust-toolchain@stable` in [`.github/workflows/ci.yml`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/.github/workflows/ci.yml). Example crates use **Rust edition 2021** and **soroban-sdk 27.0.3** (see `examples/hello-world/Cargo.toml`).

Use rustup's latest **stable** toolchain when contributing. Do not invent a different pin unless the repository adds a toolchain file.

## Prerequisites

Before building, make sure you have the following installed:

- **Rust** (stable toolchain) — [install via rustup](https://www.rust-lang.org/tools/install)
- **wasm32-unknown-unknown target** — required by this repository's examples, CI, and `scripts/test-examples.sh`
- **Stellar CLI** (`stellar`) — used to invoke the contract build pipeline

```bash
# Add the WASM compilation target used by this repository
rustup target add wasm32-unknown-unknown

# Install the Stellar CLI (requires Cargo)
cargo install --locked stellar-cli --features opt
```

Verify the installation (print whatever versions you actually have; do not treat the comments as a required pin):

```bash
rustc --version
stellar --version
rustup target list --installed
```

`rustup target list --installed` must include `wasm32-unknown-unknown`. You can also inspect the full catalog:

```bash
rustup target list
```

Look for `wasm32-unknown-unknown (installed)`.

The current Stellar CLI binary is `stellar`. The older `soroban` CLI is the same product line: **`soroban contract build` is now `stellar contract build`**. Use `stellar` for all new work. Some newer CLI releases may default to a different WASM target (for example `wasm32v1-none`); **this cookbook's CI and examples compile for `wasm32-unknown-unknown`**. When building cookbook crates with Cargo, pass that target explicitly as shown below.

## How Soroban compilation works

A Soroban contract goes through three stages before it is ready for deployment:

```
Rust source (.rs)
      │
      ▼  cargo build --target wasm32-unknown-unknown --release
Raw WASM artifact (target/.../release/*.wasm)
      │
      ▼  stellar contract build   (cargo + WASM optimize by default)
Optimised WASM (*.wasm in the cargo target dir, copied if --out-dir is set)
      │
      ▼  stellar contract deploy
Deployed contract (on-chain)
```

`stellar contract build` compiles crates with `crate-type = ["cdylib"]` for the WASM target and **optimizes the generated WASM by default**. The older standalone `stellar contract optimize` / `soroban contract optimize` commands are deprecated in current Stellar CLI help; prefer `stellar contract build` (pass `--optimize=false` only when you need a faster unoptimized iteration).

## Building with the Stellar CLI (recommended)

The simplest way to build a contract is with the `stellar contract build` command from inside the project directory:

```bash
cd my-contract
stellar contract build
```

This command (from current Stellar CLI help):

1. Builds crates referenced by `Cargo.toml` that have `cdylib` as their crate-type.
2. Uses the **release** profile unless you pass `--profile`.
3. Optimizes the generated WASM by default (`--optimize` defaults to `true`).
4. Writes artifacts to the Cargo target directory. With `--out-dir`, it also copies the WASM files there.

For this repository, the examples workspace lives at `examples/`. Build Hello World with:

```bash
cd examples
stellar contract build --package hello-world
```

The Cargo-produced artifact path used by this repo's tests is:

```
examples/target/wasm32-unknown-unknown/release/hello_world.wasm
```

### Specifying the output directory

```bash
stellar contract build --out-dir ./artifacts
```

`--out-dir` copies WASM files to the given directory **in addition to** the Cargo target directory.

### Building a specific contract in a workspace

In a Cargo workspace with multiple contracts, build only one package:

```bash
stellar contract build --package hello-world
```

If `--package` is omitted, the CLI builds every `cdylib` crate in the workspace. Other useful flags from current CLI help: `--manifest-path`, `--profile`, `--locked`, `--features`, `--all-features`, `--no-default-features`, `--print-commands-only`.

## Building with Cargo directly

You can also invoke `cargo` directly, which gives you more control over individual flags.

### Release build

```bash
cargo build \
  --target wasm32-unknown-unknown \
  --release
```

The WASM file is written to:

```
target/wasm32-unknown-unknown/release/<crate-name>.wasm
```

### Debug build

A debug build skips optimisations and retains debug symbols. This is useful when you need more verbose panic messages or want faster iteration:

```bash
cargo build --target wasm32-unknown-unknown
```

> **Note:** Debug builds produce significantly larger binaries and are not suitable for deployment. Use them only for local investigation.

### Checking the artifact size

```bash
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

A well-optimised contract is typically 10–200 KB. If your binary is unexpectedly large, see the [reducing binary size](#reducing-binary-size) section below.

## Useful compiler flags

### `RUSTFLAGS`

Set extra compiler flags through the `RUSTFLAGS` environment variable:

```bash
# Enable link-time optimisation (LTO) explicitly
RUSTFLAGS="-C lto=fat" cargo build --target wasm32-unknown-unknown --release

# Show all codegen options
RUSTFLAGS="--print codegen-units" cargo build --target wasm32-unknown-unknown --release
```

### Cargo profile settings

You can tune the release profile in `Cargo.toml`. The settings below are the recommended baseline for Soroban contracts:

```toml
[profile.release]
opt-level = "z"        # optimise for binary size
overflow-checks = true # panic on integer overflow
debug = 0              # strip DWARF information
strip = "symbols"      # remove symbol table
debug-assertions = false
panic = "abort"        # smaller panic handler
codegen-units = 1      # better inter-procedural optimisation
lto = true             # full link-time optimisation
```

`opt-level = "z"` targets the smallest possible binary. Use `opt-level = 3` if you are profiling CPU-bound code and need maximum speed at the expense of size.

### Enabling features

```bash
# Build with a specific feature enabled
cargo build --target wasm32-unknown-unknown --release --features my-feature

# Build with all features enabled
cargo build --target wasm32-unknown-unknown --release --all-features
```

## Optimising the WASM binary

Current Stellar CLI **optimizes during `stellar contract build` by default**. Skip that only for fast local iteration:

```bash
stellar contract build --optimize=false
```

`stellar contract optimize` still exists in CLI help but is **deprecated** in favour of `build --optimize`. If you compiled with Cargo only (no `stellar contract build`), you can still run:

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

That writes a sibling `*.optimized.wasm` when using the deprecated command. Prefer deploying the artifact produced by `stellar contract build`.

## Output structure

After a successful build, the project directory looks like this:

```
my-contract/
├── Cargo.toml
├── Cargo.lock
├── src/
│   └── lib.rs
└── target/
    └── wasm32-unknown-unknown/
        └── release/
            ├── hello_world.wasm               ← contract WASM (optimized when built with stellar contract build)
            └── ...                            ← linker / debug files
```

## Inspecting the compiled contract

Before deploying, inspect the contract interface to confirm the ABI is correct:

```bash
stellar contract info interface \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm
```

`stellar contract inspect` still exists but is **deprecated** in current CLI help; use `stellar contract info` (`interface`, `meta`, `hash`, and related subcommands).

Example interface for this repository's Hello World crate:

```
hello() -> String
set_message(message: String)
```

## Reducing binary size

If your contract is larger than expected, try these techniques in order:

| Technique                         | How                                  |
| --------------------------------- | ------------------------------------ |
| `opt-level = "z"`                 | Set in `[profile.release]`           |
| `lto = true`                      | Set in `[profile.release]`           |
| `codegen-units = 1`               | Set in `[profile.release]`           |
| `strip = "symbols"`               | Set in `[profile.release]`           |
| `panic = "abort"`                 | Removes formatting from panics       |
| Remove unused dependencies        | Audit `Cargo.toml` with `cargo tree` |
| Minimise `std` / use `#![no_std]` | Reduces runtime overhead             |
| Run `stellar contract build`      | Optimizes WASM by default            |

## Common build errors and remediation

### `error[E0463]: can't find crate for 'std'`

**Cause:** Trying to compile a `#![no_std]` crate with a target that does not have `std`. Usually means the WASM target is not installed.

**Fix:**

```bash
rustup target add wasm32-unknown-unknown
```

---

### `error: failed to get 'soroban-sdk' as a dependency`

**Cause:** Network issue or incorrect version specifier.

**Fix:**

```bash
# Update the registry
cargo update

# Check the crate name and version at crates.io
cargo search soroban-sdk
```

Ensure your `Cargo.toml` specifies a compatible SDK version, for example:

```toml
[dependencies]
soroban-sdk = "27.0.3"
```

---

### `WASM binary too large` / deployment rejects the file

**Cause:** The binary exceeds on-chain size limits (currently 64 KB for the compressed artifact).

**Fix:** Apply the optimisation settings in the [reducing binary size](#reducing-binary-size) table above, then re-run `stellar contract build`.

---

### `error: linker 'cc' not found`

**Cause:** A C linker is not on the system PATH. This is common on minimal CI images.

**Fix (Debian/Ubuntu):**

```bash
sudo apt-get install -y build-essential
```

**Fix (macOS):**

```bash
xcode-select --install
```

---

### `overflow` or `attempt to add with overflow` at runtime

**Cause:** The contract performs unchecked arithmetic and `overflow-checks = false` was set.

**Fix:** Add `overflow-checks = true` to `[profile.release]` in `Cargo.toml` to convert overflows to panics instead of silent wraparound.

---

### `error[E0277]: the trait bound 'T: IntoVal<Env, Val>' is not satisfied`

**Cause:** A type used as a contract function argument or return value does not implement the Soroban SDK serialisation traits.

**Fix:** Derive the required traits:

```rust
use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MyStruct {
    pub field: u32,
}
```

---

### Build hangs or takes very long

**Cause:** Full LTO (`lto = true`) with many dependencies can be slow.

**Fix for development:** Create a separate `dev` profile that skips LTO:

```toml
[profile.dev]
opt-level = 0
lto = false
codegen-units = 16
```

Then run `cargo build` (no `--release`) for fast iteration.

---

### `cargo test` passes but `stellar contract build` fails

**Cause:** Tests compile against the native target (`x86_64` or `aarch64`) while `stellar contract build` compiles for `wasm32-unknown-unknown`. Some crates are not WASM-compatible.

**Fix:** Identify offending crates with `cargo tree --target wasm32-unknown-unknown` and gate them behind `#[cfg(test)]` or a Cargo feature.

## Complete build workflow example

```bash
# 1. In this repository, use the canonical Hello World crate
cd examples

# 2. Compile the hello-world package
stellar contract build --package hello-world

# 3. Verify the artifact (workspace target dir)
ls -lh target/wasm32-unknown-unknown/release/hello_world.wasm

# 4. Inspect the ABI
stellar contract info interface \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm

# 5. Run unit tests (native target — fast feedback loop)
cargo test --package hello-world

# Optional: scaffold a new empty project (not the cookbook crate)
# stellar contract init my-counter
```

Deploy only after tests pass. Testnet steps are in [Deploy to Testnet](/docs/getting-started/deploy-testnet). Do not put private keys or seed phrases in these commands or in the repository.

## Build checklist

- [ ] Stable Rust via rustup (`rustc --version`) — this repo has no `rust-toolchain.toml`
- [ ] `wasm32-unknown-unknown` target installed (`rustup target list --installed`)
- [ ] Stellar CLI installed (`stellar --version`) — not the legacy `soroban` binary name
- [ ] `[profile.release]` configured with size and safety settings
- [ ] `cargo test` passes on the native target
- [ ] `stellar contract build` completes without errors
- [ ] Artifact size is within on-chain limits after optimization
- [ ] ABI inspected with `stellar contract info interface` and matches the crate
- [ ] Artifact validated on testnet before any mainnet attempt

## Next steps

- [Environment Setup](/docs/getting-started/setup) — Linux, macOS, and Windows toolchains, WASM target, rust-analyzer
- [Development Tools](/docs/getting-started/development-tools) — Stellar CLI, rust-analyzer, repository toolchain
- [Your First Contract](/docs/getting-started/first-contract) — Hello World crate walkthrough
- [Local Testing and Simulation](/docs/getting-started/local-testing-and-simulation) — test before deploying
- [Deploy to Testnet](/docs/getting-started/deploy-testnet) — put your compiled contract on the network
- [Contract Interaction](/docs/getting-started/contract-interaction) — invoke functions on a deployed contract
- [Gas and Resource Management](/docs/concepts/gas-and-resources) — understand and optimise on-chain costs
- [Optimization Playbook](/docs/patterns/optimization-playbook) — advanced size and performance patterns

## Additional resources

- [Soroban CLI reference](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)
- [wasm-opt — Binaryen](https://github.com/WebAssembly/binaryen)
- [Soroban SDK on docs.rs](https://docs.rs/soroban-sdk/latest)
