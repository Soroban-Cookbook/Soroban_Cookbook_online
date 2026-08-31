# Multisig Wallet

A wallet where any signer can propose a transfer and it executes only once a threshold of the registered signers has approved it.

## What it demonstrates

- Threshold approval tracked per proposal
- Rejecting duplicate approvals and non-signer approvals
- Executing the transfer exactly once, when the threshold is reached

## Build

```bash
stellar contract build --manifest-path examples/multisig-wallet/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/multisig_wallet.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh multisig-wallet

# Or invoke cargo directly
cargo test --manifest-path examples/multisig-wallet/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/multisig_wallet.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Authorization](https://soroban-cookbook.dev/docs/concepts/authorization) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
