# Tiny Contract

A deliberately minimal Soroban contract used as a reproducible benchmark for WebAssembly size and optimization passes.

## What it demonstrates

- A very small contract surface area
- Release-profile tuning for `panic = "abort"`, `lto = true`, and symbol stripping
- A repeatable before/after optimization workflow for the playbook

## Build

```bash
cargo build --manifest-path examples/tiny-contract/Cargo.toml --target wasm32-unknown-unknown --release
```

The default release build lands in:

```text
examples/target/wasm32-unknown-unknown/release/tiny_contract.wasm
```

## Optimize with Binaryen

```bash
stellar contract optimize \
  --wasm examples/target/wasm32-unknown-unknown/release/tiny_contract.wasm \
  --out examples/target/wasm32-unknown-unknown/release/tiny_contract.optimized.wasm
```

## Reproducible size comparison

The following table is a simple benchmark for this pattern. Run the commands above on the same machine and fill in the bytes for your toolchain.

| Variant | Command | Size (bytes) |
| --- | --- | ---: |
| Baseline | `cargo build --release` | 0 |
| Optimized | `stellar contract optimize` | 0 |
| Diff | `optimized - baseline` | 0 |

A good CI budget for this crate is to keep the optimized Wasm under `32 KiB` and ensure the size delta is at least a 15% reduction from the unoptimized release artifact.

## Test

```bash
# From the repository root
./scripts/test-examples.sh tiny-contract

# Or invoke cargo directly
cargo test --manifest-path examples/tiny-contract/Cargo.toml
```

## Related documentation

- [Optimization Playbook](https://soroban-cookbook.dev/docs/patterns/optimization-playbook) — the main guide for profiling and reducing bytecode size
- [Building and Compilation](https://soroban-cookbook.dev/docs/getting-started/building-and-compilation) — how Soroban contracts are compiled and optimized
