# Flash Loan

A single-asset pool that lends tokens with no collateral, invoking the borrower and requiring repayment plus fee before the same transaction ends.

## What it demonstrates

- Callback-based lending: transfer, invoke the borrower, verify repayment
- Fee calculation in basis points and fee accrual for the pool
- Failing the whole transaction when the loan is not repaid

## Build

```bash
stellar contract build --manifest-path examples/flash-loan/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/flash_loan.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh flash-loan

# Or invoke cargo directly
cargo test --manifest-path examples/flash-loan/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/flash_loan.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — the pattern page this example supports
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured
