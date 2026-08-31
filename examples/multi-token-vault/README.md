# Multi-Token Vault

A multi-asset vault contract that tracks accounting balances for multiple different tokens per user simultaneously.

## What it demonstrates

- Compound storage keys (`DataKey::Balance(Address, Address)`) for per-user, per-token balance tracking
- Vault-wide total tracking per token asset
- Strict authorization gating on user deposits and withdrawals
- Comprehensive input validation and typed errors
# Multi-token Vault

A vault for multiple tokens.

## Build

```bash
stellar contract build --manifest-path examples/multi-token-vault/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/multi_token_vault.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh multi-token-vault

# Or invoke cargo directly
cargo test --manifest-path examples/multi-token-vault/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/multi_token_vault.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Multi-Token Vault](https://soroban-cookbook.dev/docs/patterns/multi-token-vault) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
## Test

```bash
cargo test --manifest-path examples/multi-token-vault/Cargo.toml
```
