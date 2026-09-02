---
sidebar_position: 5
title: Constructors and Initialization
description: Learn when Soroban uses a deploy-time __constructor and when a contract should expose a guarded initialize method instead.
---

# Constructors and Initialization

Soroban contracts can perform setup at deploy time with `__constructor`, and they can also expose a regular `initialize` method when a contract needs an explicit setup step after deployment. These two patterns solve different problems, and mixing them casually is a common source of bugs.

## The short version

- Use `__constructor` for values that are required at deployment and are fixed when the contract is first created.
- Use a guarded `initialize` method when setup must happen after deployment or through a factory pattern.
- Treat any one-time setup as a security boundary: prevent repeated calls and verify the caller is authorized.

## Deploy-time setup with `__constructor`

A Soroban `__constructor` runs when the contract is registered and instantiated. It is the closest thing to a traditional constructor in other smart contract ecosystems. It is ideal for values that must exist as soon as the contract is live.

This pattern is used in the cookbook examples for contracts that assign a role or credit an initial balance immediately:

```rust
#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage()
            .persistent()
            .set(&DataKey::Role(admin), &Role::Admin);
    }
}
```

And in the batch transfer example:

```rust
#[contract]
pub struct BatchOps;

#[contractimpl]
impl BatchOps {
    pub fn __constructor(env: Env, holder: Address, initial_balance: i128) {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(holder), &initial_balance);
    }
}
```

The key idea is simple: deploy-time arguments and storage writes happen before any normal user interaction. That makes the constructor a good place for:

- setting the initial admin or owner
- assigning a starting balance or initial supply
- creating global configuration that should never be missing
- validating required parameters before the contract becomes usable

This pattern prevents the contract from ever existing in an uninitialized or half-configured state.

## When a regular `initialize` method is appropriate

A public `initialize` method is not the same thing as a constructor. It is a normal entry point that can be called by anyone, so it must be guarded carefully. It is useful when your deployment flow creates the contract first and then performs a second setup step.

A common pattern is:

```rust
#[contractimpl]
impl MyContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&"initialized") {
            panic!("already initialized");
        }

        env.storage().instance().set(&"initialized", &true);
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }
}
```

This pattern is useful when:

- a factory creates the contract and then calls setup later
- deployment is separated from configuration
- the admin or parameters are determined dynamically by another contract or script
- the contract should accept a setup call but still reject duplicate initialization

## Why constructor vs. initialize matters

The main difference is not just naming. It is trust and lifecycle.

A constructor is part of the deployment path. It is typically the shortest route from “new contract created” to “contract ready.” A regular `initialize` method is part of the contract's normal public API, which means it is callable multiple times unless you guard it.

That distinction matters because one-time setup bugs are easy to miss:

- a contract can get initialized twice and overwrite the admin
- a token can mint an initial balance twice
- a governance contract can reset control after it is already live
- a factory may accidentally call the same setup routine more than once during provisioning

The fix is to treat initialization as a protected state transition, not a convenience method.

## Safe initialization checklist

Use the following rules in every Soroban contract that has setup logic:

1. Decide whether the setup belongs in `__constructor` or `initialize`.
2. Prefer `__constructor` when setup is mandatory and known at deployment time.
3. If you expose `initialize`, enforce a one-time guard using instance storage or a dedicated flag.
4. Require authorization for privileged setup when the caller is not the deployer.
5. Add tests that exercise repeated initialization attempts and verify they fail.
6. Keep initialization logic narrow and idempotence-safe.

## A practical rule of thumb

- Use `__constructor` when deployment and configuration are inseparable.
- Use `initialize` when setup must happen after a contract has already been deployed.
- Avoid mixing both patterns in the same contract unless the lifecycle is explicitly designed for it.

## Example from the cookbook

The cookbook examples show the intended pattern clearly:

- `BatchOps::__constructor` writes the initial holder balance at deployment.
- `AccessControl::__constructor` assigns the first admin immediately.
- The application logic then exposes regular methods such as `grant_role`, `batch_transfer`, or `set_message`, which are not one-time setup calls.

This is a good mental model for most Soroban contracts: a constructor establishes the contract's initial truth, while ordinary functions mutate state after that truth is already in place.

## Related topics

- [Storage Patterns](./storage.md)
- [Authorization](./authorization.md)
- [Best Practices](./best-practices.md)
- [Lifecycle Upgrades Pattern](../patterns/lifecycle-upgrades.md)

## Next steps

When designing a new contract, decide whether the contract should be valid immediately after deployment or require a separate setup call. That single decision usually clarifies the correct choice between `__constructor` and `initialize`.
