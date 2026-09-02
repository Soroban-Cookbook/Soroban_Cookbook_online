# Dutch Auction

A time-decaying price auction example demonstrating timestamp-based math and linear interpolation on Soroban.

## What it demonstrates

- Dynamic pricing via linear interpolation against `env.ledger().timestamp()`
- Parameterized start price, end reserve price, and decay duration
- Single-winner purchase settlement with atomic token transfer via the Soroban token client
- Seller-authorized cancellation and early closing
- Safe boundary handling (initial asking price at $t_0$, reserve floor price at/after $t_{\text{end}}$, rejection of buys after expiration)

## Price Interpolation Formula

The contract continuously interpolates the asking price over the auction duration:

- **Before or at start ($t \le \text{start\_time}$)**: returns `start_price`
- **During decay ($\text{start\_time} < t < \text{start\_time} + \text{duration}$)**:
  $$\text{price} = \text{start\_price} - \frac{(\text{start\_price} - \text{end\_price}) \times (t - \text{start\_time})}{\text{duration}}$$
- **At or after expiration ($t \ge \text{start\_time} + \text{duration}$)**: returns `end_price`

## Build

```bash
stellar contract build --manifest-path examples/dutch-auction/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/dutch_auction.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh dutch-auction

# Or invoke cargo directly
cargo test --manifest-path examples/dutch-auction/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/dutch_auction.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) — time-based math patterns in Soroban
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
