# Role-Based Access Control

A contract that assigns `User`, `Manager`, and `Admin` roles to addresses and gates entry points on the caller holding a sufficient role.

## What it demonstrates

- Role hierarchy stored per address and checked before privileged work
- Role grant/revoke restricted to the admin set in the constructor
- Typed `contracterror` variants for unauthorized and unknown-role calls

## Build

```bash
stellar contract build --manifest-path examples/access-control/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/access_control.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh access-control

# Or invoke cargo directly
cargo test --manifest-path examples/access-control/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/access_control.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
