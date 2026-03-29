---
sidebar_position: 6
title: Error Handling - Practical Guide
description: Step-by-step guide to implementing error handling in your contracts
---

# Error Handling - Practical Guide

A practical, step-by-step guide to implementing robust error handling in your Soroban smart contracts.

## Step 1: Define Your Error Types

Start by identifying all possible error conditions in your contract.

```rust
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // Group by category for better organization
    
    // Authorization (1-10)
    Unauthorized = 1,
    InsufficientAllowance = 2,
    
    // Balance (11-20)
    InsufficientBalance = 11,
    BalanceOverflow = 12,
    
    // Input (21-30)
    InvalidAmount = 21,
    InvalidAddress = 22,
    ZeroAmount = 23,
    
    // State (31-40)
    NotInitialized = 31,
    ContractPaused = 32,
}
```

**Tips:**
- Group errors by category (10 per group)
- Use descriptive names
- Start numbering from 1
- Leave gaps for future errors

## Step 2: Use Result Return Types

Change your function signatures to return `Result`:

```rust
// ❌ Before: No error handling
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
    // ...
}

// ✅ After: Explicit error handling
pub fn transfer(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), Error> {
    // ...
    Ok(())
}
```

## Step 3: Validate Inputs Early

Add validation at the start of your functions:

```rust
pub fn transfer(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), Error> {
    from.require_auth();
    
    // Validate ALL inputs before any state changes
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    
    if from == to {
        return Err(Error::InvalidAddress);
    }
    
    // Now safe to proceed...
    Ok(())
}
```

## Step 4: Use Checked Arithmetic

Replace all arithmetic operations with checked versions:

```rust
// ❌ Before: Unsafe arithmetic
let new_balance = balance + amount;
let fee = amount * fee_rate / 100;

// ✅ After: Safe arithmetic
let new_balance = balance
    .checked_add(amount)
    .ok_or(Error::BalanceOverflow)?;

let fee_product = amount
    .checked_mul(fee_rate)
    .ok_or(Error::Overflow)?;
let fee = fee_product
    .checked_div(100)
    .ok_or(Error::DivisionByZero)?;
```

## Step 5: Add Fallback Logic

Provide defaults for non-critical operations:

```rust
// ✅ Fallback to default value
pub fn get_config(env: Env, key: Symbol) -> String {
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| String::from_str(&env, "default"))
}

// ✅ Fallback to zero for balances
pub fn get_balance(env: Env, user: Address) -> i128 {
    env.storage()
        .persistent()
        .get(&user)
        .unwrap_or(0)
}
```

## Step 6: Implement Graceful Degradation

For batch operations, decide on failure strategy:

```rust
// Option A: Fail-fast (stop on first error)
pub fn process_all_or_nothing(env: Env, items: Vec<Address>) -> Result<(), Error> {
    for item in items.iter() {
        Self::process_item(&env, &item)?; // Stops on first error
    }
    Ok(())
}

// Option B: Partial success (continue on errors)
pub fn process_best_effort(env: Env, items: Vec<Address>) -> (u32, u32) {
    let mut success = 0;
    let mut failed = 0;
    
    for item in items.iter() {
        match Self::process_item(&env, &item) {
            Ok(_) => success += 1,
            Err(_) => failed += 1, // Log and continue
        }
    }
    
    (success, failed)
}
```

## Step 7: Leverage Automatic Rollback

Design operations to be atomic:

```rust
pub fn atomic_swap(
    env: Env,
    user_a: Address,
    user_b: Address,
    amount: i128,
) -> Result<(), Error> {
    user_a.require_auth();
    user_b.require_auth();
    
    // Validate everything first
    Self::validate_swap(&env, &user_a, &user_b, amount)?;
    
    // Execute atomically - if ANY step fails, ALL changes roll back
    let balance_a = Self::get_balance(&env, &user_a);
    let balance_b = Self::get_balance(&env, &user_b);
    
    Self::set_balance(&env, &user_a, balance_a - amount);
    Self::set_balance(&env, &user_b, balance_b + amount);
    
    Ok(())
}
```

## Step 8: Add Error Logging

Emit events for error conditions:

```rust
pub fn risky_operation(env: Env) -> Result<(), Error> {
    match Self::try_operation(&env) {
        Ok(result) => Ok(result),
        Err(e) => {
            // Log error for debugging
            env.events().publish(
                (Symbol::new(&env, "operation_failed"),),
                (e as u32, env.ledger().timestamp())
            );
            Err(e)
        }
    }
}
```

## Step 9: Write Error Tests

Test every error path:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insufficient_balance() {
        let env = Env::default();
        let contract_id = env.register(MyContract, ());
        let client = MyContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        
        // Should return InsufficientBalance error
        let result = client.try_transfer(&user, &Address::generate(&env), &100);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }
    
    #[test]
    fn test_invalid_amount() {
        let env = Env::default();
        let contract_id = env.register(MyContract, ());
        let client = MyContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        
        // Should return InvalidAmount error
        let result = client.try_transfer(&user, &Address::generate(&env), &-1);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }
    
    #[test]
    fn test_overflow() {
        let env = Env::default();
        let contract_id = env.register(MyContract, ());
        let client = MyContractClient::new(&env, &contract_id);
        
        // Should return Overflow error
        let result = client.try_safe_add(&i128::MAX, &1);
        assert_eq!(result, Err(Ok(Error::Overflow)));
    }
}
```

## Step 10: Document Error Behavior

Add comments explaining error conditions:

```rust
/// Transfer tokens from one account to another.
///
/// # Arguments
/// * `from` - Source address (must authorize)
/// * `to` - Destination address
/// * `amount` - Amount to transfer (must be positive)
///
/// # Errors
/// * `Error::Unauthorized` - Caller is not authorized
/// * `Error::InvalidAmount` - Amount is zero or negative
/// * `Error::InsufficientBalance` - Sender has insufficient balance
/// * `Error::BalanceOverflow` - Recipient balance would overflow
///
/// # Returns
/// * `Ok(())` - Transfer successful
pub fn transfer(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), Error> {
    // Implementation...
}
```

## Common Scenarios

### Scenario 1: Token Transfer

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    // 1. Authorization
    from.require_auth();
    
    // 2. Input validation
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    
    // 3. Balance check
    let balance = Self::get_balance(&env, &from);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }
    
    // 4. Safe arithmetic
    let new_from = balance.checked_sub(amount).ok_or(Error::Underflow)?;
    let to_balance = Self::get_balance(&env, &to);
    let new_to = to_balance.checked_add(amount).ok_or(Error::BalanceOverflow)?;
    
    // 5. Update state
    Self::set_balance(&env, &from, new_from);
    Self::set_balance(&env, &to, new_to);
    
    Ok(())
}
```

### Scenario 2: Configuration with Defaults

```rust
pub fn get_setting(env: Env, key: Symbol) -> String {
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| Self::default_setting(&env, &key))
}

fn default_setting(env: &Env, key: &Symbol) -> String {
    match key.to_string().as_str() {
        "max_supply" => String::from_str(env, "1000000"),
        "decimals" => String::from_str(env, "7"),
        _ => String::from_str(env, ""),
    }
}
```

### Scenario 3: External Service with Fallback

```rust
pub fn get_price(env: Env, asset: Symbol) -> i128 {
    // Try external oracle
    match Self::fetch_oracle_price(&env, &asset) {
        Ok(price) => price,
        Err(_) => {
            // Fallback to cached price
            env.events().publish(
                (Symbol::new(&env, "using_cached_price"),),
                asset.clone()
            );
            Self::get_cached_price(&env, &asset)
        }
    }
}
```

### Scenario 4: Multi-Step Operation

```rust
pub fn complex_workflow(env: Env, user: Address) -> Result<(), Error> {
    user.require_auth();
    
    // Chain operations - any failure rolls back everything
    Self::validate_user(&env, &user)?;
    Self::reserve_resources(&env, &user)?;
    Self::execute_operation(&env, &user)?;
    Self::finalize(&env, &user)?;
    
    Ok(())
}
```

## Checklist for Your Contract

Use this checklist when implementing error handling:

### Error Definition
- [ ] Custom error enum defined
- [ ] Errors grouped by category
- [ ] Descriptive error names
- [ ] Error codes assigned

### Function Signatures
- [ ] All fallible functions return `Result`
- [ ] Error type is consistent
- [ ] Return types documented

### Input Validation
- [ ] All inputs validated
- [ ] Validation happens before state changes
- [ ] Clear error messages for invalid inputs

### Arithmetic Safety
- [ ] All additions use `checked_add`
- [ ] All subtractions use `checked_sub`
- [ ] All multiplications use `checked_mul`
- [ ] All divisions check for zero and use `checked_div`

### Authorization
- [ ] `require_auth()` on sensitive functions
- [ ] Authorization checked before state changes
- [ ] Proper error returned for unauthorized access

### State Management
- [ ] State changes are atomic
- [ ] Validation before modification
- [ ] Leverage automatic rollback

### Fallback Logic
- [ ] Sensible defaults for non-critical operations
- [ ] Fallback values documented
- [ ] Fallback behavior tested

### Error Logging
- [ ] Events emitted for errors
- [ ] Sufficient context in events
- [ ] No sensitive data in logs

### Testing
- [ ] All error paths tested
- [ ] Edge cases covered
- [ ] Overflow/underflow tested
- [ ] Invalid input tested

### Documentation
- [ ] Error conditions documented
- [ ] Function behavior explained
- [ ] Examples provided

## Next Steps

1. Review your existing contracts
2. Identify error-prone operations
3. Apply patterns from this guide
4. Write tests for all error paths
5. Document error behavior

## Resources

- [Error Handling Pattern](/docs/patterns/error-handling) - Comprehensive patterns
- [Complete Example](/docs/patterns/error-handling-example) - Full contract
- [Cheat Sheet](/docs/patterns/error-handling-cheatsheet) - Quick reference
- [Core Concepts](/docs/concepts/error-handling) - Fundamentals
- [Security Guide](/docs/security/fundamentals) - Security implications

---

**Start small:** Pick one function, add error handling, test it, then move to the next. Incremental improvements are better than trying to fix everything at once.
