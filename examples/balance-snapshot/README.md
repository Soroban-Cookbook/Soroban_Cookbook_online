# Balance Snapshots

A token ledger that captures historical balances at a chosen ledger so voting weight and dividend shares can be computed from a fixed point in time.

## What it demonstrates

- Composite storage keys (`Snapshot(id, Address)`) for historical balances
- Events published on each snapshot so off-chain indexers can follow along
- Snapshot metadata queries alongside live balance and transfer operations

## Build

```bash
stellar contract build --manifest-path examples/balance-snapshot/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/balance_snapshot.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh balance-snapshot

# Or invoke cargo directly
cargo test --manifest-path examples/balance-snapshot/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/balance_snapshot.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Token Snapshot Pattern](https://soroban-cookbook.dev/docs/patterns/token-snapshot) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
