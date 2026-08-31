# Basic Escrow

A two-party escrow that holds a buyer deposit until the buyer or an arbiter releases it to the seller, or the arbiter refunds it.

## What it demonstrates

- A state machine gating which transitions each role may trigger
- Holding funds in the contract until an authorized release
- Arbiter-based dispute resolution as a third role

## Build

```bash
stellar contract build --manifest-path examples/escrow-basic/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/escrow_basic.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh escrow-basic

# Or invoke cargo directly
cargo test --manifest-path examples/escrow-basic/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/escrow_basic.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Basic Escrow Pattern](https://soroban-cookbook.dev/docs/patterns/escrow-basic) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
