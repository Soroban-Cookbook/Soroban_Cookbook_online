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
