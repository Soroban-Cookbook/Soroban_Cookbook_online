# Storage TTL

Demonstrates extending TTL ("rent") on all three Soroban storage kinds — instance, persistent, and temporary — and what actually happens once an entry's TTL runs out.

## What it demonstrates

- Writing to instance, persistent, and temporary storage
- `extend_ttl` on each storage kind, including the "no-op below threshold" behavior
- Inspecting remaining TTL in tests with `env.storage().<kind>().get_ttl(..)`
- That an expired **temporary** entry is gone for good, while an expired **persistent** entry is archived and transparently (but more expensively) restored on next access

## Build

```bash
stellar contract build --manifest-path examples/storage-ttl/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/storage_ttl.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh storage-ttl

# Or invoke cargo directly
cargo test --manifest-path examples/storage-ttl/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/storage_ttl.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Storage Patterns](https://soroban-cookbook.dev/docs/concepts/storage) — the concept page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
