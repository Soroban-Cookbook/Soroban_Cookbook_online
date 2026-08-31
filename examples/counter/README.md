# Counter

The canonical stateful contract: a single number in instance storage that callers can increment, read, and reset.

## What it demonstrates

- Reading and writing instance storage
- Defaulting cleanly when a storage key has never been written
- The smallest contract shape worth writing tests against

## Build

```bash
stellar contract build --manifest-path examples/counter/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/counter.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh counter

# Or invoke cargo directly
cargo test --manifest-path examples/counter/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/counter.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Storage](https://soroban-cookbook.dev/docs/concepts/storage) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
