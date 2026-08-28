# Token Transfer with Allowance Mechanism

This example demonstrates a Soroban smart contract implementing basic token functionality including the ERC-20-like approve/transferFrom pattern.

## Features

- **Basic Token Operations:**
  - `mint(to, amount)`: Mint tokens to an address
  - `balance(of)`: Get token balance of an address
  - `transfer(from, to, amount)`: Transfer tokens directly

- **Allowance Mechanism:**
  - `approve(owner, spender, amount)`: Approve a spender to use tokens on behalf of owner
  - `allowance(owner, spender)`: Get current allowance
  - `transfer_from(spender, from, to, amount)`: Transfer tokens using allowance

## Contract Structure

### Data Storage

```rust
pub enum DataKey {
    Balance(Address),           // Balance of an address
    Allowance(Address, Address), // (owner, spender) allowance mapping
}
```

### Error Types

```rust
pub enum Error {
    InsufficientBalance = 1,    // Not enough tokens to transfer
    InvalidAmount = 2,          // Zero or negative amount
    SelfTransfer = 3,           // Cannot transfer to self
    InsufficientAllowance = 4,  // Not enough allowance for transfer_from
}
```

## Usage Examples

### Direct Transfer
```rust
// Mint 1000 tokens to Alice
client.mint(&alice, &1000);

// Alice transfers 400 tokens to Bob
client.transfer(&alice, &bob, &400);
```

### Delegated Transfer (Allowance)
```rust
// Alice mints 1000 tokens
client.mint(&alice, &1000);

// Alice approves Bob to spend 500 tokens
client.approve(&alice, &bob, &500);

// Bob transfers 300 tokens from Alice to Charlie
client.transfer_from(&bob, &alice, &charlie, &300);

// Bob's remaining allowance is now 200
assert_eq!(client.allowance(&alice, &bob), 200);
```

## Key Implementation Details

1. **Authentication**: Both `transfer` and `transfer_from` require proper authentication:
   - `transfer`: Requires auth from the `from` address
   - `transfer_from`: Requires auth from the `spender` address

2. **Allowance Management**: 
   - Allowances are decreased after each successful `transfer_from`
   - Setting allowance to 0 effectively revokes permission
   - Allowances can be overwritten with new `approve` calls

3. **Safety Checks**:
   - Validates sufficient balance before transfer
   - Validates sufficient allowance for delegated transfers  
   - Prevents zero/negative amount transfers
   - Prevents self-transfers

## Testing

The contract includes comprehensive tests covering:
- Basic token operations (mint, transfer, balance)
- Allowance functionality (approve, transfer_from, allowance queries)
- Error conditions (insufficient funds, invalid amounts, etc.)
- Edge cases (multiple spenders, allowance revocation, etc.)

Run tests with:
```bash
cargo test --package token-transfer
```

## Security Considerations

- **Allowance Race Condition**: This implementation uses the simple allowance pattern. In production, consider implementing the increase/decrease allowance pattern to avoid potential race conditions.
- **Authorization**: The contract properly uses Soroban's `require_auth()` to ensure only authorized parties can initiate transfers.
- **State Consistency**: All operations are atomic - if any validation fails, the entire transaction is reverted.