# Token Snapshot

A token ledger with admin-created, immutable balance snapshots for historical voting power and dividend claims.

## What it demonstrates

- Point-in-time balance and total-supply queries
- Flash-loan resistance by reading a past snapshot rather than a live balance
- Per-snapshot claim tracking so a dividend cannot be claimed twice

## Build

```bash
stellar contract build --manifest-path examples/token-snapshot/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/token_snapshot.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh token-snapshot

# Or invoke cargo directly
cargo test --manifest-path examples/token-snapshot/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/token_snapshot.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Token Snapshot Pattern](https://soroban-cookbook.dev/docs/patterns/token-snapshot) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
