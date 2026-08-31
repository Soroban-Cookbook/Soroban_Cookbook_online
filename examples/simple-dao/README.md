# Simple DAO

Token-weighted governance: proposals are submitted, voted on, queued behind a timelock, and then executed against a target contract.

## What it demonstrates

- The full proposal lifecycle from submission to execution
- Quorum and approval thresholds expressed in basis points
- A timelock delay between a passing vote and execution

## Build

```bash
stellar contract build --manifest-path examples/simple-dao/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/simple_dao.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh simple-dao

# Or invoke cargo directly
cargo test --manifest-path examples/simple-dao/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/simple_dao.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Proposal Lifecycle](https://soroban-cookbook.dev/docs/patterns/proposal-lifecycle) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
