# Constant-Product AMM

A two-token automated market maker using the `x * y = k` invariant, with liquidity provision, LP share accounting, and swaps in both directions.

## What it demonstrates

- Constant-product pricing and reserve bookkeeping
- LP share minting and burning proportional to pooled liquidity
- Moving real tokens with the SDK `token` client

## Build

```bash
stellar contract build --manifest-path examples/constant-product-amm/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/constant_product_amm.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh constant-product-amm

# Or invoke cargo directly
cargo test --manifest-path examples/constant-product-amm/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/constant_product_amm.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
