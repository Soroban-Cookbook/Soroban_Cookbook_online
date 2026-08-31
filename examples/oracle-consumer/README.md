# Oracle Consumer

A contract that reads prices from an external oracle contract and refuses to use data older than a configured maximum age.

## What it demonstrates

- Calling an oracle through a typed client
- Staleness checks on timestamped price data
- Batch price reads and value calculation from a quoted price

## Build

```bash
stellar contract build --manifest-path examples/oracle-consumer/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/oracle_consumer.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh oracle-consumer

# Or invoke cargo directly
cargo test --manifest-path examples/oracle-consumer/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/oracle_consumer.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Oracle Consumer Pattern](https://soroban-cookbook.dev/docs/patterns/oracle-consumer) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
