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

## Best Practices

### Do's ✅

- Use `Result` for all fallible operations
- Define custom error enums with clear names
- Validate inputs before modifying state
- Use `checked_*` methods for arithmetic
- Test all error paths

### Don'ts ❌

- Don't use `unwrap()` on user inputs
- Don't ignore arithmetic overflow
- Don't modify state before validation
- Don't return generic errors
- Don't leak sensitive information in errors

## Resources

- [Error Handling Pattern](/docs/patterns/error-handling) - Comprehensive examples
- [Security Fundamentals](/docs/security/fundamentals) - Security best practices

## Next Steps

1. Review the [Error Handling Pattern](/docs/patterns/error-handling) for detailed examples
2. Study [Security Fundamentals](/docs/security/fundamentals) for security implications
3. Implement error handling in your contracts
4. Write comprehensive tests for all error paths
