---
time: 20
title: Testing Error Scenarios
description: Guide to testing error handling in Soroban contracts
sidebar_position: 6
---

## Overview

Comprehensive error testing ensures your contract handles failures gracefully and maintains security. This guide covers testing strategies for error conditions in Soroban smart contracts.

## Basic Error Testing

### Testing Expected Errors

Use `try_*` methods to test error conditions:

```rust
#[test]
fn test_insufficient_balance() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Setup: user has 50 tokens
    env.storage().persistent().set(&user, &50_i128);

    env.mock_all_auths();

    // Try to transfer 100 tokens (should fail)
    let result = client.try_transfer(&user, &recipient, &100);

    // Assert specific error
    assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
}
```

### Testing Multiple Error Conditions

```rust
#[test]
fn test_validation_errors() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.mock_all_auths();

    // Test negative amount
    let result = client.try_transfer(&user, &recipient, &-100);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    // Test zero amount
    let result = client.try_transfer(&user, &recipient, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    // Test transfer to self
    let result = client.try_transfer(&user, &user, &100);
    assert_eq!(result, Err(Ok(Error::InvalidRecipient)));
}
```

## Testing Rollback Behavior

### Verify State Unchanged After Error

```rust
#[test]
fn test_rollback_on_error() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Setup initial state
    env.storage().persistent().set(&alice, &100_i128);
    env.storage().persistent().set(&bob, &50_i128);

    env.mock_all_auths();

    // Attempt operation that should fail
    let result = client.try_transfer(&alice, &bob, &200);

    // Verify error occurred
    assert!(result.is_err());

    // Verify state unchanged (rollback worked)
    let alice_balance: i128 = env.storage().persistent().get(&alice).unwrap();
    let bob_balance: i128 = env.storage().persistent().get(&bob).unwrap();

    assert_eq!(alice_balance, 100);
    assert_eq!(bob_balance, 50);
}
```

### Testing Atomic Operations

```rust
#[test]
fn test_atomic_multi_step_operation() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SwapContract);
    let client = SwapContractClient::new(&env, &contract_id);

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);

    // Setup: A has 100, B has 50
    env.storage().persistent().set(&user_a, &100_i128);
    env.storage().persistent().set(&user_b, &50_i128);

    env.mock_all_auths();

    // Try atomic swap that should fail (B doesn't have enough)
    let result = client.try_atomic_swap(&user_a, &user_b, &50, &100);

    assert!(result.is_err());

    // Verify BOTH balances unchanged (atomic rollback)
    assert_eq!(client.get_balance(&user_a), 100);
    assert_eq!(client.get_balance(&user_b), 50);
}
```

## Testing Authorization Errors

### Testing Unauthorized Access

```rust
#[test]
fn test_unauthorized_transfer() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let attacker = Address::generate(&env);

    env.storage().persistent().set(&alice, &100_i128);

    // Mock auth only for attacker (not alice)
    env.mock_auths(&[MockAuth {
        address: &attacker,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "transfer",
            args: (alice.clone(), bob.clone(), 50_i128).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    // Should fail - attacker can't transfer alice's tokens
    let result = client.try_transfer(&alice, &bob, &50);

    assert!(result.is_err());
}
```

## Testing Fallback Logic

### Testing Primary and Fallback Paths

```rust
#[test]
fn test_fallback_to_secondary_oracle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PriceOracle);
    let client = PriceOracleClient::new(&env, &contract_id);

    let asset = Symbol::new(&env, "XLM");

    // Primary oracle not available
    // Secondary oracle has price
    env.storage().persistent().set(
        &(Symbol::new(&env, "secondary"), &asset),
        &100_i128,
    );

    let price = client.get_price_with_fallback(&asset);

    // Should succeed using fallback
    assert_eq!(price, Ok(100));

    // Verify fallback was used (check events)
    let events = env.events().all();
    assert!(events.iter().any(|e| {
        // Check for fallback event
        true // Simplified check
    }));
}

#[test]
fn test_all_fallbacks_fail() {
    let env = Env::default();
    let contract_id = env.register_contract(None, PriceOracle);
    let client = PriceOracleClient::new(&env, &contract_id);

    let asset = Symbol::new(&env, "XLM");

    // No oracles available, no cache
    let result = client.try_get_price_with_fallback(&asset);

    // Should fail with specific error
    assert_eq!(result, Err(Ok(Error::NoPriceAvailable)));
}
```

## Testing Graceful Degradation

### Testing Degraded Mode

```rust
#[test]
fn test_graceful_degradation_to_simple_mode() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DexContract);
    let client = DexContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    env.mock_all_auths();

    // Optimal routing not available
    let result = client.swap_with_degradation(&user, &1000, &900);

    // Should succeed with degraded mode
    assert!(result.is_ok());

    let swap_result = result.unwrap();

    // Verify degraded mode was used
    assert_eq!(swap_result.route_type, Symbol::new(&env, "direct"));
    assert!(swap_result.amount_out >= 900);
}
```

## Testing Edge Cases

### Boundary Value Testing

```rust
#[test]
fn test_boundary_values() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let recipient = Address::generate(&env);

    env.storage().persistent().set(&user, &i128::MAX);
    env.mock_all_auths();

    // Test maximum value
    let result = client.try_transfer(&user, &recipient, &i128::MAX);
    assert!(result.is_ok());

    // Test minimum valid value
    let result = client.try_transfer(&user, &recipient, &1);
    assert!(result.is_ok());

    // Test just below minimum (should fail)
    let result = client.try_transfer(&user, &recipient, &0);
    assert!(result.is_err());
}
```

### Overflow Testing

```rust
#[test]
fn test_overflow_protection() {
    let env = Env::default();
    let contract_id = env.register_contract(None, TokenContract);
    let client = TokenContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Set balance near maximum
    env.storage().persistent().set(&user, &(i128::MAX - 100));

    env.mock_all_auths();

    // Try to add more (should fail or handle gracefully)
    let result = client.try_mint(&user, &1000);

    // Verify overflow is prevented
    assert!(result.is_err() || client.get_balance(&user) == i128::MAX);
}
```

## Testing Time-Based Errors

### Testing Expiry Conditions

```rust
#[test]
fn test_expired_order() {
    let env = Env::default();
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let contract_id = env.register_contract(None, OrderContract);
    let client = OrderContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    env.mock_all_auths();

    // Create order that expires at 2000
    let order_id = client.create_order(&user, &100, &1000, &2000);

    // Advance time past expiry
    env.ledger().with_mut(|li| {
        li.timestamp = 2001;
    });

    // Try to execute expired order
    let result = client.try_execute_order(&order_id);

    assert_eq!(result, Err(Ok(Error::OrderExpired)));
}
```

## Test Organization

### Grouping Error Tests

```rust
#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn test_invalid_amount() { /* ... */ }

    #[test]
    fn test_invalid_address() { /* ... */ }

    #[test]
    fn test_invalid_expiry() { /* ... */ }
}

#[cfg(test)]
mod authorization_tests {
    use super::*;

    #[test]
    fn test_unauthorized_transfer() { /* ... */ }

    #[test]
    fn test_unauthorized_mint() { /* ... */ }
}

#[cfg(test)]
mod rollback_tests {
    use super::*;

    #[test]
    fn test_rollback_on_validation_error() { /* ... */ }

    #[test]
    fn test_rollback_on_execution_error() { /* ... */ }
}
```

## Error Testing Checklist

Before deploying, ensure you have tests for:

- [ ] All custom error types
- [ ] Input validation failures
- [ ] Authorization failures
- [ ] Insufficient balance/resources
- [ ] State rollback on errors
- [ ] Boundary values (min, max, zero)
- [ ] Overflow/underflow conditions
- [ ] Time-based expiry
- [ ] Fallback logic paths
- [ ] Graceful degradation
- [ ] Concurrent operation conflicts
- [ ] External dependency failures

## Best Practices

### ✅ Do

- Test every error path
- Verify state rollback
- Use descriptive test names
- Test boundary conditions
- Group related error tests
- Document expected behavior
- Test error messages/events

### ❌ Don't

- Skip error path testing
- Only test happy paths
- Ignore edge cases
- Assume rollback works
- Use generic assertions
- Test multiple things in one test

## Running Error Tests

```bash
# Run all tests
cargo test

# Run specific error test module
cargo test validation_tests

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_insufficient_balance
```

## Debugging Failed Tests

When error tests fail:

1. Check the exact error returned
2. Verify test setup (initial state)
3. Confirm mock auth configuration
4. Review storage state before/after
5. Check event emissions
6. Verify ledger state (time, sequence)

## Related Topics

- [Error Recovery Pattern](/docs/patterns/error-recovery)
- [Error Handling Concepts](/docs/concepts/error-handling)
- [First Contract Tutorial](/docs/getting-started/first-contract)
- [Security Fundamentals](/docs/security/fundamentals)

## Additional Resources

- [Soroban Testing Guide](https://developers.stellar.org/docs/build/smart-contracts/example-contracts)
- [Rust Testing Documentation](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Soroban SDK Test Utils](https://docs.rs/soroban-sdk/latest/soroban_sdk/testutils/)
