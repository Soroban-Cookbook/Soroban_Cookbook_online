---
time: 25
sidebar_position: 5.5
title: Local Testing and Simulation
description: Test and simulate your Soroban contracts locally before deploying to testnet. Covers sandbox invocation, unit testing, state inspection, and iterative development workflows.
image: /img/soroban-social-card.png
---

Test your Soroban contracts in a local sandbox environment before deploying to testnet. This guide covers the complete local development workflow — from unit tests and CLI sandbox invocation to state inspection and debugging loops.

## Prerequisites

- [Soroban CLI installed](./setup.md) (`stellar --version`)
- [Contract project initialized](./first-contract.md) or use the counter example from this repo
- Rust toolchain with `wasm32-unknown-unknown` target

## Local Development Workflow

The local testing loop follows this flow:

```
Write/Edit Code → Build → Run Tests → Inspect State → Fix → Repeat
                                          ↓
                                  Deploy to Testnet
```

Every iteration happens entirely on your machine — no network connection, no testnet funds, no waiting for ledgers.

## Unit Testing with `cargo test`

Soroban contracts compile to native code during `cargo test`, giving you fast feedback without WASM compilation.

### Basic Test Setup

Every test starts with a sandbox `Env`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initial_value() {
        let env = Env::default();                // fresh sandbox
        let contract_id = env.register(Counter, ());  // deploy in sandbox
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
    }
}
```

`Env::default()` creates a sandbox with a simulated ledger. Contracts registered here exist only in memory — no network involved.

### Running Tests

```bash
# Run all tests
cargo test

# Run a specific test
cargo test test_initial_value

# Run tests with stdout output visible
cargo test -- --nocapture

# Run tests single-threaded (useful when debugging)
cargo test -- --test-threads=1 --nocapture
```

### Testing State Changes

Test sequences of operations and verify state after each step:

```rust
#[test]
fn test_increment_sequence() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    assert_eq!(client.increment(), 1);
    assert_eq!(client.increment(), 2);
    assert_eq!(client.increment(), 3);
    assert_eq!(client.get(), 3);      // read-only check

    client.reset();
    assert_eq!(client.get(), 0);      // verify reset
}
```

Each test gets its own isolated `Env` — state from one test never leaks into another.

## Soroban CLI Sandbox

Beyond unit tests, the Soroban CLI provides a sandbox mode that invokes your compiled WASM locally, giving you the same execution path that runs on testnet.

### Building for the Sandbox

First, build the optimised WASM artifact:

```bash
stellar contract build
```

### Invoking in the Sandbox

Use `--local` to run against the local sandbox instead of a network:

```bash
stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm \
  --local \
  -- increment
```

Expected output:

```
1
```

Each `--local` invocation starts with a fresh sandbox. State is not persisted between calls.

### Sandbox vs Testnet Invocation

| Aspect           | `--local` sandbox     | `--network testnet`     |
| ---------------- | --------------------- | ----------------------- |
| Network required | No                    | Yes                     |
| Fees charged     | No                    | Yes (testnet XLM)       |
| State persists   | Per invocation        | Indefinitely            |
| Speed            | Instant               | ~3-5 seconds per ledger |
| Ideal for        | Iterative development | Final validation        |

### Multi-step Local Simulation

Chain operations to simulate a real session:

```bash
# Increment multiple times
stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm \
  --local \
  -- increment

stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm \
  --local \
  -- increment

# Read current value
stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm \
  --local \
  -- get
```

### Inspecting Contract ABI Locally

Verify the contract interface before deploying:

```bash
stellar contract inspect \
  --wasm target/wasm32-unknown-unknown/release/counter.optimized.wasm
```

Expected output:

```
Functions:
  increment() -> u32
  get() -> u32
  reset() -> ()
```

## Debugging Techniques

### Print Output in Tests

Use `println!` in tests and run with `--nocapture`:

```rust
#[test]
fn test_with_debug_output() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    let result = client.increment();
    println!("After increment: {}", result);

    let state = client.get();
    println!("Current state: {}", state);

    assert_eq!(state, 1);
}
```

```bash
cargo test test_with_debug_output -- --nocapture
```

### Inspecting Events

Emit events in your contract to trace execution:

```rust
use soroban_sdk::{symbol_short, Symbol};

pub fn increment(env: Env) -> u32 {
    let count = env.storage().instance()
        .get(&symbol_short!("count"))
        .unwrap_or(0);
    let new_count = count + 1;
    env.storage().instance().set(&symbol_short!("count"), &new_count);

    // Emit event for observability
    env.events().publish(
        (symbol_short!("increment"),),
        new_count,
    );

    new_count
}
```

In tests, inspect emitted events:

```rust
#[test]
fn test_events_emitted() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    client.increment();

    let events = env.events().all();
    assert_eq!(events.len(), 1);

    let (contract, topics, data) = &events[0];
    assert_eq!(*contract, contract_id);
    assert_eq!(topics, &(symbol_short!("increment"),).into_val(&env));
    assert_eq!(data, 1_u32.into_val(&env));
}
```

### Using `RUST_BACKTRACE`

When a test panics, get the full backtrace:

```bash
RUST_BACKTRACE=1 cargo test
```

For debug builds of the contract itself, use `RUST_BACKTRACE=full`:

```bash
RUST_BACKTRACE=full cargo test -- --nocapture
```

### Fast Iteration with `cargo watch`

Automatically re-run tests when code changes:

```bash
# Install cargo-watch
cargo install cargo-watch

# Auto-test on every save
cargo watch -x test

# Auto-test with output
cargo watch -x "test -- --nocapture"
```

## State Inspection

### Direct Storage Access in Tests

Read and verify contract storage directly from test code:

```rust
#[test]
fn test_storage_inspection() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    client.increment();

    // Read storage directly
    let count: u32 = env.storage().instance()
        .get(&symbol_short!("count"))
        .unwrap_or(0);
    assert_eq!(count, 1);
}
```

### Snapshot Testing

Create snapshot files to track state changes across test runs. The `test_snapshots` directory stores golden files:

```rust
#[test]
fn test_snapshot() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    client.increment();

    // Snapshot the current state
    let snapshot = env.ledger().get();
    // Compare against stored snapshot in test_snapshots/
}
```

Soroban generates snapshot files under `test_snapshots/` when `SOROBAN_SNAPSHOT_DIR` is set or using the testutils feature. This lets you diff state changes across commits.

### State Table Inspection

For contracts with complex state, log the full storage at key points:

```rust
fn dump_storage(env: &Env) {
    // This is a conceptual helper — actual keys depend on your contract
    let keys = vec![&env, symbol_short!("count")];
    for key in keys.iter() {
        if let Some(val) = env.storage().instance().get(&key) {
            let value: u32 = val;
            println!("  {} = {:?}", key, value);
        }
    }
}
```

## Simulating Testnet Conditions

### Ledger Configuration

Control ledger state to simulate different conditions:

```rust
#[test]
fn test_ledger_configuration() {
    let env = Env::default();

    // Set specific ledger timestamp
    env.ledger().with_mut(|li| {
        li.timestamp = 1700000000;
        li.sequence_number = 100000;
        li.max_entry_ttl = 31104000;  // ~1 year
    });

    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    // Contract sees the configured ledger state
    // ...
}
```

### Mocking Authorization

Soroban requires authorization for certain operations. In tests, use `mock_all_auths()` to bypass signature verification:

```rust
#[test]
fn test_authorized_operation() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    env.mock_all_auths();  // Skip real signature checks

    // All authorization checks pass
    client.increment();
}
```

For more granular control, mock specific auths:

```rust
#[test]
fn test_specific_auth() {
    let env = Env::default();
    let contract_id = env.register(Counter, ());
    let admin = Address::generate(&env);

    env.mock_auths(&[MockAuth {
        address: &admin,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "admin_operation",
            args: (admin.clone(),).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    let client = CounterClient::new(&env, &contract_id);
    // admin_operation(&admin) will succeed for this specific caller
}
```

### Simulating Multiple Accounts

Generate and use multiple addresses to test multi-user scenarios:

```rust
#[test]
fn test_multi_user_scenario() {
    let env = Env::default();
    env.mock_all_auths();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    // Alice and Bob interact independently
    client.increment();
    client.increment();
    assert_eq!(client.get(), 2);
}
```

### Testing with Realistic Fee Budgets

Set resource limits to simulate testnet constraints:

```rust
#[test]
fn test_with_budget() {
    let env = Env::default();

    // Set CPU and memory limits matching testnet
    env.budget().reset_unlimited();
    env.budget().set_cpu_limit(100_000_000);
    env.budget().set_memory_limit(100_000_000);

    let contract_id = env.register(Counter, ());
    let client = CounterClient::new(&env, &contract_id);

    let result = client.try_increment();
    assert!(result.is_ok());

    // Check how much budget was consumed
    let cpu_remaining = env.budget().get_cpu_remaining();
    println!("CPU remaining: {}", cpu_remaining);
}
```

## Iterative Development Example

This end-to-end walkthrough demonstrates the full local development cycle.

### 1. Initialize the Contract

```bash
stellar contract init my-counter && cd my-counter
```

### 2. Review the Default Code

`src/lib.rs` contains a basic increment contract. Replace it with:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

const COUNTER: Symbol = symbol_short!("count");

#[contract]
pub struct Counter;

#[contractimpl]
impl Counter {
    pub fn increment(env: Env) -> u32 {
        let count: u32 = env.storage().instance()
            .get(&COUNTER)
            .unwrap_or(0);
        let new_count = count + 1;
        env.storage().instance().set(&COUNTER, &new_count);

        env.events().publish((symbol_short!("inc"),), new_count);
        new_count
    }

    pub fn get(env: Env) -> u32 {
        env.storage().instance()
            .get(&COUNTER)
            .unwrap_or(0)
    }

    pub fn reset(env: Env) {
        env.storage().instance().set(&COUNTER, &0_u32);
    }
}
```

### 3. Write Tests

Add tests to `src/lib.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Events;
    use soroban_sdk::Env;

    #[test]
    fn test_initial_state() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_increment() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.increment(), 1);
        assert_eq!(client.increment(), 2);
        assert_eq!(client.increment(), 3);
    }

    #[test]
    fn test_reset() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        client.increment();
        client.reset();

        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_events() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();

        let events = env.events().all();
        assert_eq!(events.len(), 1);

        let (id, topics, data) = &events[0];
        assert_eq!(topics, &(symbol_short!("inc"),).into_val(&env));
        assert_eq!(*data, 1_u32.into_val(&env));
    }
}
```

### 4. Run Tests

```bash
cargo test
```

Expected output:

```
running 4 tests
test tests::test_events ... ok
test tests::test_initial_state ... ok
test tests::test_increment ... ok
test tests::test_reset ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### 5. Build for Sandbox

```bash
stellar contract build
```

### 6. Test with CLI Sandbox

```bash
stellar contract invoke \
  --wasm target/wasm32-unknown-unknown/release/my_counter.optimized.wasm \
  --local \
  -- increment
```

### 7. Introduce a Bug and Catch It

Modify `increment` to accidentally return the old value:

```rust
pub fn increment(env: Env) -> u32 {
    let count: u32 = env.storage().instance()
        .get(&COUNTER)
        .unwrap_or(0);
    let new_count = count + 1;
    env.storage().instance().set(&COUNTER, &new_count);
    count  // BUG: returning old value instead of new
}
```

Run tests:

```bash
cargo test
```

The `test_increment` test fails:

```
test tests::test_increment ... FAILED

failures:
---- tests::test_increment stdout ----
thread 'tests::test_increment' panicked at src/lib.rs:54:9:
assertion `left == right` failed
  left: 0
 right: 1
```

The test caught the regression instantly — no testnet deploy needed.

### 8. Fix and Verify

Fix the bug, re-run tests, then verify with the sandbox:

```bash
cargo test                                    # fast feedback
cargo test -- --nocapture                     # see debug output
stellar contract build                        # rebuild WASM
stellar contract invoke --wasm ... --local -- increment  # sandbox check
```

## Bridging to Testnet

Once local tests pass consistently, the transition to testnet is straightforward. The main differences are:

| Local                    | Testnet                                |
| ------------------------ | -------------------------------------- |
| `Env::default()` sandbox | Live Stellar testnet                   |
| `--local` flag           | `--network testnet --source <account>` |
| Zero fees                | Testnet XLM required                   |
| No account needed        | Funded account required                |
| Instant execution        | ~3-5 second ledger closes              |
| Isolated per run         | Persistent state                       |

### Progression Checklist

- [ ] `cargo test` passes all tests
- [ ] `stellar contract build` produces an optimised WASM
- [ ] `stellar contract inspect --wasm ...` shows the expected ABI
- [ ] CLI sandbox invocations produce correct results
- [ ] Event emissions are verified in tests
- [ ] Authorization logic is tested (if applicable)
- [ ] Edge cases and error paths are covered
- [ ] Budget/resource usage is within limits

When you are ready, proceed to:

- [Deploy to Testnet](./deploy-testnet.md) — put your contract on the live testnet
- [Contract Interaction](./contract-interaction.md) — invoke functions on deployed contracts

## Additional Resources

- [Soroban SDK Testutils](https://docs.rs/soroban-sdk/latest/soroban_sdk/testutils/index.html)
- [Soroban CLI Reference](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Rust Testing Documentation](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Debugging Guide](./debugging.md)
- [Testing Error Scenarios](./testing-errors.md)
