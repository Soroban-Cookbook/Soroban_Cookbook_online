# Hello World

The smallest complete Soroban contract: return a greeting, optionally overridden by one stored on the contract.

## What it demonstrates

- Contract and entry-point declaration with `#[contract]` / `#[contractimpl]`
- Returning an SDK `String` from a contract function
- A `#[cfg(test)]` module using `Env::default()`

## Build

```bash
stellar contract build --manifest-path examples/hello-world/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/hello_world.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh hello-world

# Or invoke cargo directly
cargo test --manifest-path examples/hello-world/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Hello World Pattern](https://soroban-cookbook.dev/docs/patterns/hello-world) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
- [Reviewing Test Snapshots](https://soroban-cookbook.dev/docs/contributing/test-snapshots) — how to review and manage snapshot updates
