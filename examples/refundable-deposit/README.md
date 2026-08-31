# Refundable Deposit

A deposit vault that holds tokens until either the depositor refunds them or an admin consumes the locked funds.

## What it demonstrates

- A two-role flow with a depositor and an admin
- `require_auth` checks for both refund and consume actions
- A small state machine for `Ready -> Deposited -> Refunded|Consumed`
- Token transfers that move funds into and out of the contract

## Build

```bash
stellar contract build --manifest-path examples/refundable-deposit/Cargo.toml
```

The optimized Wasm is written to
`examples/target/wasm32-unknown-unknown/release/refundable_deposit.wasm`.

## Test

```bash
# From the repository root
./scripts/test-examples.sh refundable-deposit

# Or invoke cargo directly
cargo test --manifest-path examples/refundable-deposit/Cargo.toml
```

## Flow

1. Initialize the deposit with an admin and a token.
2. Deposit tokens from a depositor account.
3. Before the admin consumes the deposit, the same depositor may refund the funds.
4. An admin can consume the deposit after it is funded.

## Related documentation

- [Basic Escrow Pattern](https://soroban-cookbook.dev/docs/patterns/escrow-basic) — for comparison with a similar release/refund state machine
- [Authorization Patterns](https://soroban-cookbook.dev/docs/patterns/authorization) — for role-based auth flows
