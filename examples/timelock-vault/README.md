# Timelock Vault

A deposit locked until a Unix timestamp, withdrawable only by the beneficiary once the ledger timestamp has passed the unlock time.

## What it demonstrates

- Time comparisons against `env.ledger().timestamp()`
- Beneficiary-only withdrawal after the unlock time
- Depositor cancellation before the lock expires

## Build

```bash
stellar contract build --manifest-path examples/timelock-vault/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/timelock_vault.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh timelock-vault

# Or invoke cargo directly
cargo test --manifest-path examples/timelock-vault/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/timelock_vault.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
