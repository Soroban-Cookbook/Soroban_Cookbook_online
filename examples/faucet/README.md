# Faucet

A testnet-only token faucet with per-address cooldown and a global distribution cap.

## What it demonstrates

- Persistent per-address state (last-claim ledger, claim count)
- Ledger-based cooldown enforcement (rate limiting)
- Global lifetime cap on total tokens distributed
- Read-only helper functions for frontend integrations

## Build

```bash
stellar contract build --manifest-path examples/faucet/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/faucet.wasm`.

## Test

```bash
# From the repository root -- the same command CI runs
./scripts/test-examples.sh faucet

# Or invoke cargo directly
cargo test --manifest-path examples/faucet/Cargo.toml
```

## Deploy to testnet

```bash
# Deploy the faucet contract
FAUCET_ID=$(stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/faucet.wasm \
  --source my-testnet-account \
  --network testnet)

# Initialise with parameters:
#   drip = 100 tokens, cooldown = 100 ledgers, cap = 1_000_000 tokens
stellar contract invoke \
  --id $FAUCET_ID \
  --source my-testnet-account \
  --network testnet \
  -- init \
  --admin my-testnet-account \
  --drip_amount 100 \
  --cooldown_ledgers 100 \
  --max_total_claims 1000000

# A user claims tokens
stellar contract invoke \
  --id $FAUCET_ID \
  --source some-user \
  --network testnet \
  -- claim --caller some-user

# Check remaining capacity
stellar contract invoke \
  --id $FAUCET_ID \
  --source my-testnet-account \
  --network testnet \
  -- remaining
```

> **Note:** This contract is intended for testnet only. It distributes
> informational tokens to help developers experiment -- it does not transfer
> real value.

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) -- where this example is referenced
- [Storage](https://soroban-cookbook.dev/docs/concepts/storage) -- persistent vs instance storage
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) -- every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) -- how these crates are structured
