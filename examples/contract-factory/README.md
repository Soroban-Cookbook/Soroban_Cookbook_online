# Contract Factory

A deployer contract that installs a child Wasm hash and spawns new child contract instances on demand, keeping a registry of everything it has deployed.

## What it demonstrates

- Deploying contracts from an uploaded Wasm hash at runtime
- Deterministic addresses derived from a deployer-supplied salt
- Tracking deployed children so they can be enumerated later

## Build

```bash
stellar contract build --manifest-path examples/contract-factory/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/contract_factory.wasm`.

### Additional build step

This example deploys a child contract, so the child Wasm must be built first:

```bash
cargo build --manifest-path examples/contract-factory/child/Cargo.toml \
  --target wasm32-unknown-unknown --release \
  --target-dir examples/contract-factory/child/target
```

`./scripts/test-examples.sh contract-factory` does this for you.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh contract-factory

# Or invoke cargo directly
cargo test --manifest-path examples/contract-factory/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/contract_factory.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Contract Factory Pattern](https://soroban-cookbook.dev/docs/patterns/contract-factory) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
