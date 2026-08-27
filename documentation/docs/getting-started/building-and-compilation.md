---
time: 20
title: Building and Compilation
description: A complete guide to compiling Soroban smart contracts — from source to WebAssembly artifact, including flags, optimization strategies, and common build error remediation.
sidebar_position: 4
---

This guide walks through the complete compilation pipeline for Soroban contracts: from Rust source code to a deployable WebAssembly (WASM) artifact. You will learn how each build step works, how to control build flags for debug versus release output, and how to diagnose common compilation errors.

## Prerequisites

Before building, make sure you have the following installed:

- **Rust** (stable toolchain) — [install via rustup](https://www.rust-lang.org/tools/install)
- **wasm32-unknown-unknown target** — required to compile to WASM
- **Soroban CLI** — used to invoke the optimised build pipeline

```bash
# Add the WASM compilation target
rustup target add wasm32-unknown-unknown

# Install the Soroban CLI (requires Cargo)
cargo install --locked stellar-cli --features opt
```

Verify the installation:

```bash
rustc --version          # e.g. rustc 1.77.0
stellar --version        # e.g. stellar 21.0.0
```

## How Soroban compilation works

A Soroban contract goes through three stages before it is ready for deployment:

```
Rust source (.rs)
      │
      ▼  cargo build --target wasm32-unknown-unknown --release
Raw WASM artifact (target/.../release/*.wasm)
      │
      ▼  stellar contract optimize  (uses wasm-opt)
Optimised WASM (*.optimized.wasm) — smaller, faster
      │
      ▼  stellar contract deploy
Deployed contract (on-chain)
```

`stellar contract build` is a convenience wrapper that runs both the `cargo build` and optimisation steps for you.

## Building with the Soroban CLI (recommended)

The simplest way to build a contract is with the `stellar contract build` command from inside the project directory:

```bash
cd my-contract
stellar contract build
```

This command:

1. Compiles the Rust workspace for the `wasm32-unknown-unknown` target with release optimisations.
2. Runs `wasm-opt` to shrink the binary.
3. Places the final artifact in `target/wasm32-unknown-unknown/release/`.

Expected output:

```
Compiling my-contract v0.1.0
Finished release [optimized] target(s) in 3.21s
```

### Specifying the output directory

```bash
stellar contract build --out-dir ./artifacts
```

### Building a specific contract in a workspace

In a Cargo workspace with multiple contracts, build only one at a time:

```bash
stellar contract build --package my-token
```

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

The Soroban CLI's `stellar contract optimize` sub-command runs `wasm-opt` from the Binaryen toolchain. It significantly reduces the binary's size and improves execution speed:

```bash
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/my_contract.wasm
```

This writes `my_contract.optimized.wasm` alongside the original. Always deploy the optimised artifact.

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
            ├── my_contract.wasm               ← raw artifact
            ├── my_contract.optimized.wasm     ← deploy this
            └── ...                            ← linker / debug files
```

## Inspecting the compiled contract

Before deploying, inspect the contract interface to confirm the ABI is correct:

```bash
stellar contract inspect \
  --wasm target/wasm32-unknown-unknown/release/my_contract.optimized.wasm
```

Example output:

```
Functions:
  initialize(admin: Address) -> ()
  transfer(from: Address, to: Address, amount: i128) -> ()
  balance(account: Address) -> i128
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
| Run `stellar contract optimize`   | Applies wasm-opt passes              |

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
soroban-sdk = "22.0.0"
```

---

### `WASM binary too large` / deployment rejects the file

**Cause:** The binary exceeds on-chain size limits (currently 64 KB for the compressed artifact).

**Fix:** Apply the optimisation settings in the [reducing binary size](#reducing-binary-size) table above, then re-run `stellar contract optimize`.

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
# 1. Create a new contract
stellar contract init my-counter
cd my-counter

# 2. Compile
stellar contract build

# 3. Verify the artifact
ls -lh target/wasm32-unknown-unknown/release/my_counter.optimized.wasm

# 4. Inspect the ABI
stellar contract inspect \
  --wasm target/wasm32-unknown-unknown/release/my_counter.optimized.wasm

# 5. Run unit tests (native target — fast feedback loop)
cargo test

# 6. Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_counter.optimized.wasm \
  --source my-testnet-account \
  --network testnet
```

## Build checklist

- [ ] `wasm32-unknown-unknown` target installed (`rustup target list --installed`)
- [ ] Soroban CLI installed (`stellar --version`)
- [ ] `[profile.release]` configured with size and safety settings
- [ ] `cargo test` passes on the native target
- [ ] `stellar contract build` completes without errors
- [ ] Optimised artifact size is below 64 KB compressed
- [ ] ABI inspected and matches expectations
- [ ] Artifact deployed successfully to testnet

## Next steps

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
