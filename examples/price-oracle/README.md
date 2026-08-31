# Price Oracle

An on-chain price-oracle **producer** that lets a trusted admin publish signed
price data (price + decimals + timestamp) for any asset symbol.  Companion
example to `oracle-consumer`.

## What it demonstrates

- Admin-only `set_price` enforced with `address.require_auth()`
- Staleness checks: `get_price_checked` rejects data older than `max_age_secs`
- Decimal-scaled prices (`price / 10^decimals`) compatible with `oracle-consumer`
- `get_price` returns `Vec<i128> [price, decimals, timestamp]` – the exact
  format `oracle-consumer` expects for cross-contract calls
- Event emission on every price update

## Build

```bash
stellar contract build --manifest-path examples/price-oracle/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/price_oracle.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh price-oracle

# Or invoke cargo directly
cargo test --manifest-path examples/price-oracle/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/price_oracle.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet)
for account setup and funding.

## Usage

```bash
# Initialise with an admin key
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin-key \
  --network testnet \
  -- init \
  --admin <ADMIN_ADDRESS>

# Publish a price (admin must sign)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source admin-key \
  --network testnet \
  -- set_price \
  --asset BTC \
  --price 43000000000 \
  --decimals 6

# Read back the price (anyone)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source any-key \
  --network testnet \
  -- get_price \
  --asset BTC
```

## Related documentation

- [Oracle Price Source Pattern](https://soroban-cookbook.dev/docs/patterns/oracle-price-source) — the pattern page this example supports
- [Oracle Consumer Pattern](https://soroban-cookbook.dev/docs/patterns/oracle-consumer) — how to consume prices from this oracle
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
