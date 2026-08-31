# Soulbound Token

This example demonstrates a **non-transferable (soulbound) token** in Soroban.
Once minted to an address the token is permanently bound to that holder —
transfer operations are intentionally disabled and will always panic.

Soulbound tokens are ideal for:

- **Verifiable credentials** — e.g. KYC attestations, certifications
- **Achievement badges** — e.g. "first 100 contributors" milestone
- **Identity anchors** — on-chain reputation or membership records
- **Access passes** — permissioned, non-tradable access tokens

For a standard, freely transferable token see
[`examples/token-transfer/`](../token-transfer/README.md).

---

## Features

| Function | Description |
|---|---|
| `initialize(admin, name, symbol, decimals)` | One-time setup; stores admin address and token metadata |
| `mint(admin, to, amount)` | Admin-only: issue tokens to a recipient |
| `burn(admin, from, amount)` | Admin-only: revoke tokens from a holder |
| `transfer(...)` | **Always panics** — transfers are disabled |
| `transfer_from(...)` | **Always panics** — delegated transfers are disabled |
| `balance(of)` | Query token balance of an address |
| `name()` / `symbol()` / `decimals()` | Token metadata |
| `total_supply()` | Current circulating supply |
| `admin()` | Return the administrator address |

---

## Contract Structure

### Storage Keys

```rust
pub enum DataKey {
    Balance(Address),   // Per-holder token balance
    Admin,              // Administrator address
    TotalSupply,        // Cumulative supply
    Name,               // Token name string
    Symbol,             // Short ticker symbol
    Decimals,           // Decimal places (usually 0)
}
```

### Error Codes

```rust
pub enum Error {
    Unauthorized = 1,       // Caller is not the admin
    InvalidAmount = 2,      // Zero or negative amount
    InsufficientBalance = 3,// Holder balance too low to burn
    AlreadyInitialized = 4, // initialize() called more than once
}
```

---

## Usage Examples

### Initialize

```rust
client.initialize(
    &admin,
    &String::from_str(&env, "Soroban Contributor Badge"),
    &String::from_str(&env, "SCB"),
    &0,
);
```

### Mint a Badge

```rust
// Only the admin can mint
client.mint(&admin, &alice, &1);
assert_eq!(client.balance(&alice), 1);
```

### Transfer Attempt (always panics)

```rust
// This will always panic — soulbound tokens cannot move
client.transfer(&alice, &bob, &1); // panics!
```

### Admin Revocation (burn)

```rust
// Admin can revoke/burn tokens
client.burn(&admin, &alice, &1);
assert_eq!(client.balance(&alice), 0);
```

---

## Running Tests

```bash
cargo test --package soulbound-token
```

Test coverage includes:

- ✅ Initialization and metadata storage
- ✅ Double-initialization rejection
- ✅ Admin-only minting (authorized and unauthorized cases)
- ✅ `transfer` always panics
- ✅ `transfer_from` always panics
- ✅ Transfer panics even with zero balance
- ✅ Admin burn (revocation)
- ✅ Unauthorized burn rejection
- ✅ Supply tracking (mint increments, burn decrements)
- ✅ Independent balances across multiple holders

---

## Security Considerations

1. **Admin is a single point of trust.** The admin can mint to any address and
   burn from any address. In production, consider using a multi-sig wallet or a
   DAO governance contract as the admin to decentralize control.

2. **No transfer path whatsoever.** Both `transfer` and `transfer_from` always
   panic. This is enforced at the contract level, not just the UI level.

3. **Burn = revocation.** The ability for the admin to burn tokens is
   equivalent to revoking a credential. Issuers should have a clear revocation
   policy documented off-chain.

4. **No approval mechanism.** Soulbound tokens intentionally omit `approve`
   and the allowance system to eliminate any indirect transfer route.
