# Simple Voting

A proposal contract with one vote per address, optional delegation to another voter, and a tally once voting closes.

## What it demonstrates

- One-address-one-vote enforcement
- Vote delegation and revocation
- Closing a proposal and tallying only after the deadline

## Build

```bash
stellar contract build --manifest-path examples/simple-voting/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/simple_voting.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh simple-voting

# Or invoke cargo directly
cargo test --manifest-path examples/simple-voting/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/simple_voting.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Proposal Lifecycle](https://soroban-cookbook.dev/docs/patterns/proposal-lifecycle) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
