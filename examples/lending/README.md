# Lending Pool (simplified)

> **NOT production-ready.** Educational example only. It omits interest
> accrual, multi-asset pools, partial-liquidation sizing, oracle manipulation
> defenses (TWAP, deviation bounds), governance, and upgrade safety. See
> [DeFi Security Patterns](https://soroban-cookbook.dev/docs/security/defi-patterns)
> for the full risk list.

A simplified collateralized lending protocol: one collateral token, one debt
token, and a price oracle. Users deposit collateral and borrow debt up to a
maximum loan-to-value (LTV); anyone can liquidate a position that falls below
a maintenance threshold, earning a bonus on the seized collateral.

## What it demonstrates

- LTV enforcement on `borrow` and `withdraw` against a live oracle price
- Oracle price freshness: every price read carries a timestamp, and prices
  older than `max_price_age` seconds are rejected (`Error::StalePrice`)
- Threshold-based liquidation with a liquidator bonus (the classic incentive)
- Checked arithmetic throughout, returning `Error::Overflow` instead of
  panicking
- A mock oracle in the tests showing the expected oracle interface:
  `price(Address) -> (i128 price, u64 timestamp)`

## Not covered (deliberately)

- Interest accrual and index-based debt scaling
- Multiple collateral or debt assets
- Partial-liquidation sizing that restores exact health
- Oracle deviation bounds, TWAP, or multi-source aggregation
- Bad-debt socialization when collateral cannot cover the debt

## Build

```bash
stellar contract build --manifest-path examples/lending/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/lending.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh lending

# Or invoke cargo directly
cargo test --manifest-path examples/lending/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/lending.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Lending Protocol Security](https://soroban-cookbook.dev/docs/security/defi-patterns) — collateralization and liquidation safety rules
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
