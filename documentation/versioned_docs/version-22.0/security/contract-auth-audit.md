---
sidebar_position: 4
title: Contract require_auth Audit
description: Per-method require_auth audit of all Soroban Cookbook example contracts (Phase 8 #638).
---

# Contract `require_auth` Audit

This document audits every state-changing entrypoint in the Cookbook examples
for missing `require_auth`, so a missing authorization check is never copied
to mainnet. It is the tracking artifact for **Phase 8 issue #638**.

## Objective

> Review each `pub fn` that writes storage or transfers value for missing
> `require_auth`. Fix gaps; mark the rest as intentionally public.

## Methodology

- Scanned `examples/*/src/lib.rs` and matched each `pub fn` (outside `#[cfg(test)]`) to its brace-balanced body.
- Flagged a method as **mutating** when its body writes storage or transfers value.
- Detected `require_auth` calls (e.g. `from.require_auth()`) inside the body.
- Classified each mutating method: `ok` (has auth), `fixed` (added in this PR), `intentional` (public by design), or `GAP` (recommended fix).
- `who must auth` lists the address that authorizes, from the code.

## Status summary

- Mutating methods audited: **92**
- Correctly authorized (`ok`): **56**  |  Fixed in this PR (`fixed`): **3**  |  Intentionally public (`intentional`): **19**  |  Gaps (`GAP`): **14**

## Audit table

### access-control

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| __constructor | yes | no | — | — | intentional — Constructor; invoked at deploy, no auth needed. |
| grant_role | yes | yes | granter | — | ok |

### authorization

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | no | — | — | intentional — One-time init by the deploying account (standard deployer-init pattern). |
| set_admin | yes | yes | owner | — | ok |

### balance-snapshot

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| mint | yes | no | — | — | GAP — Add an admin role (or deployer) and call `admin.require_auth()` before minting. |
| transfer | yes | yes | from | — | ok |
| take_snapshot | yes | no | — | — | GAP — Require admin auth before snapshotting state. |

### batch-ops

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| __constructor | yes | no | — | — | intentional — Constructor. |
| batch_transfer | yes | yes | from | — | ok |

### constant-product-amm

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | no | — | — | intentional — One-time init by deployer. |
| add_liquidity | yes | yes | caller | — | ok |
| remove_liquidity | yes | yes | caller | — | ok |
| swap_a_for_b | yes | yes | caller | — | ok |
| swap_b_for_a | yes | yes | caller | — | ok |

### contract-factory

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | no | — | — | intentional — One-time init by deployer. |
| deploy_child | yes | no | — | — | GAP — Require deployer/admin auth before deploying a child contract. |

### counter

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| increment | yes | no | — | — | intentional — Teaching example with no privileged state; intentional. |
| reset | yes | no | — | — | intentional — Teaching example; intentional. |

### cross-contract

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |

### emergency-stop

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| __constructor | yes | no | — | — | intentional — Constructor. |
| pause | yes | yes | admin | — | ok |
| unpause | yes | yes | admin | — | ok |
| do_work | yes | yes | admin | — | fixed — admin.require_auth added in this PR |

### error-handling

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| transfer | yes | yes | from | — | ok |
| mint | yes | no | — | — | intentional — Teaching example for the Error enum pattern; intentional. |

### escrow-basic

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialise | yes | no | — | — | intentional — One-time init by deployer; roles fixed at init. |
| deposit | yes | yes | buyer | — | ok |
| release | yes | yes | caller | — | ok |
| refund | yes | yes | caller | — | ok |

### escrow-multiparty

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| deposit | yes | yes | depositor | — | ok |
| release | yes | yes | depositor | — | ok |
| cancel | yes | yes | depositor | — | ok |
| dispute | yes | yes | caller | — | ok |
| resolve | yes | yes | arbitrator | — | ok |

### flash-loan

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | yes | admin | — | ok |
| deposit_liquidity | yes | yes | from | — | ok |
| flash_loan | yes | no | — | — | GAP — Require the borrower/caller auth (add an explicit actor param + `require_auth()`). |
| withdraw_fees | yes | yes | admin | — | ok |

### hello-world

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| set_message | yes | no | — | — | intentional — Teaching example; intentional. |

### htlc-swap

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| create | yes | yes | sender | — | ok |
| claim | yes | yes | caller | — | ok |
| refund | yes | yes | caller | — | ok |

### multisig-wallet

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | no | — | — | intentional — One-time init by deployer. |
| deposit | yes | yes | from | — | ok |
| submit_transfer | yes | yes | proposer | — | ok |
| approve | yes | yes | signer | — | ok |
| execute | yes | no | — | — | intentional — Executor pattern: anyone may execute once enough approvals collected; intentional. |

### oracle-consumer

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| init | yes | no | — | — | intentional — One-time init by deployer. |
| set_oracle | yes | no | — | — | GAP — Require admin/auth before changing the oracle source. |
| set_max_age | yes | no | — | — | GAP — Require admin/auth before changing max age. |

### reentrancy-guard

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| deposit | yes | yes | user | — | ok |
| withdraw | yes | yes | user | — | ok |
| withdraw_vulnerable | yes | yes | user | — | ok |
| set_attack_mode | yes | no | — | — | GAP — Require owner/auth before toggling the attack mode that enables the vulnerable path. |
| on_withdraw | yes | no | — | — | intentional — Cross-contract callback invoked by the token contract during transfer; not directly callable by a user, so no require_auth is correct. |

### simple-dao

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | yes | admin | — | ok |
| submit_proposal | yes | yes | proposer | — | ok |
| vote | yes | yes | voter | — | ok |
| queue_proposal | yes | yes | admin | — | fixed — admin.require_auth added in this PR |
| execute_proposal | yes | yes | admin | — | fixed — admin.require_auth added in this PR |
| cancel_proposal | yes | yes | caller | — | ok |
| action | yes | no | — | — | GAP — Gate the debug action behind admin auth. |
| set_val | yes | no | — | — | GAP — Gate the debug setter behind admin auth. |

### simple-voting

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| create_proposal | yes | no | — | — | GAP — Add a `creator: Address` param and `creator.require_auth()`. |
| delegate_vote | yes | yes | delegator | — | ok |
| revoke_delegation | yes | yes | delegator | — | ok |
| vote | yes | yes | voter | — | ok |
| close_proposal | yes | no | — | — | GAP — Require the creator (or admin) auth; add an actor param + `require_auth()`. |

### staking

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | yes | admin | — | ok |
| set_reward | yes | yes | admin | — | ok |
| stake | yes | yes | staker | — | ok |
| unstake | yes | yes | staker | — | ok |

### timelock-vault

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| deposit | yes | yes | depositor | — | ok |
| withdraw | yes | no | — | — | intentional — By design callable by anyone; funds always routed to the stored beneficiary (documented in contract). |
| cancel | yes | yes | depositor | — | ok |

### token-snapshot

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | yes | admin | — | ok |
| mint | yes | yes | admin | — | ok |
| transfer | yes | yes | from | — | ok |
| create_snapshot | yes | yes | admin | — | ok |
| mark_claimed | yes | yes | address | — | ok |

### token-transfer

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | no | — | — | intentional — One-time init by deployer. |
| mint | yes | no | — | — | GAP — Add an admin role and require admin auth before minting. |
| transfer | yes | yes | from | — | ok |
| burn | yes | yes | from | — | ok |
| approve | yes | yes | owner | — | ok |
| transfer_from | yes | yes | spender | — | ok |

### token-vesting

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| initialize | yes | yes | funder | — | ok |
| release | yes | yes | beneficiary | — | ok |

### token-wrapper

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| init | yes | no | — | — | intentional — One-time init by deployer. |
| mint | yes | no | — | — | GAP — Add an admin gate and require admin auth before minting. |
| transfer | yes | yes | from | — | ok |

### upgradeable

| Method | Mutates | require_auth | Who must auth | Test | Status |
| --- | --- | --- | --- | --- | --- |
| __constructor | yes | no | — | — | intentional — Constructor. |
| set_value | yes | no | — | — | GAP — Require admin auth before mutating the stored value (mirror the existing `upgrade` admin check). |

## Gaps and recommended fixes

Each remaining gap needs the change noted below. Most require either an admin role or an explicit actor `Address` parameter (a signature change) plus a test asserting an unauthorized caller is rejected.

- **balance-snapshot.mint**: Add an admin role (or deployer) and call `admin.require_auth()` before minting.
- **balance-snapshot.take_snapshot**: Require admin auth before snapshotting state.
- **contract-factory.deploy_child**: Require deployer/admin auth before deploying a child contract.
- **flash-loan.flash_loan**: Require the borrower/caller auth (add an explicit actor param + `require_auth()`).
- **oracle-consumer.set_oracle**: Require admin/auth before changing the oracle source.
- **oracle-consumer.set_max_age**: Require admin/auth before changing max age.
- **reentrancy-guard.set_attack_mode**: Require owner/auth before toggling the attack mode that enables the vulnerable path.
- **simple-dao.action**: Gate the debug action behind admin auth.
- **simple-dao.set_val**: Gate the debug setter behind admin auth.
- **simple-voting.create_proposal**: Add a `creator: Address` param and `creator.require_auth()`.
- **simple-voting.close_proposal**: Require the creator (or admin) auth; add an actor param + `require_auth()`.
- **token-transfer.mint**: Add an admin role and require admin auth before minting.
- **token-wrapper.mint**: Add an admin gate and require admin auth before minting.
- **upgradeable.set_value**: Require admin auth before mutating the stored value (mirror the existing `upgrade` admin check).

## What this PR changed

- Added `require_auth` to the safe, no-signature-change gaps: `emergency-stop.do_work` (admin), `simple-dao.queue_proposal` and `simple-dao.execute_proposal` (DAO admin). All three crates mock auth in their tests, so existing tests still pass.
- Documented every other method explicitly as `intentional` (constructors, deployer `init`, teaching examples, cross-contract callbacks, by-design public withdraw) or as a `GAP` with the precise recommended fix.
- Left the remaining `GAP` methods unfixed because they need a signature/role change (an explicit actor `Address` or an admin role) and corresponding negative tests; applying them is tracked by this table.

## Design notes

- `initialize`/`init` methods are left public on purpose: they are called once by the deploying account and there is no prior authorized role to check against.
- Teaching examples (`counter`, `hello-world`, `error-handling`) intentionally omit auth to keep the focused lesson readable; do not copy them verbatim to mainnet.
- Apply the fixes above behind `mock_all_auths_allowing_non_root_auth()` + `set_auths` tests that assert an unauthorized address is rejected.

See [Code Security Audit](./code-audit.md) for the documentation-site checklist.
