# Crowdfund

A time-bounded crowdfund example with a funding goal, contributor refunds, and
creator success-withdrawals on Soroban.

## What it demonstrates

- Campaign lifecycle built from three explicit states: `Active`, `Succeeded`,
  and `Failed`
- Deadline-gated settlement using `env.ledger().timestamp()`
- Goal-edge handling: the creator can withdraw the moment the deadline has
  passed if the goal was met (`total >= goal`), and nothing before then
- Contributor refunds after a failed campaign, settled once per contributor
- Token transfers to and from the contract via the Soroban token client
- `checks-effects-interactions` ordering when settling the campaign

## Campaign rules

A creator initialises a campaign with a funding token, a goal, and a deadline.

- **Fund** — anyone may contribute while the campaign is `Active`.
- **Withdraw** — only the creator, only after the deadline, and only when
  `total >= goal`. Attempting to withdraw before the deadline reverts with
  `WithdrawTooEarly` even if the goal was already met; missing the goal reverts
  with `GoalNotReached`.
- **Refund** — contributors can recover their contribution only after the
  deadline when the goal was not met. The first refund after a failed campaign
  flips the state to `Failed`; a second attempt returns nothing.

## Build

```bash
stellar contract build --manifest-path examples/crowdfund/Cargo.toml
```

The optimised Wasm is written to
`examples/target/wasm32-unknown-unknown/release/crowdfund.wasm`.

## Test

```bash
# From the repository root — the same command CI runs
./scripts/test-examples.sh crowdfund

# Or invoke cargo directly
cargo test --manifest-path examples/crowdfund/Cargo.toml
```

## Deploy to testnet

```bash
stellar contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/crowdfund.wasm \
  --source my-testnet-account \
  --network testnet
```

See [Deploy to Testnet](https://soroban-cookbook.dev/docs/getting-started/deploy-testnet) for account setup and funding.

## Related documentation

- [Timelock Vault Pattern](https://soroban-cookbook.dev/docs/patterns/timelock-vault) — time-based math patterns in Soroban
- [Pattern Library](https://soroban-cookbook.dev/docs/patterns/overview) — every documented pattern
- [Adding a Tested Example](https://soroban-cookbook.dev/docs/contributing/add-tested-example) — how these crates are structured