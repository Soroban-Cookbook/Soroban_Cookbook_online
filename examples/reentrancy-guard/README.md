# Reentrancy Guard

A vault with both a guarded and a deliberately vulnerable withdrawal, plus an attacker contract, so the guard can be demonstrated under test.

## What it demonstrates

- A storage-backed lock set for the duration of an external call
- Checks-effects-interactions ordering as the primary defense
- A malicious callback contract proving the vulnerable path is exploitable

## Build

```bash
stellar contract build --manifest-path examples/reentrancy-guard/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/reentrancy_guard.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh reentrancy-guard

# Or invoke cargo directly
cargo test --manifest-path examples/reentrancy-guard/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/reentrancy_guard.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Reentrancy Guard Pattern](https://soroban-cookbook.dev/docs/patterns/reentrancy-guard) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
