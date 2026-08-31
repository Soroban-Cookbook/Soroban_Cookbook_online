# Rate Limit

A per-address action rate limiter enforced inside the contract. This is the
on-contract counterpart to the site's HTTP rate limiting: it throttles how often
a single address may trigger an action (for faucets, mints, and other
permissioned entry points) using a time-based window rather than relying on an
off-chain proxy.

## What it demonstrates

- A per-address action cap enforced with a ledger-time window
- Automatic window rollover so the limit is a *rate*, not a lifetime cap
- Failing early (returning `RateLimitExceeded`) before any storage write, so an
  over-limit caller pays nothing but the failed call
- Independent quotas per address

## Build

```bash
stellar contract build --manifest-path examples/rate-limit/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/rate_limit.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh rate-limit

# Or invoke cargo directly
cargo test --manifest-path examples/rate-limit/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/rate_limit.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Storage cost

Per-address windows are kept in a single `Map<Address, Window>` in **instance**
storage. That is cheap to read and write, but:

- Instance storage is wiped on upgrade and carries a TTL you must extend.
- The map grows by one entry per unique caller, so a faucet bombarded by many
  distinct addresses sees its instance storage — and rent — grow unbounded.

If you need persistence across upgrades or want to bound growth, switch to
**persistent** storage keyed per address (e.g. `Window(Address)`) and manage
each entry's TTL individually; you pay per-entry rent instead.

The rate check runs *before* any storage write, so only callers who are
permitted to act pay the write cost.

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
