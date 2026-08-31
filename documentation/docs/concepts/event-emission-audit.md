---
sidebar_position: 8
title: Event Emission Audit
description: Audit of event emission across all Soroban Cookbook example contracts (Phase 8 #637).
---

# Event Emission Audit

This document audits whether every state-changing entrypoint in the Cookbook
examples emits an event, so off-chain indexers can follow contract activity.
It is the tracking artifact for **Phase 8 issue #637**.

## Objective

> Every state-changing entrypoint should emit an event; document the few that
> should not.

## Methodology

- Scanned `examples/*/src/lib.rs` for `env.events().publish(...)`.
- Enumerated `pub fn` entrypoints (outside `#[cfg(test)]` modules).
- "Emits events?" is **crate-level**: `yes` when the contract publishes at least
  one event. Per-entrypoint event coverage is the next step (see Status).
- View/getter entrypoints (e.g. `balance`, `get_state`) are intentionally
  excluded from the "should emit" rule — see Exceptions.

## Audit table

| Example | Emits events? | State-changing entrypoints |
| --- | --- | --- |
| access-control | no (0) | has_role, require_role, grant_role, revoke_role, get_role, admin_only_action, manager_only_action |
| authorization | no (0) | initialize, set_admin, privileged_action |
| balance-snapshot | no (0) | mint, balance, transfer, take_snapshot, snapshot_balance, snapshot_count, snapshot_meta |
| batch-ops | no (0) | balance_of, batch_transfer |
| constant-product-amm | no (0) | initialize, add_liquidity, remove_liquidity, swap_a_for_b, swap_b_for_a, get_reserves, get_lp_balance, get_tokens |
| contract-factory | no (0) | initialize, deploy_child, get_deployed_children, child_count |
| counter | no (0) | increment, get, reset |
| cross-contract | no (0) | — (demonstrates cross-contract calls) |
| emergency-stop | no (0) | fail_if_paused, pause, unpause, is_paused, do_work, get_op_count |
| error-handling | no (0) | transfer, mint |
| escrow-basic | **yes (4)** | initialise, deposit, release, refund, get_state, get_amount |
| escrow-multiparty | no (0) | deposit, release, cancel, dispute, resolve, state, get_amount, get_depositor, get_recipient, get_arbitrator |
| flash-loan | no (0) | initialize, deposit_liquidity, flash_loan, withdraw_fees, calculate_fee, available_liquidity, fees_collected, admin, token, fee_bps |
| hello-world | no (0) | hello, set_message |
| htlc-swap | no (0) | create, claim, refund, get_swap |
| multisig-wallet | **yes (2)** | initialize, deposit, submit_transfer, approve, execute, get_proposal, get_balance, get_signers, get_threshold, get_proposal_count |
| oracle-consumer | no (0) | into_u32, init, get_oracle, get_max_age, set_oracle, set_max_age, get_price, get_price_data, calculate_value, get_prices |
| reentrancy-guard | no (0) | deposit, balance, is_locked, withdraw, withdraw_vulnerable, set_attack_mode, attack_count, on_withdraw |
| simple-dao | **yes (1)** | initialize, submit_proposal, vote, queue_proposal, execute_proposal, cancel_proposal, get_config, get_proposal, proposal_state, has_voted, executable_at, action, set_val, was_executed, get_executed_val |
| simple-voting | no (0) | create_proposal, delegate_vote, revoke_delegation, get_delegate, vote, close_proposal, tally, get_vote |
| staking | no (0) | initialize, set_reward, stake, unstake, claim, staked_balance, pending_reward, current_epoch, total_staked |
| timelock-vault | no (0) | deposit, withdraw, cancel, unlock_time, amount, is_claimed, beneficiary, time_remaining |
| token-snapshot | **yes (1)** | initialize, mint, balance, transfer, create_snapshot, balance_at, total_supply_at, snapshot_ledger, snapshot_count, snapshot_holder_count, snapshot_holder_at, mark_claimed, has_claimed |
| token-transfer | **yes (6)** | initialize, mint, transfer, burn, approve, allowance, balance, name, symbol, decimals, total_supply, transfer_from |
| token-vesting | no (0) | initialize, release, schedule, vested_amount, releasable_amount |
| token-wrapper | no (0) | init, mint, balance, transfer, fee_bps, treasury |
| upgradeable | no (0) | version, get_value, set_value, upgrade |

## Status

- **Emitting (5):** `multisig-wallet`, `simple-dao`, `token-snapshot`,
  `token-transfer`, `escrow-basic`.
- **Not emitting (22):** all other examples — tracked as follow-up work to add
  events to each state-changing entrypoint.
- **This PR adds events to `token-transfer` and `escrow-basic`** (the two called
  out by the verification step), covering `mint`/`transfer`/`burn`/`approve`/
  `transfer_from`/`initialize` and `deposit`/`release`/`refund`/`initialise`
  respectively, each with a test asserting the event is published.

## Exceptions (documented — should NOT emit)

- **View / getter entrypoints** (`balance`, `get_state`, `allowance`, `name`,
  `symbol`, `decimals`, `total_supply`, `is_paused`, etc.) only read storage and
  must remain silent.
- **`cross-contract`** demonstrates invoking other contracts; it intentionally
  emits nothing of its own (the callee emits).
- **`error-handling`** is a teaching example for the `Error` enum pattern and
  intentionally omits events to keep the focus on error propagation.
- **Early-return / error paths** must not emit — events are only published after
  a successful state transition.

## Event design guidance

Follow the conventions already used in the emitting examples:

- Use a stable `Symbol` topic as the first topic (e.g. `symbol_short!("mint")`).
- Include only the data consumers need (addresses + amounts) as the event body.
- Publish **after** the storage write / token transfer succeeds.
- Assert emission in tests via `env.events().all()` (see `token-transfer` and
  `escrow-basic` tests).

See [Events](../concepts/events.md) for the full concept guide.
