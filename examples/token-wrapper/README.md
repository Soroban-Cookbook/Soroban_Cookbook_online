# Token Wrapper with Transfer Fee

A minimal token ledger that charges a basis-point fee on every transfer and routes it to a treasury address.

## What it demonstrates

- Fee-on-transfer accounting in basis points
- Routing collected fees to a configurable treasury
- Keeping the wrapper API compatible with plain token operations

## Build

```bash
stellar contract build --manifest-path examples/token-wrapper/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/token_wrapper.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh token-wrapper

# Or invoke cargo directly
cargo test --manifest-path examples/token-wrapper/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/token_wrapper.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Token Standards](https://soroban-cookbook.dev/docs/patterns/token-standards) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
