# Owner and Admin Authorization

The smallest useful authorization contract: an owner set at initialization, an admin the owner can rotate, and an action only the admin may call.

## What it demonstrates

- `require_auth` on the address a call claims to act for
- Ownership recorded in persistent storage at initialization
- Separating the owner (who can rotate the admin) from the admin (who acts)

## Build

```bash
stellar contract build --manifest-path examples/authorization/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/authorization.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh authorization

# Or invoke cargo directly
cargo test --manifest-path examples/authorization/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/authorization.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
