# Emergency Stop (Circuit Breaker)

A contract with an admin-controlled pause switch that blocks state-changing entry points while an incident is being handled.

## What it demonstrates

- A paused flag checked before any state-changing work
- Pause and unpause restricted to the admin
- Read-only entry points that stay available while paused

## Build

```bash
stellar contract build --manifest-path examples/emergency-stop/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/emergency_stop.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh emergency-stop

# Or invoke cargo directly
cargo test --manifest-path examples/emergency-stop/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/emergency_stop.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Lifecycle and Upgrades](https://soroban-cookbook.dev/docs/patterns/lifecycle-upgrades) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
