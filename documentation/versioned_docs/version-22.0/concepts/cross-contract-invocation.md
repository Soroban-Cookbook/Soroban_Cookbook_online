---
title: Cross-Contract Invocation
description: A practical guide to secure and maintainable cross-contract calls in Soroban — mechanics, failure modes, defensive patterns, and testing recommendations.
sidebar_position: 7
---

Soroban contracts can call functions on other on-chain contracts. This is the mechanism that enables composable applications: a lending protocol can invoke a token contract, a router can delegate to a price oracle, and an aggregator can orchestrate multiple DeFi primitives in a single transaction.

This guide explains how cross-contract calls work, where they can go wrong, and how to write and test them safely.

## How cross-contract calls work

When contract **A** calls contract **B**, Soroban executes the call inside the same transaction and the same resource budget. The host injects a new execution frame for contract B, passing the arguments and returning a result (or propagating a panic). The key properties:

- **Synchronous** — there are no callbacks or async/await. The caller blocks until the callee returns.
- **Same transaction** — both contracts execute atomically. If either panics, the entire transaction rolls back.
- **Shared budget** — CPU instructions and storage bytes consumed by contract B count against the budget allocated to the top-level transaction.
- **Independent state** — each contract has its own storage namespace; callers cannot read or write callee storage directly.

## Setting up a cross-contract client

The Soroban SDK generates a typed client for any contract whose interface is known at compile time. Import the callee's crate (or its `contractimpl` interface) and call `ContractClient::new`.

### Example: calling a token contract

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};
// Import the generated client from a token contract crate
use token::TokenClient;

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    /// Deposit `amount` tokens from `sender` into the vault.
    pub fn deposit(env: Env, token_id: Address, sender: Address, amount: i128) {
        // Require the sender to have authorised this invocation
        sender.require_auth();

        let token = TokenClient::new(&env, &token_id);
        // Cross-contract call: transfer tokens from sender to this contract
        token.transfer(&sender, &env.current_contract_address(), &amount);
    }
}
```

The `TokenClient::new(&env, &token_id)` call binds the client to a specific contract address. From that point the call looks like a normal Rust method call; the SDK serialises arguments, dispatches the invocation to the host, and deserialises the return value.

## Invocation patterns

### Direct invocation (typed client)

The preferred pattern — use the SDK-generated client whenever you have access to the callee's contract interface:

```rust
use oracle::OracleClient;

pub fn get_price(env: Env, oracle_id: Address, asset: Symbol) -> i128 {
    let oracle = OracleClient::new(&env, &oracle_id);
    oracle.price(&asset)
}
```

**Advantages:** compile-time type checking, clear dependency boundary, easy to mock in tests.

### Dynamic invocation (unknown interface)

When the callee interface is not known at compile time, use `env.invoke_contract`:

```rust
use soroban_sdk::{symbol_short, vec, IntoVal};

pub fn call_unknown(env: Env, contract_id: Address, arg: i128) -> i128 {
    env.invoke_contract(
        &contract_id,
        &symbol_short!("compute"),
        vec![&env, arg.into_val(&env)],
    )
}
```

**Use sparingly** — dynamic invocations bypass compile-time type checks and make it harder to reason about what a contract depends on.

### Invoking the current contract

A contract can call itself through the client. This is occasionally useful for re-entry-safe patterns where you want the host to enforce authorisation checks on the inner call:

```rust
let self_client = MyContractClient::new(&env, &env.current_contract_address());
self_client.some_function(&arg);
```

> **Caution:** calling yourself can create unintended re-entrancy. Prefer explicit helper functions unless the authorisation model requires a self-invocation.

## Dependency boundaries

A well-designed contract system treats cross-contract dependencies like external APIs:

- **Minimise the surface area** — only call what you need. Each additional callee is another attack surface.
- **Version by address** — the callee's address is part of your contract's interface. If you upgrade the callee, you must also update the address stored in the caller.
- **Prefer interfaces over implementations** — depend on the minimal set of functions the callee must provide, not on a monolithic callee.
- **Store callee addresses in contract storage** — never hard-code addresses in source code. Hard-coded addresses cannot be updated without redeploying the caller.

```rust
// Good: callee address is configurable
pub fn initialize(env: Env, token_id: Address, admin: Address) {
    env.storage().instance().set(&"token", &token_id);
    env.storage().instance().set(&"admin", &admin);
}

pub fn withdraw(env: Env, to: Address, amount: i128) {
    let token_id: Address = env.storage().instance().get(&"token").unwrap();
    let token = TokenClient::new(&env, &token_id);
    token.transfer(&env.current_contract_address(), &to, &amount);
}
```

## Failure modes

Cross-contract calls introduce failure modes that do not exist in single-contract code.

### Callee panics

If contract B panics for any reason, the panic propagates back to contract A and continues bubbling up until it either reaches the top-level invocation frame (aborting the transaction) or is caught by a `try_*` call (see below).

```rust
// If the oracle panics, this call panics too and rolls back the transaction.
let price = oracle.price(&asset);
```

### Budget exhaustion

If contract B consumes all remaining CPU or memory budget, the invocation fails with a budget error. The transaction rolls back. Always measure budget consumption in tests when calling external contracts.

### Unexpected return type

Dynamic invocations (`env.invoke_contract`) can return any type. If you decode incorrectly, the SDK panics.

### Reentrancy

Soroban does **not** prevent a callee from calling back into the caller. A malicious or buggy callee could invoke a caller function before the caller finishes its current execution, potentially exploiting inconsistent intermediate state.

## Defensive coding strategies

### Use `try_*` methods to recover from callee failures

The SDK generates `try_<function>` variants for every contract function. They return `Result<T, Error>` instead of `T`, so you can handle a callee failure without aborting your transaction:

```rust
match oracle.try_price(&asset) {
    Ok(Ok(price)) => price,
    Ok(Err(_contract_error)) => fallback_price(&env),
    Err(_host_error) => fallback_price(&env),
}
```

Use `try_*` when:

- The callee is external and you cannot guarantee it is always available.
- You want to implement a fallback (e.g. secondary oracle).
- The callee's error is recoverable in your business logic.

### Validate callee addresses

Never assume a stored address points to the contract you expect. For high-value operations, validate the callee address against a whitelist or verify a specific function is present:

```rust
pub fn set_oracle(env: Env, oracle_id: Address, admin: Address) {
    admin.require_auth();
    // Verify the oracle responds to the expected interface before storing
    let candidate = OracleClient::new(&env, &oracle_id);
    candidate.price(&symbol_short!("XLM")); // will panic if wrong interface
    env.storage().instance().set(&"oracle", &oracle_id);
}
```

### Complete state changes before cross-contract calls

Reads and writes to your own storage before calling an external contract prevent reentrancy from observing or exploiting stale intermediate state:

```rust
// Good: update balance first, then call external contract
env.storage().persistent().set(&user, &new_balance);
token.transfer(&env.current_contract_address(), &user, &amount);

// Risky: state updated after the cross-contract call
token.transfer(&env.current_contract_address(), &user, &amount);
env.storage().persistent().set(&user, &new_balance); // ← reentrancy window
```

### Restrict who can set callee addresses

If an attacker can change the stored address of a callee they control a malicious contract, they can redirect all cross-contract calls. Guard address-update functions with admin authorisation:

```rust
pub fn update_token(env: Env, new_token: Address) {
    let admin: Address = env.storage().instance().get(&"admin").unwrap();
    admin.require_auth(); // Only admin can change the token contract
    env.storage().instance().set(&"token", &new_token);
}
```

### Limit the callee's authorisation scope

Use `sub_invocations` in `require_auth_for_args` to bound what operations a callee can authorise on behalf of a user. This prevents a compromised callee from draining all of a user's assets.

## Security considerations

| Risk                                           | Mitigation                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| Callee can drain caller's funds via reentrancy | Finish all storage writes before calling external contracts                       |
| Attacker substitutes malicious callee address  | Guard address-update functions with `require_auth`; validate the callee interface |
| Budget exhaustion from deep call chains        | Profile budget usage; cap recursion depth                                         |
| Panicking callee aborts your transaction       | Use `try_*` methods for non-critical external calls                               |
| Dynamic invocations bypass type safety         | Prefer typed clients; treat dynamic calls as untrusted data                       |
| Callee upgrade changes behaviour               | Subscribe to upgrade events or pin a specific contract hash                       |

## Testing cross-contract calls

### Deploying multiple contracts in a test environment

The `Env` in tests is a sandboxed host. You can register multiple contracts and wire them together without a real network:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_vault_deposit() {
        let env = Env::default();
        env.mock_all_auths();

        // Register the token contract
        let token_id = env.register(token::TokenContract, ());
        let token = token::TokenContractClient::new(&env, &token_id);

        // Register the vault, pointing it at the token
        let vault_id = env.register(Vault, ());
        let vault = VaultClient::new(&env, &vault_id);

        // Fund the user via the token contract
        let user = soroban_sdk::Address::generate(&env);
        token.mint(&user, &1000_i128);

        // Invoke the cross-contract flow
        vault.initialize(&token_id, &user);
        vault.deposit(&token_id, &user, &500_i128);

        // Assert final state
        assert_eq!(token.balance(&vault_id), 500);
        assert_eq!(token.balance(&user), 500);
    }
}
```

### Testing failure paths

Always test what happens when the callee fails:

```rust
#[test]
fn test_vault_deposit_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(token::TokenContract, ());
    let token = token::TokenContractClient::new(&env, &token_id);

    let vault_id = env.register(Vault, ());
    let vault = VaultClient::new(&env, &vault_id);

    let user = soroban_sdk::Address::generate(&env);
    // User has 100 tokens but tries to deposit 500
    token.mint(&user, &100_i128);
    vault.initialize(&token_id, &user);

    // The vault's deposit function should propagate the token error
    let result = vault.try_deposit(&token_id, &user, &500_i128);
    assert!(result.is_err());

    // State must be unchanged (transaction rolled back)
    assert_eq!(token.balance(&vault_id), 0);
    assert_eq!(token.balance(&user), 100);
}
```

### Verifying authorisation

Test that your contract correctly passes authorisation down to the callee:

```rust
#[test]
fn test_correct_auth_is_required() {
    let env = Env::default();
    // Do NOT call env.mock_all_auths() — we want auth to be enforced

    let token_id = env.register(token::TokenContract, ());
    let vault_id = env.register(Vault, ());
    let vault = VaultClient::new(&env, &vault_id);

    let user = soroban_sdk::Address::generate(&env);

    // Attempting deposit without the user's auth should fail
    let result = vault.try_deposit(&token_id, &user, &100_i128);
    assert!(result.is_err());
}
```

### Inspecting events across contract boundaries

Cross-contract calls can emit events from multiple contracts. In tests, you can inspect all events from the entire call tree:

```rust
let all_events = env.events().all();
// Find the Transfer event emitted by the token contract
assert!(all_events.iter().any(|e| /* check topic */ true));
```

## Debugging cross-contract calls

When a cross-contract call fails unexpectedly:

1. **Isolate the callee** — write a test that calls the callee directly to confirm it works in isolation.
2. **Check the error type** — `try_*` returns `Ok(Err(contract_error))` for contract-level panics and `Err(host_error)` for host-level errors (budget, encoding). They need different remediation.
3. **Inspect the budget** — use `env.budget()` in tests to see how much each contract consumes.
4. **Verify arguments** — serialisation mismatches are silent. Add `println!` or event emissions in the callee during development.
5. **Review authorisation** — a missing `require_auth` call or wrong signer is the most common cause of silent authorisation failures.

## Next steps

- [Authorization](./authorization.md) — how `require_auth` works and how to propagate it across contracts
- [Error Handling](./error-handling.md) — custom error types and the `try_*` pattern
- [Gas and Resource Management](./gas-and-resources.md) — budget impact of cross-contract calls
- [Security Fundamentals](../security/fundamentals.md) — reentrancy, access control, and safe patterns
- [Error Recovery Pattern](../patterns/error-recovery.mdx) — fallback logic and graceful degradation
