# Contract Registry

A contract registry / name service that maps stable byte names to contract addresses on Soroban.

## What it demonstrates

- Admin-authorized name-to-address registry mapping
- Address resolution and contract lookup
- Registry initialization and lifecycle management
- Structured error handling with `contracterror`
# Registry

A registry contract.

## Build

```bash
stellar contract build --manifest-path examples/registry/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/registry.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh registry

# Or invoke cargo directly
cargo test --manifest-path examples/registry/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/registry.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Contract Registry Pattern](https://soroban-cookbook.dev/docs/patterns/contract-registry) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
## Test

```bash
cargo test --manifest-path examples/registry/Cargo.toml
```
