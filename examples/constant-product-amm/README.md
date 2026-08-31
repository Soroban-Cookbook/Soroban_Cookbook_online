# Constant-Product AMM

A two-token automated market maker using the `x * y = k` invariant, with liquidity provision, LP share accounting, and swaps in both directions.

## What it demonstrates

- Constant-product pricing and reserve bookkeeping
- LP share minting and burning proportional to pooled liquidity
- Moving real tokens with the SDK `token` client
- A rounding policy (floor division, pool-favoring) that keeps the `x * y = k` invariant from ever decreasing across a swap
- A property test (`test_invariant_never_decreases_across_swaps`) that exercises the invariant over 200 pseudo-randomly generated swaps using a fixed-seed PRNG, so the run is deterministic without an external fuzzing dependency

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

- [Gas and Resources](https://soroban-cookbook.dev/docs/concepts/gas-and-resources) — conceptual guide featuring AMM swap execution as an instruction count case study
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
