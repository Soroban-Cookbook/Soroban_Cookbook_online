---
title: Error Handling
sidebar_position: 5
description: Error handling and recovery strategies for Soroban smart contracts
---

# Error Handling

Learn how to handle errors effectively in Soroban smart contracts using Rust's type system and Soroban's built-in features.

## Why Error Handling Matters

Smart contracts operate in a high-stakes environment where errors can lead to:
- Failed transactions and wasted gas
- Lost or locked funds
- Inconsistent contract state
- Poor user experience

Proper error handling ensures your contract behaves predictably under all conditions.

## Rust Error Handling Basics

### Result Type

Soroban uses Rust's `Result<T, E>` type for operations that can fail:

```rust
pub fn transfer(env: Env, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    // Process transfer
    Ok(())
}
```

### Option Type

Use `Option<T>` for values that might not exist:

```rust
pub fn get_balance(env: Env, user: Address) -> Option<i128> {
    env.storage().persistent().get(&user)
}
```

## Error Handling Strategies

### 1. Custom Error Enums

Define domain-specific errors for better debugging:

```rust
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
    ContractPaused = 4,
}
```


### 2. Error Propagation

Use the `?` operator to propagate errors:

```rust
pub fn complex_operation(env: Env, user: Address) -> Result<(), Error> {
    Self::validate_user(&env, &user)?;
    Self::check_balance(&env, &user)?;
    Self::process_payment(&env, &user)?;
    Ok(())
}
```

### 3. Fallback Values

Provide defaults for non-critical operations:

```rust
pub fn get_config(env: Env, key: Symbol) -> String {
    env.storage()
        .instance()
        .get(&key)
        .unwrap_or_else(|| String::from_str(&env, "default"))
}
```

### 4. Safe Arithmetic

Always use checked operations:

```rust
// ❌ BAD: Can overflow
let total = balance + amount;

// ✅ GOOD: Overflow protection
let total = balance.checked_add(amount).ok_or(Error::Overflow)?;
```

## Transaction Rollback

Soroban automatically rolls back all state changes when:
- A contract returns an `Err` value
- A contract panics
- A contract runs out of gas

This means you don't need manual cleanup logic - failed transactions leave no trace.

```rust
pub fn atomic_swap(env: Env, user_a: Address, user_b: Address) -> Result<(), Error> {
    // If any operation fails, ALL changes are rolled back
    Self::deduct_balance(&env, &user_a, 100)?;
    Self::add_balance(&env, &user_b, 100)?;
    Ok(())
}
```

## Graceful Degradation

Design contracts to continue operating when non-critical features fail:

```rust
pub fn get_price_with_fallback(env: Env, asset: Symbol) -> i128 {
    // Try oracle first
    match Self::fetch_oracle_price(&env, &asset) {
        Ok(price) => price,
        Err(_) => {
            // Fallback to cached price
            Self::get_cached_price(&env, &asset)
        }
    }
}
```

## Error Recovery Patterns

### Pattern 1: Retry with Limits

```rust
pub fn execute_with_retry(env: Env, max_attempts: u32) -> Result<(), Error> {
    for attempt in 0..max_attempts {
        match Self::try_operation(&env) {
            Ok(_) => return Ok(()),
            Err(e) if Self::is_retryable(e) => continue,
            Err(e) => return Err(e),
        }
    }
    Err(Error::MaxRetriesExceeded)
}
```

### Pattern 2: Partial Success

```rust
pub fn process_batch(env: Env, items: Vec<Address>) -> (u32, u32) {
    let mut success = 0;
    let mut failed = 0;
    
    for item in items.iter() {
        match Self::process_item(&env, &item) {
            Ok(_) => success += 1,
            Err(_) => failed += 1,
        }
    }
    
    (success, failed)
}
```

### Pattern 3: Circuit Breaker

```rust
pub fn protected_call(env: Env) -> Result<(), Error> {
    if Self::is_circuit_open(&env) {
        return Err(Error::ServiceUnavailable);
    }
    
    match Self::risky_operation(&env) {
        Ok(result) => Ok(result),
        Err(e) => {
            Self::record_failure(&env);
            Err(e)
        }
    }
}
```

## Best Practices

### Do's ✅

- Use `Result` for all fallible operations
- Define custom error enums with clear names
- Validate inputs before modifying state
- Use `checked_*` methods for arithmetic
- Test all error paths
- Emit events for error conditions
- Provide helpful error messages

### Don'ts ❌

- Don't use `unwrap()` on user inputs
- Don't ignore arithmetic overflow
- Don't modify state before validation
- Don't return generic errors
- Don't leak sensitive information in errors
- Don't retry non-transient errors
- Don't use panics for expected errors

## Testing Error Handling

Always test error scenarios:

```rust
#[test]
fn test_error_handling() {
    let env = Env::default();
    let contract_id = env.register(MyContract, ());
    let client = MyContractClient::new(&env, &contract_id);
    
    // Test insufficient balance
    let result = client.try_transfer(&user, &100);
    assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    
    // Test invalid amount
    let result = client.try_transfer(&user, &-1);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    
    // Test overflow
    let result = client.try_add(&i128::MAX, &1);
    assert_eq!(result, Err(Ok(Error::Overflow)));
}
```

## Resources

- [Error Handling Pattern](/docs/patterns/error-handling) - Comprehensive examples
- [Security Fundamentals](/docs/security/fundamentals) - Security best practices
- [Soroban SDK Errors](https://docs.rs/soroban-sdk/latest/soroban_sdk/contracterror/index.html) - SDK documentation

## Next Steps

1. Review the [Error Handling Pattern](/docs/patterns/error-handling) for detailed examples
2. Study [Security Fundamentals](/docs/security/fundamentals) for security implications
3. Implement error handling in your contracts
4. Write comprehensive tests for all error paths

---

**Remember:** Good error handling is not just about preventing failures - it's about making failures understandable, recoverable, and safe.
