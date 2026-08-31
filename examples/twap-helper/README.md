# TWAP Helper

A minimal Time-Weighted Average Price (TWAP) helper contract. It records price
observations and computes a time-weighted average over a chosen window, so a
caller can smooth out short-term price volatility before acting on a price.

> **Warning — educational example.** This contract is a teaching example meant
> to make the TWAP accumulator math easy to follow. It is **not** audited and
> should **not** be deployed with real value without a thorough security review.

## What it demonstrates

- Recording `(price, timestamp)` observations with `observe`
- Computing a TWAP over a `window` (in seconds) with `twap`
- Weighting each price by **how long it was active**, not by how many
  observations exist (time-weighted, not observation-count-weighted)
- A test that verifies two observations average to the correct time-weighted value

## Security note on sparse observations

TWAP resists manipulation only when observations are frequent enough. This
helper averages only the time during which observations are available: if the
first observation happens after the window's start, the price before it is
unknown and is not averaged in. With infrequent observations a single stale
price can dominate the result. A production TWAP should additionally:

- combine TWAPs over several overlapping windows,
- prune old observations and cap how far apart two observations may be,
- use `persistent` storage with explicit TTL management instead of a growing list.

## Functions

| Function  | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| `observe` | Record a price at the current ledger timestamp.                    |
| `twap`    | Return the time-weighted average price over the last `window` secs.|
| `reset`   | Clear all recorded observations.                                   |
| `get_observation_count` | Return the number of observations recorded.            |

## Build

```bash
stellar contract build --manifest-path examples/twap-helper/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/twap_helper.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh twap-helper

# Or invoke cargo directly
cargo test -p twap-helper
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/twap_helper.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Constant Product AMM pattern](https://soroban-cookbook.dev/docs/patterns/overview) — spot prices that often need TWAP smoothing
- [Oracle Consumer Pattern](https://soroban-cookbook.dev/docs/patterns/oracle-consumer) — feeding a contract from price oracles
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
