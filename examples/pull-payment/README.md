# Pull Payment

A payout contract that **credits** a beneficiary and lets them **withdraw** on their own schedule, instead of pushing a token transfer at release time.

## What it demonstrates

- **Credit-then-withdraw** over push transfers: `credit_payment` only updates storage, so a downstream payout can never lose funds to a failed transfer
- **Checks-Effects-Interactions** ordering: the credit is zeroed *before* the token transfer, preventing reentrancy double-spends and failed-transfer retries
- A single, authorized `withdraw` call pulls the credited balance to the beneficiary

## Build

```bash
stellar contract build --manifest-path examples/pull-payment/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/pull_payment.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh pull-payment

# Or invoke cargo directly
cargo test --manifest-path examples/pull-payment/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/pull_payment.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Pull Payment Pattern](https://soroban-cookbook.dev/docs/patterns/pull-payment) — the pattern page this example supports
- [Reentrancy Guard Pattern](https://soroban-cookbook.dev/docs/patterns/reentrancy-guard) — pull payments complement the guard by removing the external-transfer window entirely
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
