---
title: Error Handling in Soroban
description: Understanding error handling in Soroban smart contracts
sidebar_position: 5
---

## Overview

Soroban uses Rust's type system for error handling, providing compile-time safety and explicit error propagation. Understanding error handling is crucial for building reliable smart contracts.

## Result Type

Soroban functions that can fail return `Result<T, E>`:

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    // Function implementation
}
```

- `Ok(value)` - Operation succeeded with a value
- `Err(error)` - Operation failed with an error

## Custom Error Types

Define custom error enums for your contract:

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Error {
    InsufficientBalance = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
}
```

### Error Code Requirements

- Each error must have a unique numeric code
- Codes must be positive integers
- Use descriptive names that indicate the failure reason

## Error Propagation

Use the `?` operator to propagate errors:

```rust
pub fn complex_operation(env: Env) -> Result<(), Error> {
    validate_input(&env)?;  // Returns early if validation fails
    execute_logic(&env)?;   // Returns early if execution fails
    Ok(())
}
```

## Automatic Rollback

When a contract returns an error or panics:

1. All state changes are automatically rolled back
2. No storage modifications persist
3. Events are not emitted
4. The transaction fails

```rust
pub fn atomic_operation(env: Env) -> Result<(), Error> {
    env.storage().set(&key1, &value1);  // This will rollback
    env.storage().set(&key2, &value2);  // This will rollback

    if some_condition {
        return Err(Error::Failed);  // All changes above are reverted
    }

    Ok(())
}
```

## Error Handling Patterns

### 1. Early Validation

Validate inputs before making state changes:

```rust
pub fn transfer(env: Env, amount: i128) -> Result<(), Error> {
    // Validate first
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    // Then modify state
    env.storage().set(&key, &value);
    Ok(())
}
```

### 2. Fallback Values

Use `unwrap_or` for safe defaults:

```rust
let balance = env.storage()
    .get(&user)
    .unwrap_or(0);  // Default to 0 if not found
```

### 3. Error Conversion

Convert between error types when needed:

```rust
fn internal_operation() -> Result<(), InternalError> {
    // Internal implementation
}

pub fn public_operation(env: Env) -> Result<(), Error> {
    internal_operation()
        .map_err(|_| Error::InternalFailure)?;
    Ok(())
}
```

## Best Practices

### ✅ Do

- Return `Result` for operations that can fail
- Use specific error types for different failures
- Validate inputs before state changes
- Test all error paths
- Document error conditions

### ❌ Don't

- Use `unwrap()` or `expect()` in production code
- Ignore errors with `let _ = ...`
- Use generic error messages
- Panic in normal error conditions
- Modify state before validation

## Error Testing

Always test error conditions:

```rust
#[test]
fn test_insufficient_balance() {
    let env = Env::default();
    let contract_id = env.register_contract(None, MyContract);
    let client = MyContractClient::new(&env, &contract_id);

    let result = client.try_transfer(&user, &100);

    assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
}
```

## Common Patterns

### Option to Result Conversion

```rust
let value = env.storage()
    .get(&key)
    .ok_or(Error::NotFound)?;
```

### Multiple Error Checks

```rust
pub fn validate(env: Env, amount: i128, user: Address) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    if !is_authorized(&env, &user) {
        return Err(Error::Unauthorized);
    }

    if get_balance(&env, &user) < amount {
        return Err(Error::InsufficientBalance);
    }

    Ok(())
}
```

### Conditional Error Handling

```rust
match try_primary_operation(&env) {
    Ok(result) => Ok(result),
    Err(_) => try_fallback_operation(&env),
}
```

## Error Events

Emit events for important errors to aid debugging:

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        env.events().publish(
            (Symbol::new(&env, "error"), Symbol::new(&env, "invalid_amount")),
            amount,
        );
        return Err(Error::InvalidAmount);
    }

    // Continue with transfer
    Ok(())
}
```

## Performance Considerations

- Error handling has minimal overhead
- Early returns prevent unnecessary computation
- Validation before state changes saves gas
- Use `Result` instead of panics for better performance

## Security Implications

Proper error handling is critical for security:

1. **Prevents partial state updates** - Automatic rollback ensures atomicity
2. **Explicit failure modes** - Clear error types prevent ambiguity
3. **Input validation** - Early checks prevent invalid states
4. **Authorization checks** - Explicit error for unauthorized access

## Related Topics

- [Error Handling Pattern](/docs/patterns/error-handling) - Error taxonomy and user-facing clarity
- [Error Recovery Pattern](/docs/patterns/error-recovery) - Comprehensive error handling examples
- [Storage](/docs/concepts/storage) - Understanding storage for rollback behavior
- [Authorization](/docs/concepts/authorization) - Auth-related error handling
- [Security Fundamentals](/docs/security/fundamentals) - Security best practices

## Additional Resources

- [Rust Error Handling Book](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [Soroban SDK Documentation](https://docs.rs/soroban-sdk/)
- [Stellar Developer Portal](https://developers.stellar.org/docs/build/smart-contracts)
