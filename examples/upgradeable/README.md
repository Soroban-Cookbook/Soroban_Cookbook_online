# Upgradeable Contract

A contract that swaps its own Wasm for a new version while preserving stored state, with the upgrade restricted to the admin.

## What it demonstrates

- `env.deployer().update_current_contract_wasm` driven by an admin call
- State surviving the upgrade to the v2 implementation
- A `version` entry point so callers can tell which build is live

## Build

```bash
stellar contract build --manifest-path examples/upgradeable/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/upgradeable.wasm`.

### Additional build step

This example upgrades itself to a second contract, so the v2 Wasm must be built first:

```bash
cargo build --manifest-path examples/upgradeable/v2/Cargo.toml \
  --target wasm32-unknown-unknown --release \
  --target-dir examples/upgradeable/v2/target
```

`./scripts/test-examples.sh upgradeable` does this for you.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh upgradeable

# Or invoke cargo directly
cargo test --manifest-path examples/upgradeable/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/upgradeable.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
