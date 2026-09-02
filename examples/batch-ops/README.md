# Batched Operations

A token ledger whose `batch_transfer` applies many transfers in one invocation, with a hard cap on batch size so worst-case resource cost stays predictable.

## What it demonstrates

- `MAX_BATCH_SIZE` guard against unbounded, caller-controlled work
- Per-operation results — an entry that would overdraw is skipped and reported, not fatal
- Amortizing per-invocation overhead across many operations

## Build

```bash
stellar contract build --manifest-path examples/batch-ops/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/batch_ops.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh batch-ops

# Or invoke cargo directly
cargo test --manifest-path examples/batch-ops/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/batch_ops.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) — conceptual guide featuring `batch-ops` as an instruction count case study at resource limits
- [Optimization Playbook](https://soroban-cookbook.dev/docs/patterns/optimization-playbook) — systematic gas optimization techniques
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
