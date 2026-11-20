# Custom Account

A minimal Soroban **custom account** contract — the `CustomAccountInterface` hook the host calls when code invokes `require_auth()` against this contract's address instead of a plain `G...` account. This is not a wallet product; it demonstrates the two building blocks any real account contract layers on top of: signature verification and an authorization policy.

## What it demonstrates

- Implementing `CustomAccountInterface::__check_auth`, the entry point every custom account contract must provide
- Verifying a single Ed25519 signature over the payload the host passes in
- Enforcing a simple spend-limit policy by inspecting the `Context`s attached to the authorization request — rejecting an over-limit call even when the signature is valid
- Testing `__check_auth` directly with `env.try_invoke_contract_check_auth`, without constructing a full transaction or `SorobanAuthorizationEntry`

## Build

```bash
stellar contract build --manifest-path examples/custom-account/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/custom_account.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh custom-account

# Or invoke cargo directly
cargo test --manifest-path examples/custom-account/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/custom_account.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Authorization](https://soroban-cookbook.dev/docs/concepts/authorization) — the concept page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
