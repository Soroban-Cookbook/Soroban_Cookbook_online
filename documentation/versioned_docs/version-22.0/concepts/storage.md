---
sidebar_position: 4
title: Storage
description: Master Soroban's three storage types — instance, persistent, and temporary — and learn patterns for efficient, scalable contract state management.
---

# Storage Patterns

title: Storage Patterns
description: Instance, persistent, and temporary storage types in Soroban contracts.
sidebar_position: 4
---

Soroban contracts use three storage types: **instance**, **persistent**, and **temporary**. Each storage type has a different lifetime, cost profile, and common use case.

- **Instance storage**: contract-owned data that survives between transactions and is scoped to the contract instance.
- **Persistent storage**: ledger-backed state for user data, collections, and durable application state.
- **Temporary storage**: in-transaction scratch space that disappears at the end of execution.

Choosing the right storage pattern improves gas efficiency, reduces contract complexity, and makes future migrations easier.

## Major storage approaches

### Instance storage

Instance storage is the simplest contract-scoped store. It is ideal for configuration, feature flags, and a small amount of state that is shared across all callers.

- Best for small, fixed contract state and configuration values.
- Good for booleans, version numbers, owner addresses, and global counters.
- Data persists across transactions and is visible to all contract calls.

When to use instance storage:

- the state belongs to the contract rather than an individual user
- the number of keys is small and changes rarely
- the state is a contract-wide setting or default value

Example: contract configuration and a global flag

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, String};

#[contract]
pub struct ConfiguredContract;

#[contractimpl]
impl ConfiguredContract {
    pub fn get_welcome_message(env: Env) -> String {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "welcome_message"))
            .unwrap_or(String::from_str(&env, "Welcome to Soroban!"))
    }

    pub fn set_welcome_message(env: Env, message: String) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "welcome_message"), &message);
    }

    pub fn enable_feature(env: Env, enabled: bool) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "feature_enabled"), &enabled);
    }

    pub fn feature_enabled(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "feature_enabled"))
            .unwrap_or(false)
    }
}
```

### Persistent storage

Persistent storage is the ledger-backed state store. It is the right place for user balances, ownership, access control, collections, and any state that must survive after the transaction completes.

- Best for durable data keyed by user, asset, or composite identifiers.
- Requires careful key namespacing to prevent collisions.
- More expensive than temporary storage because data remains on-chain until removed.

When to use persistent storage:

- state must survive across transactions
- data is scoped to users, assets, or domain-specific identifiers
- the stored value may grow in number of keys or records over time

Example: per-user token balances with namespaced keys

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Address, Symbol};

#[contract]
pub struct TokenLedger;

#[contractimpl]
impl TokenLedger {
    fn balance_key(env: &Env, user: &Address) -> (Symbol, Address) {
        (Symbol::new(env, "balance"), user.clone())
    }

    pub fn deposit(env: Env, user: Address, amount: i128) {
        let key = Self::balance_key(&env, &user);
        let current: i128 = env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&key, &(current + amount));
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        let key = Self::balance_key(&env, &user);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(0)
    }

    pub fn withdraw(env: Env, user: Address, amount: i128) {
        let current = Self::balance(env.clone(), user.clone());
        if current < amount {
            panic!("insufficient balance");
        }
        let key = Self::balance_key(&env, &user);
        env.storage()
            .persistent()
            .set(&key, &(current - amount));
    }
}
```

### Temporary storage

Temporary storage is for data that only needs to exist during one transaction. It is the cheapest storage type and is automatically cleared when the transaction finishes.

- Best for intermediate results, loop state, caches, and transactional scratch space.
- Never use it for state that must be recovered later.
- Good for avoiding repeated computation within a single invocation.

When to use temporary storage:

- the data is only useful inside one contract call
- you want to preserve working state between steps in the same transaction
- the value is not meaningful after execution completes

Example: transactional batch accumulation

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

#[contract]
pub struct BatchAccumulator;

#[contractimpl]
impl BatchAccumulator {
    pub fn sum_batch(env: Env, values: Vec<i128>) -> i128 {
        let temp_key = Symbol::new(&env, "running_sum");
        env.storage().temporary().set(&temp_key, &0_i128);

        for value in values.into_iter() {
            let current: i128 = env.storage().temporary().get(&temp_key).unwrap_or(0);
            env.storage().temporary().set(&temp_key, &(current + value));
        }

        env.storage().temporary().get(&temp_key).unwrap_or(0)
    }
}
```

## Pattern selection heuristics

Use this decision flow when you select storage for a new contract design:

1. Does the state need to persist after the transaction?
   - No → **temporary storage**
   - Yes → continue
2. Is the state shared across the contract instance and limited to a few fixed keys?
   - Yes → **instance storage**
   - No → continue
3. Is the state user-specific, asset-specific, or a growing collection?
   - Yes → **persistent storage**
   - No → consider instance storage if the state is still small and contract-scoped

Concrete heuristics:

- Use **instance storage** for contract-wide defaults, flags, versioning, owner address, and one-off settings.
- Use **persistent storage** for account balances, access control lists, metadata, and any data that must survive across transactions.
- Use **temporary storage** for intermediate calculations, batch loops, transaction-local caches, and ephemeral state that should not occupy ledger storage.
- Prefer **persistent storage** for large or user-scoped datasets.
- Prefer **instance storage** for small and stable contract settings.
- Prefer **temporary storage** whenever data is only needed during execution and can be recomputed later.

## Performance and cost considerations

### Cost ranking

- **Temporary storage** — cheapest, because it is cleared at the end of the transaction.
- **Instance storage** — moderate cost, useful for contract-level state that persists.
- **Persistent storage** — highest cost for growing data, because every stored key consumes ledger-backed space until deleted.

### Practical trade-offs

- Writes are more expensive than reads in all storage modes.
- Key size and value size both impact gas and ledger storage cost.
- Persistent storage should be namespaced using `Symbol`, tuples, or structured keys to avoid collisions.
- Instance storage is convenient, but do not use it for per-user or high-cardinality data.
- Temporary storage is ideal for reducing repeated work inside a transaction, but it cannot replace durable state.
- If your contract stores derived or cached values, ensure that the cost of storage is worth the savings from recomputation.
- Remove stale persistent entries when possible to avoid paying for unused ledger state.

### Common performance patterns

- Use **sparse persistent maps** instead of dense arrays when state is keyed by users or assets.
- Store compact values and avoid embedding large collections inside a single key where possible.
- Use temporary storage to hold intermediate results during loops or multi-step operations.
- Keep contract configuration in instance storage so you do not pay ledger storage for a small, fixed number of keys.

## Common storage patterns and trade-offs

- **Global flags and configuration**: instance storage is simple and low-overhead for contract-owned state.
- **User balances and ledgers**: persistent storage keyed by `Address`, namespaced tuples, or `Symbol` key prefixes.
- **Transactional scratch space**: temporary storage keeps intermediate values available without creating permanent on-chain state.
- **Audit trails and history**: persistent storage is the only safe choice when you need recoverable state after execution.

## Related resources

- [Hello World Storage](/docs/patterns/hello-world) — simple instance storage example
- [Error Recovery](/docs/patterns/error-recovery) — storage usage in resilient smart contracts
- [Authorization](/docs/concepts/authorization)
- [Security Fundamentals](/docs/security/fundamentals.md)
- [First Contract Walkthrough](/docs/getting-started/first-contract.md)
