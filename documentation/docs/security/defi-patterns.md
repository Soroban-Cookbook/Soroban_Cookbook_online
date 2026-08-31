---
title: DeFi Security Patterns
sidebar_position: 3
---

# DeFi Security Patterns

Decentralized Finance (DeFi) introduces complex security challenges beyond those of simple token contracts. This guide covers security patterns specific to DeFi primitives such as AMMs, lending protocols, and swap contracts on Soroban.

---

## 1. AMM Security

Automated Market Makers (AMMs) allow users to trade against a liquidity pool. The constant product formula `x * y = k` is the most common invariant.

### 1.1 Constant Product Invariant Protection

The invariant `x * y = k` must hold after every trade (minus fees). Failure to maintain this invariant can lead to price manipulation or pool drainage.

**Risks:**

- **Rounding errors** that violate the invariant over many trades
- **Fee calculation errors** that allow arbitrageurs to extract value
- **Incorrect reserve tracking** after swaps

**Mitigation:**

- Always verify the invariant holds after swaps (reserve_a * reserve_b >= k before swap)
- Use fixed-precision arithmetic with fee-on-transfer awareness
- Round in favor of the pool, not the trader

```rust
// Use the Uniswap V2 formula for output calculation:
// amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
//
// This applies a 0.3% fee and guarantees k increases or stays the same.
let amount_in_with_fee = amount_in.checked_mul(997).ok_or(Error::Overflow)?;
let numerator = amount_in_with_fee.checked_mul(reserve_out).ok_or(Error::Overflow)?;
let denominator = reserve_in.checked_mul(1000).ok_or(Error::Overflow)?
    .checked_add(amount_in_with_fee).ok_or(Error::Overflow)?;
let amount_out = numerator.checked_div(denominator).ok_or(Error::Overflow)?;
```

### 1.2 Integer Overflow in AMM Arithmetic

The swap formula multiplies two reserve values together, both of which can be large
`i128` numbers.  Without checked arithmetic, a single large swap can silently
overflow and return a wildly incorrect output amount.

**Rule:** every multiplication and addition in fee or reserve calculations must use
`checked_mul` / `checked_add` and propagate an `Error::Overflow` result — never
use bare `*` or `+` operators on token amounts.

**Overflow boundary tests** in
[`examples/constant-product-amm`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/constant-product-amm/src/lib.rs)
verify that passing `i128::MAX` as a swap input returns `Error::Overflow` rather
than producing a garbage result:

- `test_swap_a_for_b_max_amount_overflows`
- `test_swap_b_for_a_max_amount_overflows`
- `test_add_liquidity_large_amounts_overflow`

### 1.3 Flash Loan Attacks on AMMs

Flash loans allow borrowing without collateral as long as the loan is repaid in the same transaction. Attackers often use flash loans to manipulate AMM prices.

**Mitigation:**

- Use **oracle price feeds** (e.g., via the Stellar oracle) as a secondary price check
- Implement **TWAP (Time-Weighted Average Price)** oracles that are resistant to single-block manipulation
- Consider **price manipulation guards** that reject swaps that deviate significantly from the oracle price

### 1.4 Liquidity Pool Attacks

Adding or removing liquidity changes the pool depth and can be exploited.

**Risks:**

- **Inflation attacks:** The first liquidity provider can manipulate the pool ratio to steal from subsequent LPs
- **Sanity checks on min amounts:** Without minimum output checks, LPs can receive far fewer tokens than expected
- **Donation attacks:** Attacker donates tokens to manipulate LP share calculations

**Mitigation:**

- Mint initial LP tokens as `sqrt(amount_a * amount_b)` for the first deposit
- Always accept `amount_a_min` and `amount_b_min` parameters (slippage protection)
- Track internal balances rather than relying on token contract balance queries
- Lock a minimum amount of LP tokens (e.g., burn the first few shares) to prevent ratio manipulation

```rust
// Safe initial LP mint: use geometric mean
let lp_amount = sqrt_i128(amount_a.checked_mul(amount_b).ok_or(Error::Overflow)?);

// For subsequent deposits, compute proportional LP tokens with checked arithmetic:
let from_a = amount_a.checked_mul(lp_total_supply).ok_or(Error::Overflow)?
    .checked_div(reserve_a).ok_or(Error::Overflow)?;
let from_b = amount_b.checked_mul(lp_total_supply).ok_or(Error::Overflow)?
    .checked_div(reserve_b).ok_or(Error::Overflow)?;
// Mint the smaller of the two computed amounts
let lp_mint = from_a.min(from_b);
```

---

## 2. Swap / Exchange Security

### 2.1 Slippage Protection

Users must always specify a minimum output amount (`min_out`) to prevent front-running and sandwich attacks.

```rust
// Always accept a min_out parameter
pub fn swap(
    env: Env,
    caller: Address,
    amount_in: i128,
    min_out: i128, // ← critical parameter
) -> Result<i128, Error> {
    caller.require_auth();
    // ... compute amount_out ...
    if amount_out < min_out {
        return Err(Error::SlippageExceeded);
    }
    // ... execute swap ...
}
```

### 2.2 Front-running and Sandwich Attacks

In a sandwich attack, an attacker observes a pending swap, places a buy order before it (driving the price up), and a sell order after it (profiting from the price movement).

**Mitigation:**

- **Commit-reveal schemes:** Users commit to a trade hash and reveal it later
- **Batch auctions:** Process trades in batches at a single clearing price
- **Minimum output amounts:** The most practical defense — users specify the worst acceptable output price

### 2.3 Cross-Asset Swap Validation

For HTLC-based atomic swaps, verify these invariants:

```rust
// HTLC invariants:
// 1. hashlock must be a SHA-256 hash (32 bytes)
// 2. timelock must be in the future
// 3. amounts must be positive
// 4. sender must have sufficient balance
// 5. preimage must match hashlock when claiming
// 6. timelock must have expired before refund
```

**Security checklist for HTLC contracts:**

- [ ] **Hashlock verification:** Validate the preimage against the stored hash before releasing funds
- [ ] **Timelock enforcement:** Do not allow refunds before the timelock expires
- [ ] **Atomicity:** Both sides of the swap complete or neither does
- [ ] **Reentrancy guard:** Prevent recursive calls during token transfers
- [ ] **Authorization:** Only the intended parties can create, claim, or refund swaps

---

## 3. Flash Loan Security

### 3.1 Fee Calculation Overflow

Flash loan fees are computed as `amount × fee_bps / 10_000`. When `amount` is
large, the intermediate `amount × fee_bps` product can overflow `i128`.

**Rule:** use `checked_mul` for the fee calculation and surface the overflow with a
clear panic message (or an `Error` variant).  See
[`examples/flash-loan`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/flash-loan/src/lib.rs)
for the reference implementation of `calculate_fee` and the boundary tests:

- `test_calculate_fee_boundary_safe` — verifies that `i128::MAX / 100` does not overflow at a 1% fee
- `test_flash_loan_max_i128_exceeds_liquidity` — verifies that `i128::MAX` as amount is rejected before any arithmetic

### 3.2 Repayment Invariant

After the receiver's callback, the pool re-reads its own token balance and
compares it to `balance_before + fee`.  This `checked_add` is also guarded —
if `balance_before + fee` would overflow, the contract panics with a
descriptive message rather than accepting an incorrect repayment.

---

## 4. Staking Contract Security

### 4.1 Reward Calculation Overflow

Pending rewards are computed as:

```
pending = epochs_elapsed × reward_per_epoch × user_stake / total_staked
```

Each multiplication can overflow independently:
1. `epochs_elapsed × reward_per_epoch` overflows when many epochs elapse with a high reward rate.
2. `(above) × user_stake` overflows when the user's stake is also large.

**Rule:** chain `checked_mul` for each multiplication and return `Error::Overflow`
rather than panicking.  See
[`examples/staking`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/staking/src/lib.rs)
`pending_rewards` helper and the boundary tests:

- `test_pending_rewards_overflow_returns_error` — `reward_per_epoch = i128::MAX`, 2 epochs, returns `Error::Overflow`
- `test_stake_overflow_returns_error` — adding `i128::MAX` to an existing stake returns `Error::Overflow`
- `test_total_staked_overflow_returns_error` — two users whose combined stake exceeds `i128::MAX`
- `test_stake_and_unstake_max_value` — staking and unstaking exactly `i128::MAX` succeeds within epoch 0

### 4.2 TotalStaked Underflow

When unstaking, the global `TotalStaked` counter is decremented.  Without
`checked_sub` this could wrap around to a large positive value, inflating
apparent TVL.  The staking example uses `checked_sub` and returns
`Error::Overflow` if the invariant is violated (which should be impossible
in normal operation but guards against state corruption from future upgrades).

---

## 5. Token Vesting Security

### 5.1 Vesting Arithmetic Overflow

Linear vesting computes:

```
vested = total_amount × elapsed / duration
```

When `total_amount` is near `i128::MAX` and `elapsed` is large, the
intermediate product overflows.  The formula uses `checked_mul` and returns
`Error::ArithmeticOverflow` rather than panicking.  See
[`examples/token-vesting`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/token-vesting/src/lib.rs)
and the boundary tests:

- `vesting_math_reports_overflow_for_max_amount` — `total_amount = i128::MAX`, mid-schedule timestamp
- `vesting_at_end_time_returns_total_amount_without_overflow` — the `end_time` fast-path bypasses the multiplication entirely, so `i128::MAX` is always safe
- `vesting_boundary_just_below_overflow` — the largest `total_amount` that fits without overflow at `duration - 1` seconds elapsed
- `releasable_amount_propagates_overflow` — `releasable_amount` propagates the error from `vested_at`

### 5.2 Subtraction Underflow

`releasable = vested - released_amount` and `withdraw: collected - amount` are
both guarded with `checked_sub` to protect against state corruption
(e.g. a buggy upgrade that stores an incorrect `released_amount`).

---

## 6. Oracle Security

Many DeFi contracts depend on price oracles. Manipulated oracles have caused some of the largest DeFi losses.

### 6.1 Oracle Types

| Type | Pros | Cons |
|---|---|---|
| **On-chain AMM price** | Always available, free | Easily manipulable with flash loans |
| **TWAP (Time-Weighted)** | Manipulation resistant | Lag time, complex to implement |
| **Stellar Oracle** | Decentralized, purpose-built | External dependency |
| **Multiple sources** | Highest security | Most complex, gas-intensive |

### 6.2 Oracle Manipulation Prevention

- Never use a **single AMM spot price** as an oracle
- Always implement **TWAP** if using AMM prices internally
- Add **circuit breakers** that reject prices outside a certain deviation band from the last price
- Consider **rate limiting** how often critical functions can execute

---

## 7. Lending Protocol Security

### 7.1 Collateralization

- Always enforce a **minimum collateralization ratio** (e.g., 150%)
- Re-calculate collateral value on every borrow, withdraw, and liquidation
- Use **conservative price feeds** (lowest bid for collateral, highest ask for debt)

```rust
// Collateral check pattern:
let collateral_value = collateral_amount * collateral_price;
let debt_value = debt_amount * debt_price;

// Enforce minimum over-collateralization
let max_debt = collateral_value * MIN_COLLATERAL_RATIO / 100;
if debt_value > max_debt {
    return Err(Error::InsufficientCollateral);
}
```

### 7.2 Liquidation Safety

- Liquidators should receive an **incentive** (bonus) for liquidating unhealthy positions
- Implement a **partial liquidation** mechanism (liquidate only enough to restore health)
- Prevent **liquidation race conditions** by batching or using sequential processing
- Check that **liquidation does not create bad debt** exceeding protocol reserves

---

## 8. General DeFi Security Checklist

- [ ] **Slippage protection:** Every swap/exchange function takes `min_out` parameter
- [ ] **Invariant checks:** AMM reserves satisfy x * y >= k after every operation
- [ ] **No bare `*` or `+` on token amounts:** use `checked_mul` / `checked_add` and return an error on overflow
- [ ] **Boundary tests:** include `i128::MAX` cases for every arithmetic-heavy function
- [ ] **Oracle manipulation resistance:** Never rely on single-spot-price oracles
- [ ] **LP token inflation protection:** Use geometric mean for initial LP minting
- [ ] **Reentrancy guards:** Apply checks-effects-interactions pattern
- [ ] **Authorization:** All sensitive functions call `require_auth()`
- [ ] **Emergency stops:** Provide a pause mechanism for critical vulnerabilities
- [ ] **Event emissions:** Every financial operation emits a descriptive event
- [ ] **Test coverage:** Include tests for rounding, edge cases, and attack scenarios
- [ ] **Formal verification:** For critical invariant properties (e.g., constant product formula)


Decentralized Finance (DeFi) introduces complex security challenges beyond those of simple token contracts. This guide covers security patterns specific to DeFi primitives such as AMMs, lending protocols, and swap contracts on Soroban.

---

## 1. AMM Security

Automated Market Makers (AMMs) allow users to trade against a liquidity pool. The constant product formula `x * y = k` is the most common invariant.

### 1.1 Constant Product Invariant Protection

The invariant `x * y = k` must hold after every trade (minus fees). Failure to maintain this invariant can lead to price manipulation or pool drainage.

**Risks:**

- **Rounding errors** that violate the invariant over many trades
- **Fee calculation errors** that allow arbitrageurs to extract value
- **Incorrect reserve tracking** after swaps

**Mitigation:**

- Always verify the invariant holds after swaps (reserve_a * reserve_b >= k before swap)
- Use fixed-precision arithmetic with fee-on-transfer awareness
- Round in favor of the pool, not the trader

```rust
// Use the Uniswap V2 formula for output calculation:
// amount_out = (amount_in * 997 * reserve_out) / (reserve_in * 1000 + amount_in * 997)
//
// This applies a 0.3% fee and guarantees k increases or stays the same.
let amount_in_with_fee = amount_in.checked_mul(997)?;
let numerator = amount_in_with_fee.checked_mul(reserve_out)?;
let denominator = reserve_in.checked_mul(1000)?.checked_add(amount_in_with_fee)?;
let amount_out = numerator.checked_div(denominator)?;
```

### 1.2 Flash Loan Attacks on AMMs

Flash loans allow borrowing without collateral as long as the loan is repaid in the same transaction. Attackers often use flash loans to manipulate AMM prices.

**Mitigation:**

- Use **oracle price feeds** (e.g., via the Stellar oracle) as a secondary price check
- Implement **TWAP (Time-Weighted Average Price)** oracles that are resistant to single-block manipulation
- Consider **price manipulation guards** that reject swaps that deviate significantly from the oracle price

### 1.3 Liquidity Pool Attacks

Adding or removing liquidity changes the pool depth and can be exploited.

**Risks:**

- **Inflation attacks:** The first liquidity provider can manipulate the pool ratio to steal from subsequent LPs
- **Sanity checks on min amounts:** Without minimum output checks, LPs can receive far fewer tokens than expected
- **Donation attacks:** Attacker donates tokens to manipulate LP share calculations

**Mitigation:**

- Mint initial LP tokens as `sqrt(amount_a * amount_b)` for the first deposit
- Always accept `amount_a_min` and `amount_b_min` parameters (slippage protection)
- Track internal balances rather than relying on token contract balance queries
- Lock a minimum amount of LP tokens (e.g., burn the first few shares) to prevent ratio manipulation

```rust
// Safe initial LP mint: use geometric mean
let lp_amount = sqrt_i128(amount_a.checked_mul(amount_b)?);

// For subsequent deposits, compute proportional LP tokens:
let from_a = amount_a * lp_total_supply / reserve_a;
let from_b = amount_b * lp_total_supply / reserve_b;
// Mint the smaller of the two computed amounts
let lp_mint = from_a.min(from_b);
```

---

## 2. Swap / Exchange Security

### 2.1 Slippage Protection

Users must always specify a minimum output amount (`min_out`) to prevent front-running and sandwich attacks.

```rust
// Always accept a min_out parameter
pub fn swap(
    env: Env,
    caller: Address,
    amount_in: i128,
    min_out: i128, // ← critical parameter
) -> Result<i128, Error> {
    caller.require_auth();
    // ... compute amount_out ...
    if amount_out < min_out {
        return Err(Error::SlippageExceeded);
    }
    // ... execute swap ...
}
```

### 2.2 Front-running and Sandwich Attacks

In a sandwich attack, an attacker observes a pending swap, places a buy order before it (driving the price up), and a sell order after it (profiting from the price movement).

**Mitigation:**

- **Commit-reveal schemes:** Users commit to a trade hash and reveal it later
- **Batch auctions:** Process trades in batches at a single clearing price
- **Minimum output amounts:** The most practical defense — users specify the worst acceptable output price

### 2.3 Cross-Asset Swap Validation

For HTLC-based atomic swaps, verify these invariants:

```rust
// HTLC invariants:
// 1. hashlock must be a SHA-256 hash (32 bytes)
// 2. timelock must be in the future
// 3. amounts must be positive
// 4. sender must have sufficient balance
// 5. preimage must match hashlock when claiming
// 6. timelock must have expired before refund
```

**Security checklist for HTLC contracts:**

- [ ] **Hashlock verification:** Validate the preimage against the stored hash before releasing funds
- [ ] **Timelock enforcement:** Do not allow refunds before the timelock expires
- [ ] **Atomicity:** Both sides of the swap complete or neither does
- [ ] **Reentrancy guard:** Prevent recursive calls during token transfers
- [ ] **Authorization:** Only the intended parties can create, claim, or refund swaps

## 3. Oracle Security

Many DeFi contracts depend on price oracles. Manipulated oracles have caused some of the largest DeFi losses.

### 3.1 Oracle Types

| Type | Pros | Cons |
|---|---|---|
| **On-chain AMM price** | Always available, free | Easily manipulable with flash loans |
| **TWAP (Time-Weighted)** | Manipulation resistant | Lag time, complex to implement |
| **Stellar Oracle** | Decentralized, purpose-built | External dependency |
| **Multiple sources** | Highest security | Most complex, gas-intensive |

### 3.2 Oracle Manipulation Prevention

- Never use a **single AMM spot price** as an oracle
- Always implement **TWAP** if using AMM prices internally
- Add **circuit breakers** that reject prices outside a certain deviation band from the last price
- Consider **rate limiting** how often critical functions can execute

## 4. Lending Protocol Security

### 4.1 Collateralization

- Always enforce a **minimum collateralization ratio** (e.g., 150%)
- Re-calculate collateral value on every borrow, withdraw, and liquidation
- Use **conservative price feeds** (lowest bid for collateral, highest ask for debt)

```rust
// Collateral check pattern:
let collateral_value = collateral_amount * collateral_price;
let debt_value = debt_amount * debt_price;

// Enforce minimum over-collateralization
let max_debt = collateral_value * MIN_COLLATERAL_RATIO / 100;
if debt_value > max_debt {
    return Err(Error::InsufficientCollateral);
}
```

### 4.2 Liquidation Safety

- Liquidators should receive an **incentive** (bonus) for liquidating unhealthy positions
- Implement a **partial liquidation** mechanism (liquidate only enough to restore health)
- Prevent **liquidation race conditions** by batching or using sequential processing
- Check that **liquidation does not create bad debt** exceeding protocol reserves

## 5. General DeFi Security Checklist

- [ ] **Slippage protection:** Every swap/exchange function takes `min_out` parameter
- [ ] **Invariant checks:** AMM reserves satisfy x * y >= k after every operation
- [ ] **Oracle manipulation resistance:** Never rely on single-spot-price oracles
- [ ] **LP token inflation protection:** Use geometric mean for initial LP minting
- [ ] **Reentrancy guards:** Apply checks-effects-interactions pattern
- [ ] **Authorization:** All sensitive functions call `require_auth()`
- [ ] **Emergency stops:** Provide a pause mechanism for critical vulnerabilities
- [ ] **Event emissions:** Every financial operation emits a descriptive event
- [ ] **Test coverage:** Include tests for rounding, edge cases, and attack scenarios
- [ ] **Formal verification:** For critical invariant properties (e.g., constant product formula)
