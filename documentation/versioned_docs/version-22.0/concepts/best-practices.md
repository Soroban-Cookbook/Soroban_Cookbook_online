---
sidebar_position: 2
title: Best Practices
description: Essential do's and don'ts for Soroban smart contract development — safe patterns, input validation, and a production-ready contract checklist.
---

# Soroban Best Practices

title: Soroban Best Practices
description: Practical do/don't rules and checklists for production-ready Soroban contracts.
sidebar_position: 3
---

A concise, beginner-friendly guide for new Soroban developers. Use this page to learn practical do/don't rules, common anti-patterns, and a reusable checklist for your first production-ready contract.

## Do: Start with a safe contract structure

- Use `soroban contract init` to create a standard project layout.
- Pin the `soroban-sdk` version in `Cargo.toml` so your contract stays stable across builds.
- Keep your contract code `#![no_std]` and avoid platform-specific Rust APIs.

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn greet(env: Env, name: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}
```

## Don't: Trust user-provided values without validation

- Do not use `unwrap()` or `expect()` in contract entry points.
- Do not store secret keys or passwords in contract storage.
- Do not assume every call comes from a trusted source.

### Example anti-pattern

```rust
pub fn set_value(env: Env, value: i32) {
    let safe = value.checked_add(1).unwrap();
    env.storage().set(&Symbol::short("value"), &safe);
}
```

This is unsafe because `unwrap()` can abort the contract if the input overflows.

## Do: Use explicit authorization and access control

Validate the caller using `env.invoker()` and compare it to a stored admin or owner key.

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol};

const ADMIN: Symbol = symbol_short!("admin");

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn set_threshold(env: Env, threshold: i32) {
        let invoker = env.invoker();
        let admin = env.storage().get::<Symbol, Address>(&ADMIN).unwrap();
        if invoker != admin {
            panic!("unauthorized")
        }
        env.storage().set(&Symbol::short("threshold"), &threshold);
    }
}
```

### Authorization anti-pattern

- Wrong: relying on `env.source_account()` or reading caller data from arguments.
- Better: use `env.invoker()` consistently for contract-level authorization.

## Do: Store data with typed keys and stable layout

- Use `Symbol` or typed wrappers for keys.
- Avoid raw string keys scattered across the contract.
- Prefer separate storage entries for each value rather than a giant untyped map.

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol};

const BALANCE: Symbol = symbol_short!("balance");

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn balance_of(env: Env, user: Address) -> i128 {
        env.storage().get(&Symbol::short("balance:").append(&user)).unwrap_or(0)
    }
}
```

## Don't: Write expensive loops or grow unbounded state

- Avoid iterating over large lists in contract entry points.
- Avoid storing unbounded arrays, logs, or bulk data in contract storage.
- Prefer indexing by account or token ID and fetching only the needed item.

## Do: Return clear errors and test them

- Define a contract error type and use `Result` for fallible operations.
- Write unit tests that cover both success and failure cases.

```rust
use soroban_sdk::{contract, contractimpl, Env, Symbol, contracterror};

#[contracterror]
enum ContractError {
    Unauthorized,
    InsufficientFunds,
}

#[contract]
pub struct BankContract;

#[contractimpl]
impl BankContract {
    pub fn withdraw(env: Env, amount: i128) -> Result<(), ContractError> {
        let balance: i128 = env.storage().get(&Symbol::short("balance")).unwrap_or(0);
        if amount > balance {
            return Err(ContractError::InsufficientFunds);
        }
        env.storage().set(&Symbol::short("balance"), &(balance - amount));
        Ok(())
    }
}
```

### Error handling anti-pattern

- Wrong: letting contract code panic on business logic failures.
- Better: return `Result` when the caller can recover or retry.

## Do: Build and test locally before deploying

- Run `cargo test` for unit tests.
- Run `soroban contract build` to verify compilation to Wasm.
- Use testnet deployment for integration checks before mainnet.

```bash
cargo test
soroban contract build
soroban network connect testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/my_contract.wasm
```

## Don't: Skip the contract checklist

A production-ready Soroban contract should pass more than just compilation. Use the checklist below every time you move from prototype to deployed code.

## Production-Ready Contract Checklist

- [ ] `soroban-sdk` version is pinned in `Cargo.toml`
- [ ] Contract compiles successfully with `soroban contract build`
- [ ] Core entry points are small, deterministic, and gas-friendly
- [ ] Authorization checks use `env.invoker()` or explicit signer validation
- [ ] Storage uses typed keys and avoids unbounded collections
- [ ] No secret keys, passwords, or private data are stored in contract storage
- [ ] Fallback/error conditions return `Result` or clear error enums
- [ ] Unit tests cover success, failure, and authorization paths
- [ ] Testnet deployment and invocation were verified before mainnet
- [ ] README or docs explain how to build, test, and deploy

## Quick start advice for new developers

- Start with a minimal contract and add one feature at a time.
- Keep state small and predictable.
- Use the contract metadata and storage keys as part of your design before writing functions.

## Learn more

- [First Contract](/docs/getting-started/first-contract)
- [Storage Best Practices](/docs/concepts/storage)
- [Authorization Concepts](/docs/concepts/authorization)
- [Security Fundamentals](/docs/security/fundamentals)
