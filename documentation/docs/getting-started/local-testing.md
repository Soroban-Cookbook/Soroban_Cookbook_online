---
time: 15
sidebar_position: 5.6
title: Soroban Local Testing with Simulation and Snapshots
description: Run Soroban contracts locally with stellar contract invoke, use --simulate for preflight validation, and capture ledger snapshots for reproducible debugging loops.
keywords:
  - soroban local testing
  - stellar contract invoke
  - stellar simulate
  - ledger snapshot
  - soroban debugging
title: Local Testing and Simulation
description: This page has moved to the canonical local testing guide and redirects to the shared simulation workflow.
image: /img/soroban-social-card.png
---

# Local Testing and Simulation

This guide focuses on fast local feedback loops using `stellar contract invoke`, `--simulate`, and reusable ledger snapshots.

For broader troubleshooting workflows, continue with the [Debugging Guide](./debugging.md) or see the [Stellar CLI Migration Guide](./stellar-cli-migration.md).
This page has moved to the canonical guide for local contract testing and simulation.

Please use the updated guide here:

- [Local Testing and Simulation](./local-testing-and-simulation.md)

Local simulation helps you validate contract behavior before network submission:

- No testnet latency
- No fee consumption
- Deterministic reproduction for edge cases

## Build your contract artifact

Compile the contract before local invocation:

```bash
stellar contract build
```

Expected artifact location (example):

```text
target/wasm32-unknown-unknown/release/<contract>.optimized.wasm
```

## Invoke locally with `stellar contract invoke`

Use local invocation to execute functions against a sandbox ledger:

```bash
stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm \
  -- \
  increment
```

For deployed contracts, invoke by contract id:

```bash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network testnet \
  -- \
  get_count
```

## Preflight execution with `--simulate`

Use `--simulate` to preview execution, inspect diagnostics, and catch failures before sending a transaction.

```bash
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network testnet \
  --simulate \
  -- \
  increment
```

Use simulation when you need to:

- Validate auth paths and argument encoding
- Estimate resource usage prior to submission
- Inspect expected result and failure reasons

## Working with ledger snapshots

Ledger snapshots let you replay the same state repeatedly, which is ideal for regression debugging.

### Snapshot workflow

1. Create or identify a known-good ledger state.
2. Export or store that state snapshot in your test fixture directory.
3. Re-run local invoke/simulate commands against the same snapshot.
4. Compare outputs before and after code changes.

### Practical snapshot strategy

- Keep one baseline snapshot per feature area (auth, storage, transfers).
- Name snapshots with scenario intent, for example `snapshot-transfer-underflow.json`.
- Pair each snapshot with a small command script that reproduces the issue.

## Suggested command loop

```bash
# 1) Build
stellar contract build

# 2) Simulate write path
stellar contract invoke --id "$CONTRACT_ID" --source "$SOURCE_ACCOUNT" --network testnet --simulate -- increment

# 3) Invoke locally for rapid state checks
stellar contract invoke --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm -- get
```

When a failure appears, pivot to the [Debugging Guide](./debugging.md) for root-cause isolation patterns.
The canonical page covers the full local workflow, including `cargo test`, local sandbox invocation, and quick debugging loops before testnet deployment.
