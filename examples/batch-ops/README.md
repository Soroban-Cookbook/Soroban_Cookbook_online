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

> **Known issue** — this crate still declares `soroban-sdk = "22.0.0"` while the
> rest of the examples workspace has moved to `27.0.3`, so it is not listed in
> `examples/Cargo.toml`. Until that is reconciled, the cargo commands in this
> README fail with `current package believes it's in a workspace when it's not`.
> Bumping the SDK requirement and adding `batch-ops` to `workspace.members`
> resolves it; its 8 tests pass once it is a member.

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

- [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
