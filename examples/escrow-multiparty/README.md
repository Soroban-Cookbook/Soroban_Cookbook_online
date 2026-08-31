# Multi-Party Escrow

An escrow with depositor, recipient, and arbitrator roles, supporting cancellation, dispute, and arbitrator-decided resolution.

## What it demonstrates

- Three-role authorization with distinct capabilities per role
- Dispute and resolution transitions layered on the happy path
- Guarding every transition against the current escrow state

## Build

```bash
stellar contract build --manifest-path examples/escrow-multiparty/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/escrow_multiparty.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh escrow-multiparty

# Or invoke cargo directly
cargo test --manifest-path examples/escrow-multiparty/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/escrow_multiparty.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Multi-Party Escrow Pattern](https://soroban-cookbook.dev/docs/patterns/escrow-multiparty) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
