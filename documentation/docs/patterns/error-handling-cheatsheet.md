---
sidebar_position: 5
title: Error Handling Cheat Sheet
description: Quick reference for error handling patterns in Soroban
---

# Error Handling Cheat Sheet

Quick reference for implementing robust error handling in Soroban smart contracts.

## Define Custom Errors

```rust
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
}
```

## Return Result Types

```rust
pub fn transfer(env: Env, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}
```

## Validate Inputs

```rust
// ✅ GOOD: Validate first
pub fn process(env: Env, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    // Process...
    Ok(())
}

// ❌ BAD: Process then validate
pub fn process(env: Env, amount: i128) -> Result<(), Error> {
    Self::update_state(&env); // State changed!
    if amount <= 0 {
        return Err(Error::InvalidAmount); // Too late!
    }
    Ok(())
}
```

## Safe Arithmetic

```rust
// ❌ BAD: Can overflow
let total = balance + amount;

// ✅ GOOD: Overflow protection
let total = balance.checked_add(amount).ok_or(Error::Overflow)?;

// ✅ GOOD: All operations
let sum = a.checked_add(b).ok_or(Error::Overflow)?;
let diff = a.checked_sub(b).ok_or(Error::Underflow)?;
let product = a.checked_mul(b).ok_or(Error::Overflow)?;
let quotient = a.checked_div(b).ok_or(Error::DivisionByZero)?;
```

## Propagate Errors

```rust
// ✅ Use ? operator
pub fn workflow(env: Env, user: Address) -> Result<(), Error> {
    Self::step1(&env, &user)?;
    Self::step2(&env, &user)?;
    Self::step3(&env, &user)?;
    Ok(())
}
```

## Fallback Values

```rust
// ✅ Provide defaults
pub fn get_config(env: Env, key: Symbol) -> String {
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| String::from_str(&env, "default"))
}

// ✅ Fallback to zero
pub fn get_balance(env: Env, user: Address) -> i128 {
    env.storage().persistent().get(&user).unwrap_or(0)
}
```

## Graceful Degradation

```rust
// ✅ Continue on partial failure
pub fn process_batch(env: Env, items: Vec<Address>) -> (u32, u32) {
    let mut success = 0;
    let mut failed = 0;
    
    for item in items.iter() {
        match Self::process(&env, &item) {
            Ok(_) => success += 1,
            Err(_) => failed += 1, // Log but continue
        }
    }
    
    (success, failed)
}
```

## Transaction Rollback

```rust
// ✅ Automatic rollback on error
pub fn atomic_operation(env: Env) -> Result<(), Error> {
    Self::update_state_1(&env)?; // If this fails...
    Self::update_state_2(&env)?; // ...or this fails...
    Self::update_state_3(&env)?; // ...or this fails...
    Ok(())
    // ALL changes are rolled back automatically
}
```

## Handle External Calls

```rust
// ✅ Fallback for external failures
pub fn get_price(env: Env, asset: Symbol) -> i128 {
    match Self::fetch_oracle(&env, &asset) {
        Ok(price) => price,
        Err(_) => Self::get_cached_price(&env, &asset), // Fallback
    }
}
```

## Emit Error Events

```rust
// ✅ Log errors for debugging
pub fn risky_operation(env: Env) -> Result<(), Error> {
    match Self::try_operation(&env) {
        Ok(result) => Ok(result),
        Err(e) => {
            env.events().publish(
                (Symbol::new(&env, "operation_failed"),),
                e as u32
            );
            Err(e)
        }
    }
}
```

## Common Validations

```rust
// Amount validation
if amount <= 0 {
    return Err(Error::InvalidAmount);
}

// Balance check
if balance < amount {
    return Err(Error::InsufficientBalance);
}

// Zero address check
if to == from {
    return Err(Error::InvalidAddress);
}

// Time validation
if expiry <= env.ledger().timestamp() {
    return Err(Error::Expired);
}

// Initialization check
if !Self::is_initialized(&env) {
    return Err(Error::NotInitialized);
}

// Pause check
if Self::is_paused(&env) {
    return Err(Error::ContractPaused);
}
```

## Testing Errors

```rust
#[test]
fn test_error_case() {
    let env = Env::default();
    let contract_id = env.register(MyContract, ());
    let client = MyContractClient::new(&env, &contract_id);
    
    // Use try_* methods to test errors
    let result = client.try_transfer(&user, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}
```

## Quick Decision Tree

```
Is the error expected?
├─ Yes → Use Result<T, Error>
└─ No → Use panic! (invariant violation)

Should operation continue on error?
├─ Yes → Graceful degradation (log and continue)
└─ No → Return error immediately

Is there a sensible default?
├─ Yes → Use unwrap_or() or unwrap_or_else()
└─ No → Return Option or Result

Can the operation be retried?
├─ Yes → Implement retry logic
└─ No → Return error to caller
```

## Anti-Patterns to Avoid

```rust
// ❌ DON'T: Unwrap user inputs
let amount = params.get("amount").unwrap();

// ✅ DO: Handle missing values
let amount = params.get("amount").ok_or(Error::MissingAmount)?;

// ❌ DON'T: Ignore overflow
let total = a + b;

// ✅ DO: Check overflow
let total = a.checked_add(b).ok_or(Error::Overflow)?;

// ❌ DON'T: Generic errors
return Err(Error::Failed);

// ✅ DO: Specific errors
return Err(Error::InsufficientBalance);

// ❌ DON'T: Modify state before validation
Self::update_balance(&env, &user, amount);
if amount <= 0 {
    return Err(Error::InvalidAmount);
}

// ✅ DO: Validate before state changes
if amount <= 0 {
    return Err(Error::InvalidAmount);
}
Self::update_balance(&env, &user, amount);
```

## Resources

- [Error Handling Pattern](/docs/patterns/error-handling) - Detailed patterns
- [Complete Example](/docs/patterns/error-handling-example) - Full contract
- [Error Handling Concept](/docs/concepts/error-handling) - Core concepts
- [Security Fundamentals](/docs/security/fundamentals) - Security best practices

---

**Remember:** Good error handling makes your contracts robust, debuggable, and user-friendly.
