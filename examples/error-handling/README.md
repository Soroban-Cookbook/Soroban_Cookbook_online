# Error Handling

A transfer/mint contract that returns typed `contracterror` values for every failure mode instead of panicking.

## What it demonstrates

- Declaring a `#[contracterror]` enum with stable numeric discriminants
- Returning `Result` from entry points so callers can branch on the error
- Validating inputs before touching storage

## Build

```bash
stellar contract build --manifest-path examples/error-handling/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/error_handling.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh error-handling

# Or invoke cargo directly
cargo test --manifest-path examples/error-handling/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/error_handling.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Error Handling Pattern](https://soroban-cookbook.dev/docs/patterns/error-handling) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
