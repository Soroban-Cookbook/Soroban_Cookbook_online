---
time: 25
sidebar_position: 5
title: Contract Testing Guide
description: Comprehensive guide to writing, structuring, and running tests for Soroban smart contracts. Learn unit testing patterns, helpers, mocking, and best practices.
image: /img/soroban-social-card.png
---

# Contract Testing Guide

Testing is essential for smart contract development. This guide covers test structure, patterns, helpers, mocking, and best practices for Soroban contracts.

## Test Structure

Soroban contracts use standard Rust testing with the `#[cfg(test)]` module pattern. Tests compile to native code during `cargo test` for fast feedback.

### Basic Test Module

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_example() {
        let env = Env::default();
        let contract_id = env.register(MyContract, ());
        let client = MyContractClient::new(&env, &contract_id);
        
        // Test assertions here
    }
}
```

Each test:
- Creates a fresh sandbox `Env::default()`
- Registers the contract with `env.register(ContractName, ())`
- Creates a client for contract interaction
- Runs assertions

## Unit Testing Examples

### Counter Contract

The counter contract demonstrates basic state management testing:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initial_value_is_zero() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_increment_increases_count() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.increment(), 1);
        assert_eq!(client.increment(), 2);
        assert_eq!(client.increment(), 3);
    }

    #[test]
    fn test_reset_returns_to_zero() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        client.increment();
        assert_eq!(client.get(), 2);

        client.reset();
        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_get_does_not_change_state() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        assert_eq!(client.get(), 1);
        assert_eq!(client.get(), 1); // Value unchanged
    }
}
```

**Key patterns:**
- Test one behavior per test function
- Use descriptive test names (`test_*`)
- Verify state before and after operations
- Test edge cases (initial state, zero values)

### Token Transfer Contract

Complex contracts benefit from test helpers and setup functions:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, TokenTransferClient<'static>) {
        let env = Env::default();
        env.mock_all_auths(); // Allow all operations without auth
        let contract_id = env.register(TokenTransfer, ());
        let client = TokenTransferClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn test_mint_increases_balance() {
        let (env, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        assert_eq!(client.balance(&alice), 500);
    }

    #[test]
    fn test_transfer_moves_tokens() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        client.transfer(&alice, &bob, &400);

        assert_eq!(client.balance(&alice), 600);
        assert_eq!(client.balance(&bob), 400);
    }

    #[test]
    fn test_initial_balance_is_zero() {
        let (env, client) = setup();
        let alice = Address::generate(&env);

        assert_eq!(client.balance(&alice), 0);
    }
}
```

**Key patterns:**
- Create a `setup()` helper for common initialization
- Use `Address::generate(&env)` to create test addresses
- Mock authentication with `env.mock_all_auths()`
- Test state consistency across operations

## Test Helpers and Utilities

### Address Generation

Generate unique test addresses:

```rust
let alice = Address::generate(&env);
let bob = Address::generate(&env);
```

### Authentication Mocking

Mock all authentication checks to bypass authorization in tests:

```rust
env.mock_all_auths();
```

This allows tests to invoke functions that require authorization without providing valid signatures.

### Setup Functions

Reduce boilerplate with setup helpers:

```rust
fn setup_with_balances() -> (Env, TokenTransferClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(TokenTransfer, ());
    let client = TokenTransferClient::new(&env, &contract_id);
    
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint(&alice, &1000);
    client.mint(&bob, &500);
    
    (env, client)
}
```

### Result Assertion Helpers

Use `try_*` methods to test error conditions:

```rust
#[test]
fn test_transfer_fails_on_insufficient_balance() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100);
    let result = client.try_transfer(&alice, &bob, &200);

    // Assert specific error was returned
    assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    
    // Verify state rolled back
    assert_eq!(client.balance(&alice), 100);
    assert_eq!(client.balance(&bob), 0);
}
```

## Error Testing

### Testing Expected Errors

Use `try_*` contract methods to test error paths:

```rust
#[test]
fn test_validation_errors() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100);

    // Test invalid amount (zero)
    let result = client.try_transfer(&alice, &bob, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    // Test invalid amount (negative)
    let result = client.try_transfer(&alice, &bob, &-50);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn test_self_transfer_is_rejected() {
    let (env, client) = setup();
    let alice = Address::generate(&env);

    client.mint(&alice, &100);
    let result = client.try_transfer(&alice, &alice, &50);
    assert_eq!(result, Err(Ok(Error::SelfTransfer)));
}
```

### Testing State Rollback

Verify that failed operations don't leave the contract in an inconsistent state:

```rust
#[test]
fn test_failed_transfer_does_not_change_state() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &100);
    let original_balance = client.balance(&alice);

    // Try invalid operation
    client.try_transfer(&alice, &bob, &200);

    // Verify balance unchanged
    assert_eq!(client.balance(&alice), original_balance);
}
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_increment_increases_count

# Run with output
cargo test -- --nocapture

# Run single-threaded (for debugging)
cargo test -- --test-threads=1 --nocapture
```

### Testing in CI

The repository includes a test script for CI:

```bash
scripts/test-examples.sh
```

This script runs `cargo test` for all examples in the `examples/` directory.

## Test Coverage

Check test coverage using `tarpaulin`:

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage
```

Aim for:
- **80%+ coverage** of contract logic
- **100% coverage** of error paths
- All public functions tested
- Edge cases covered

## Best Practices

### 1. Test One Behavior Per Test

Each test should verify a single behavior:

```rust
// Good: Tests one behavior
#[test]
fn test_increment_returns_new_value() {
    let (env, client) = setup();
    assert_eq!(client.increment(), 1);
}

// Avoid: Tests multiple behaviors
#[test]
fn test_many_things() {
    let (env, client) = setup();
    client.increment();
    client.increment();
    client.reset();
    // Hard to debug if this fails
}
```

### 2. Use Descriptive Test Names

Test names should describe what is being tested:

```rust
// Good
#[test]
fn test_transfer_fails_on_insufficient_balance() { }

// Avoid
#[test]
fn test_transfer_error() { }
```

### 3. Arrange-Act-Assert Pattern

Structure tests clearly:

```rust
#[test]
fn test_example() {
    // Arrange: Setup state
    let (env, client) = setup();
    let alice = Address::generate(&env);
    client.mint(&alice, &100);

    // Act: Perform the operation
    let result = client.transfer(&alice, &bob, &50);

    // Assert: Verify the outcome
    assert_eq!(result, Ok(()));
    assert_eq!(client.balance(&alice), 50);
}
```

### 4. Test Edge Cases

Always test boundary conditions:

```rust
#[test]
fn test_zero_and_negative_amounts() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    
    client.mint(&alice, &100);

    // Edge case: zero amount
    assert_eq!(client.try_transfer(&alice, &bob, &0), Err(Ok(Error::InvalidAmount)));

    // Edge case: negative amount
    assert_eq!(client.try_transfer(&alice, &bob, &-1), Err(Ok(Error::InvalidAmount)));
}
```

### 5. Test State Consistency

Verify contract invariants after operations:

```rust
#[test]
fn test_balances_sum_is_preserved() {
    let (env, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint(&alice, &1000);
    let total_before = client.balance(&alice) + client.balance(&bob);

    client.transfer(&alice, &bob, &300);
    let total_after = client.balance(&alice) + client.balance(&bob);

    // Total balance preserved (conservation law)
    assert_eq!(total_before, total_after);
}
```

### 6. Use Fixtures for Complex Setup

Fixtures reduce duplication in complex test scenarios:

```rust
struct TestContext {
    env: Env,
    client: TokenTransferClient<'static>,
    alice: Address,
    bob: Address,
}

impl TestContext {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TokenTransfer, ());
        let client = TokenTransferClient::new(&env, &contract_id);
        
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        
        client.mint(&alice, &1000);
        client.mint(&bob, &500);
        
        TestContext { env, client, alice, bob }
    }
}

#[test]
fn test_with_fixture() {
    let ctx = TestContext::new();
    // Use ctx.client, ctx.alice, ctx.bob
}
```

## Related Topics

- [Local Testing and Simulation](./local-testing-and-simulation.md) - Sandbox workflow
- [Testing Error Scenarios](./testing-errors.md) - Error testing patterns
- [Building and Compilation](./building-and-compilation.md) - Build system details

## Resources

- [Soroban SDK Testing Docs](https://docs.rs/soroban-sdk)
- [Example Contracts](https://github.com/stellar/soroban-examples)
- [Rust Testing Guide](https://doc.rust-lang.org/book/ch11-00-testing.html)
