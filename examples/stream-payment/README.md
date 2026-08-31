# Stream Payment

A linear token streaming contract with withdrawable balance over time on Soroban.

## What it demonstrates

- Real-time continuous linear token streaming based on ledger timestamps
- Partial and repeat withdrawals by the stream recipient
- Integration with Stellar Asset Contract (SAC) token transfers
- Complete input validation, timestamp bounds checking, and error handling
A contract for streaming payments over time.

## Build

```bash
stellar contract build --manifest-path examples/stream-payment/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/stream_payment.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh stream-payment

# Or invoke cargo directly
cargo test --manifest-path examples/stream-payment/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/stream_payment.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Streaming Payments Pattern](https://soroban-cookbook.dev/docs/patterns/streaming-payments) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
## Test

```bash
cargo test --manifest-path examples/stream-payment/Cargo.toml
```
