# Linear Token Vesting

A vesting schedule with a cliff: the full allocation is funded up front and the beneficiary releases the linearly vested portion over time.

## What it demonstrates

- Linear vesting maths between a start and end timestamp
- A cliff before which nothing is releasable
- Tracking released amounts so each token is only released once

## Build

```bash
stellar contract build --manifest-path examples/token-vesting/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/token_vesting.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh token-vesting

# Or invoke cargo directly
cargo test --manifest-path examples/token-vesting/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/token_vesting.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
