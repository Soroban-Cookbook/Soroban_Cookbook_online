# Staking with Epoch Rewards

Users stake tokens and claim a pro-rata share of a reward pool once each epoch has fully elapsed.

## What it demonstrates

- Epoch accounting driven by ledger sequence numbers
- Pro-rata reward computation over total staked amount
- Stake, unstake, and claim with per-user persistent balances

## Build

```bash
stellar contract build --manifest-path examples/staking/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/staking.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh staking

# Or invoke cargo directly
cargo test --manifest-path examples/staking/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/staking.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Staking Pattern](https://soroban-cookbook.dev/docs/patterns/staking) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
