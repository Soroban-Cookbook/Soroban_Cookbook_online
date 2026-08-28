---
title: Token Pattern Security Audit
description: Security considerations and audit checklists for Soroban token patterns — basic tokens, allowances, wrappers, vaults, vesting, and SAC integration.
sidebar_position: 3
---

Token contracts hold or move value directly. A single logic flaw can drain balances or inflate supply irreversibly. Use this guide alongside [Security Fundamentals](/docs/security/fundamentals) when designing, reviewing, or deploying any token-related pattern.

The checklists below map to the token patterns catalogued in the [Pattern Library](/docs/patterns/overview#-token-standards) and the [`examples/token-transfer/`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/token-transfer) reference implementation.

---

## 1. Token Threat Model

### Assets at risk

- **User balances** — persistent storage keyed by `Address`.
- **Total supply** — mint/burn authority and supply accounting.
- **Allowances** — delegated spending rights between owner and spender.
- **Vault deposits** — tokens held by wrapper, vault, or escrow contracts on behalf of users.
- **Metadata integrity** — name, symbol, decimals, and issuer fields that wallets and indexers trust.

### Common attack goals

| Goal | Typical exploit |
|------|-----------------|
| Steal tokens | Missing `require_auth`, flawed allowance logic, reentrancy via cross-contract calls |
| Mint unbounded supply | Unprotected `mint`, admin key compromise, upgrade hijack |
| Lock funds permanently | Pausable flag stuck, vault accounting desync, vesting schedule bugs |
| Manipulate integrations | Wrong decimals, balance snapshot timing, fake token contract address |

### Soroban-specific context

- **Atomic transactions** — state rolls back on panic, but cross-contract calls in the same transaction still share one budget and one atomic boundary.
- **No EVM-style reentrancy by default** — still follow **Checks-Effects-Interactions** when calling external token contracts from vaults or wrappers.
- **Persistent storage costs** — unbounded allowance maps or balance iteration can create DoS via resource exhaustion.
- **Prefer SAC when possible** — the [Stellar Asset Contract (SAC)](https://developers.stellar.org/docs/tokens/stellar-asset-contract) is audited, SEP-41 compatible, and interoperable with the Stellar ecosystem. Custom tokens add implementation risk.

---

## 2. Pattern-Specific Risks & Mitigations

### 2.1 Basic token (mint / transfer / balance)

Reference: [`examples/token-transfer/src/lib.rs`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/token-transfer/src/lib.rs)

**High-risk areas**

- **Unprotected mint** — any caller can inflate supply if `mint` lacks admin auth.
- **Transfer without auth** — debiting `from` without `from.require_auth()` lets anyone move others' tokens.
- **Unchecked arithmetic** — balance updates must use `checked_add` / `checked_sub` or equivalent safe math.
- **Invalid amounts** — zero or negative transfers should fail explicitly.
- **Self-transfer edge cases** — decide whether self-transfers are allowed; document and test the choice.

**Mitigations**

```rust
// ✅ Transfer: authorize debited account
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    from.require_auth();
    if amount <= 0 { return Err(Error::InvalidAmount); }
    // ... checked balance updates
    Ok(())
}

// ✅ Mint: restrict to admin
pub fn mint(env: Env, admin: Address, to: Address, amount: i128) -> Result<(), Error> {
    admin.require_auth();
    Self::require_admin(&env, &admin)?;
    // ... checked supply and balance updates
    Ok(())
}
```

**Audit focus**

- [ ] Every balance-decreasing path calls `require_auth` on the debited account (or valid allowance — see §2.4).
- [ ] Mint and burn are gated to explicit roles, not public.
- [ ] Amount validation rejects `<= 0` and overflow paths.
- [ ] Events emitted for mint, burn, and transfer (for indexers and incident response).

---

### 2.2 Token metadata (name, symbol, decimals, total supply)

**High-risk areas**

- **Decimals mismatch** — integrators assume 7 decimals (Stellar default) or your declared value; wrong decimals cause 10× accounting errors.
- **Mutable metadata post-deploy** — changing symbol or decimals breaks wallet caches and user trust.
- **Supply desync** — stored `total_supply` diverges from sum of balances after buggy mint/burn.

**Mitigations**

- Set metadata once at initialization; make fields immutable or admin-only with timelock.
- Expose `decimals()` consistently; document rounding rules for UI integrators.
- Reconcile `total_supply` in tests after every mint/burn sequence.

**Audit focus**

- [ ] Metadata initialized before any mint and not silently mutable.
- [ ] `total_supply` matches mint/burn accounting in property tests.
- [ ] Decimals documented in deployment guide and on-chain.

---

### 2.3 Token burn

**High-risk areas**

- **Burning others' tokens** without authorization.
- **Supply underflow** — burning more than balance or more than outstanding supply.
- **Missing events** — burned tokens invisible to off-chain accounting.

**Mitigations**

```rust
pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
    from.require_auth();
    if amount <= 0 { return Err(Error::InvalidAmount); }
    let balance = get_balance(&env, &from);
    let new_balance = balance.checked_sub(amount).ok_or(Error::InsufficientBalance)?;
    set_balance(&env, &from, new_balance);
    decrease_total_supply(&env, amount)?;
    env.events().publish(("burn", from), amount);
    Ok(())
}
```

**Audit focus**

- [ ] `from.require_auth()` on all burn paths.
- [ ] Total supply decreases atomically with balance.
- [ ] Burn events include account and amount.

---

### 2.4 Token allowance (approve / transfer_from)

**High-risk areas**

- **Allowance not decremented** — spender can drain repeatedly.
- **Race / double-spend** — multiple `transfer_from` in one transaction exceeding allowance (mitigated by atomic txs, but logic must still check remaining allowance).
- **Infinite approval footgun** — `i128::MAX` approvals are convenient but irreversible until revoked.
- **Spender auth confusion** — debiting owner without validating spender identity or allowance.

**Mitigations**

```rust
pub fn transfer_from(
    env: Env,
    spender: Address,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), Error> {
    spender.require_auth();
    let allowance = get_allowance(&env, &from, &spender);
    if allowance < amount { return Err(Error::InsufficientAllowance); }
    set_allowance(&env, &from, &spender, allowance - amount);
    // ... debit from, credit to (same checks as transfer)
    Ok(())
}
```

**Audit focus**

- [ ] Allowance reduced before or atomically with balance move (Checks-Effects-Interactions).
- [ ] `approve` requires owner auth; zeroing allowance supported for revocation.
- [ ] Tests cover partial spend, full spend, over-spend revert, and approval overwrite.

---

### 2.5 Token wrapper

Wrappers add logic around an underlying token (fees, logging, compliance hooks, upgrade surface).

**High-risk areas**

- **Fee-on-transfer desync** — wrapper and underlying balances diverge when fees are skimmed incorrectly.
- **Wrong underlying address** — pointing at attacker-controlled contract.
- **Reentrancy via callback** — external token call before internal accounting update.
- **Upgradeable wrapper** — malicious upgrade replaces fee recipient or disables withdrawals.

**Mitigations**

- Store underlying token address in instance storage; validate interface at init.
- Update wrapper ledger **before** calling external `transfer`.
- Cap fees with hardcoded maximum basis points; emit fee events.
- If upgradeable, apply [Lifecycle & Upgrade Safety](/docs/patterns/lifecycle-upgrades) controls.

**Audit focus**

- [ ] Underlying token ID validated at initialization and not user-supplied per call.
- [ ] Fee math uses checked arithmetic and documented rounding.
- [ ] Deposit and withdraw paths tested against malicious underlying (mock that re-enters).
- [ ] Users can always redeem underlying (no stuck wrapper shares).

---

### 2.6 Multi-token vault

Vaults hold multiple asset types and track per-user shares or per-asset balances.

**High-risk areas**

- **Share inflation attack** — first depositor griefing via donation + share manipulation.
- **Cross-asset accounting errors** — withdrawing asset A while credited for asset B.
- **Oracle / price trust** — if vault values positions by external price, stale or manipulated prices drain funds.
- **Token ID confusion** — same interface, different contract addresses.

**Mitigations**

- Use minimum initial deposit or dead shares on first deposit to mitigate inflation attacks.
- Namespace storage by `(token_id, user)`; never mix asset keys.
- Validate `token_id` against an allowlist set by admin.
- Follow [Cross-Contract Invocation](/docs/concepts/cross-contract-invocation) defensive patterns.

**Audit focus**

- [ ] Per-asset balance isolation verified in tests.
- [ ] First-depositor / empty-vault edge cases covered.
- [ ] Withdraw always ≤ deposited + earned (no over-withdrawal paths).
- [ ] Allowlist or registry for supported tokens.

---

### 2.7 Token vesting & timelock

**High-risk areas**

- **Premature unlock** — timestamp comparison off-by-one or wrong ledger time source.
- **Admin clawback** — beneficiary expects irrevocable vesting; hidden admin keys undermine trust.
- **Partial release desync** — released amount exceeds vested amount.

**Mitigations**

- Use `env.ledger().timestamp()` consistently; document timezone-agnostic semantics.
- Make schedules immutable or governance-controlled with timelock.
- Store `released` and `vested` separately; assert `released <= vested` on every claim.

**Audit focus**

- [ ] Claims revert before cliff and after full release.
- [ ] No path releases more than schedule allows.
- [ ] Admin powers explicit and documented for users.

---

### 2.8 Snapshot balances (governance / dividends)

**High-risk areas**

- **Flash-loan snapshot manipulation** — balance recorded at block that attacker temporarily inflates.
- **Double-claim** — same snapshot used twice for rewards or votes.

**Mitigations**

- Snapshot at `ledger_sequence - N` or require tokens locked in staking contract.
- Mark claims consumed per `(snapshot_id, account)`.
- See [Governance Security](/docs/security/governance) for voting-specific guidance.

**Audit focus**

- [ ] Snapshot timing resistant to single-block balance spikes.
- [ ] One claim per snapshot per address enforced on-chain.

---

### 2.9 Pausable token

**High-risk areas**

- **Pause stuck on** — admin compromise or missing unpause permanently freezes transfers.
- **Pause bypass** — mint/burn/transfer_from not all guarded by pause flag.
- **Centralization risk** — users unaware single key can halt market.

**Mitigations**

- Guard **all** value-moving functions: `transfer`, `transfer_from`, `mint`, `burn`.
- Emit `Paused` / `Unpaused` events; consider timelock on pause for production.
- Document centralization tradeoff in deployment materials.

**Audit focus**

- [ ] Pause flag checked on every mutating entry point (grep for uncovered paths).
- [ ] Unpause requires same or higher authority as pause.
- [ ] View functions (`balance`, `allowance`) still work while paused.

---

### 2.10 Stellar Asset Contract (SAC) integration

When wrapping or interacting with SAC instead of a custom token:

**High-risk areas**

- **Wrong asset / contract address** — user deposits to vault wired to testnet SAC on mainnet.
- **Trustline assumptions** — Stellar classic assets require trustlines; Soroban SAC behavior differs from custom contracts.
- **Assuming EVM ERC-20 semantics** — SEP-41 interface differs; read Stellar docs before porting patterns.

**Mitigations**

- Pin SAC contract IDs in storage; verify on deploy with CLI / explorer.
- Use SDK-generated `token::Client` for typed calls.
- Prefer SAC issuance for fungible assets unless custom logic is required.

**Audit focus**

- [ ] Callee addresses match intended network and asset.
- [ ] Integration tests run against SAC testnet deployment.
- [ ] Custom logic documented where it diverges from SAC defaults.

---

## 3. Master Token Security Audit Checklist

Complete this checklist before mainnet deployment. Items apply to **all** token patterns unless marked optional.

### Authorization & access control

- [ ] All transfer, mint, burn, and allowance mutations call `require_auth` on the correct identity.
- [ ] Admin / minter / pauser roles stored in instance storage and protected.
- [ ] No public function can move tokens without explicit user or allowance consent.

### Arithmetic & invariants

- [ ] All balance and supply math uses checked operations.
- [ ] `sum(balances) <= total_supply` (or `==` if no unallocated supply) holds after every operation.
- [ ] Allowances never negative; transfers never exceed balance or allowance.

### Storage & DoS

- [ ] Balance and allowance keys scoped by `Address` (no unbounded iteration over user sets in a single call).
- [ ] Persistent storage growth is predictable and budget-tested.

### Cross-contract & composition

- [ ] External token calls happen **after** internal state updates (Checks-Effects-Interactions).
- [ ] Token contract addresses come from trusted storage, not unvalidated user input.
- [ ] Failure modes from external token calls handled (return `Result`, don't assume success).

### Observability

- [ ] Mint, burn, transfer, approve, pause, and admin changes emit structured events.
- [ ] Error enums are explicit (no silent `unwrap` on user paths).

### Testing

- [ ] Unauthorized transfer / mint / burn revert.
- [ ] Zero and negative amounts revert.
- [ ] Insufficient balance and allowance revert with state unchanged.
- [ ] Property or fuzz tests for supply conservation (where feasible).
- [ ] Cross-contract tests for vault / wrapper paths with mock re-entering token.

### Operational & governance

- [ ] Upgrade path reviewed if contract is upgradeable ([Lifecycle guide](/docs/patterns/lifecycle-upgrades)).
- [ ] Centralization risks (pause, mint, admin) documented for users.
- [ ] Incident response: how to pause, rotate admin, and communicate on-chain events.

---

## 4. Pattern Quick-Reference Matrix

Use this matrix during review to ensure pattern-specific items are not missed.

| Pattern | Critical checks |
|---------|-----------------|
| Basic token | Auth on transfer; gated mint; amount validation |
| Metadata | Immutable fields; decimals documented; supply sync |
| Burn | Auth on burn; supply decrease; events |
| Allowance | Decrement on spend; owner auth on approve |
| Wrapper | CEI ordering; fee caps; underlying address trust |
| Multi-token vault | Asset isolation; first-depositor; allowlist |
| Vesting / timelock | Timestamp source; no over-release |
| Snapshot | Flash-loan resistance; one claim per snapshot |
| Pausable | All mutators guarded; unpause auth |
| SAC integration | Correct contract ID; SEP-41 semantics |

---

## 5. Related Resources

- [Security Fundamentals](/docs/security/fundamentals) — general contract security baseline
- [Authorization concepts](/docs/concepts/authorization) — access control patterns
- [Cross-Contract Invocation](/docs/concepts/cross-contract-invocation) — safe external token calls
- [Governance Security](/docs/security/governance) — token-weighted voting risks
- [Pattern Library — Token Standards](/docs/patterns/overview#-token-standards) — pattern catalog
- [Stellar token documentation](https://developers.stellar.org/docs/tokens/stellar-asset-contract) — SAC and SEP-41 reference
