---
time: 15
sidebar_position: 3
title: Your First Contract
description: Create, build, and test your first Soroban smart contract from scratch — a beginner-friendly introduction to contract development.
---

This tutorial walks through the cookbook's canonical Hello World contract: `examples/hello-world`. The implementation stores a greeting in **instance storage** under the `"msg"` key, exposes `hello` and `set_message`, and ships two unit tests in the same crate.

If you have not finished environment setup, start with the [Environment Setup](./setup.md) guide, then return here. Compilation details are in [Building and Compilation](./building-and-compilation.md).

## The canonical crate

The source of truth is:

- [`examples/hello-world/src/lib.rs`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/hello-world/src/lib.rs)
- [`examples/hello-world/Cargo.toml`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/hello-world/Cargo.toml)

From a clone of this repository:

```bash
cd examples/hello-world
```

That crate uses `soroban-sdk` `27.0.3` (see its `Cargo.toml`) and is a member of the `examples` Cargo workspace.

To scaffold a **new** empty project instead of using the cookbook crate, the current Stellar CLI command is `stellar contract init my-first-contract`. After init, replace the generated sample with the Hello World API below so the tutorial and the crate stay aligned.

## Contract API

`HelloWorld` exposes two methods:

| Method | Arguments | Returns | Behavior |
| ------ | --------- | ------- | -------- |
| `hello` | _(none)_ | `String` | Reads instance storage key `"msg"`. If unset, returns `"Hello, Soroban!"`. |
| `set_message` | `message: String` | `()` | Writes `message` to instance storage under `"msg"`. |

There is **no** `hello(to: String)` or `hello(to: Symbol)` entry point. Those signatures are from older tutorials and do not match this crate.

## Understanding the code

Open `examples/hello-world/src/lib.rs`:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, String};

#[contract]
pub struct HelloWorld;

#[contractimpl]
impl HelloWorld {
    /// Return a greeting stored in instance storage, or a default greeting.
    pub fn hello(env: Env) -> String {
        env.storage()
            .instance()
            .get(&"msg")
            .unwrap_or(String::from_str(&env, "Hello, Soroban!"))
    }

    /// Store a custom greeting message.
    pub fn set_message(env: Env, message: String) {
        env.storage().instance().set(&"msg", &message);
    }
}
```

Notes that match this file:

- The storage key is the short symbol `"msg"`, not a `String` key.
- Storage is **instance** storage (`env.storage().instance()`), shared by the contract instance.
- `hello` takes only `env` — it does not take a `to` argument.
- Tests live in the same file under `#[cfg(test)]`. There is no `src/test.rs` in this crate.

The same pattern is documented with tabbed snippets on [Hello World Storage](../patterns/hello-world.mdx).

## Testing the contract

The crate defines two tests:

- `test_default_greeting` — `hello()` returns `"Hello, Soroban!"` before any write
- `test_custom_greeting` — `set_message` then `hello()` returns the stored string

They register the contract with `env.register(HelloWorld, ())` (not the older `register_contract` API):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_default_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);

        assert_eq!(
            client.hello(),
            String::from_str(&env, "Hello, Soroban!")
        );
    }

    #[test]
    fn test_custom_greeting() {
        let env = Env::default();
        let contract_id = env.register(HelloWorld, ());
        let client = HelloWorldClient::new(&env, &contract_id);

        client.set_message(&String::from_str(&env, "Greetings from Soroban!"));
        assert_eq!(
            client.hello(),
            String::from_str(&env, "Greetings from Soroban!")
        );
    }
}
```

Run them from the crate directory (or from the workspace with `--package hello-world`):

```bash
cd examples/hello-world
cargo test
```

```bash
cd examples
cargo test --package hello-world
```

You should see both `test_default_greeting` and `test_custom_greeting` pass.

## Building the contract

From `examples/hello-world` (or the `examples` workspace), use the current Stellar CLI:

```bash
stellar contract build
```

In the workspace you can also target this crate only:

```bash
cd examples
stellar contract build --package hello-world
```

The former `soroban contract build` command is the same workflow as `stellar contract build`. Use `stellar` going forward.

Because `examples` is a Cargo workspace, the WASM artifact is written under the workspace `target` directory:

```
examples/target/wasm32-unknown-unknown/release/hello_world.wasm
```

`stellar contract build` optimizes the WASM by default. Direct `cargo build --target wasm32-unknown-unknown --release` also works and is what [scripts/test-examples.sh](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/scripts/test-examples.sh) uses for this repository.

See [Building and Compilation](./building-and-compilation.md) for flags, profiles, and common errors.

## Next steps

- [Hello World Storage pattern](../patterns/hello-world.mdx) — tabbed contract and tests for this crate
- [Building and Compilation](./building-and-compilation.md) — compile your contract to WASM
- [Contract Testing Guide](./contract-testing.md) — how to write and run tests
- [Deploy to testnet](./deploy-testnet.md)
- [Learn about storage](../concepts/storage.md)
- [Explore patterns](../patterns/overview.md)

## Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Cookbook hello-world example](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world)
