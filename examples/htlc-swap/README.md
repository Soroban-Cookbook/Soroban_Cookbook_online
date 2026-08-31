# Hashed Timelock Contract (HTLC) Swap

An atomic swap where the receiver claims funds by revealing a preimage before a deadline, and the sender reclaims them afterwards.

## What it demonstrates

- Hashlock: releasing funds only against a matching preimage
- Timelock: refunding the sender once the deadline passes
- Atomicity — exactly one of claim or refund can ever succeed

## Build

```bash
stellar contract build --manifest-path examples/htlc-swap/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/htlc_swap.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh htlc-swap

# Or invoke cargo directly
cargo test --manifest-path examples/htlc-swap/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/htlc_swap.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
