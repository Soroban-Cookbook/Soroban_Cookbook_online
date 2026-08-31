---
time: 25
sidebar_position: 5
title: Contract Testing Guide
description: Write Soroban contract tests with Env::default(), env.register, generated clients, auth mocks, and snapshot helpers that match the examples in this repo.
image: /img/soroban-social-card.png
---

# Contract Testing Guide

This guide shows the testing patterns used in this repository today:

- `Env::default()` for a fresh Soroban sandbox
- `env.register(...)` to deploy a contract into that sandbox
- generated clients such as `HelloWorldClient`
- `env.mock_all_auths()` for auth-heavy tests
- snapshot tests that set the ledger and verify historical reads

If you want to run every example crate the same way CI does, use `./scripts/test-examples.sh`.

## The basic test shape

Every contract test starts with a clean `Env`, registers the contract, and creates a client.

The smallest example in this repo is `examples/hello-world`.

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

The important part is the flow:

1. Create `Env::default()`
2. Register the contract with `env.register(ContractName, ())`
3. Build the generated client with `ContractNameClient::new(&env, &contract_id)`
4. Call methods through the client and assert on the results

That pattern replaces the older `register_contract` style from earlier SDK examples.

## Testing auth-heavy contracts

When a contract uses `require_auth`, the repo usually enables auth mocking in tests that are not specifically checking permission failures.

`examples/token-transfer` is a good example.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, TokenTransferClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TokenTransfer, ());
        let client = TokenTransferClient::new(&env, &contract_id);
        (env, client)
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
    fn test_transfer_from_fails_on_insufficient_allowance() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &200);

        let result = client.try_transfer_from(&bob, &alice, &carol, &300);

        assert_eq!(result, Err(Ok(Error::InsufficientAllowance)));
        assert_eq!(client.balance(&alice), 1000);
        assert_eq!(client.allowance(&alice, &bob), 200);
    }
}
```

Use `env.mock_all_auths()` when the test should focus on contract behavior instead of signature checking.

If you want to test auth failures themselves, skip the mock and assert on the `try_*` result.

## Testing snapshots

Some contracts in this repo store point-in-time state and expose snapshot reads. The snapshot examples show two important ideas:

- set the ledger before taking a snapshot
- verify the historical read is frozen after later state changes

From `examples/balance-snapshot`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        vec, Env,
    };

    fn setup() -> (Env, BalanceSnapshotClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(BalanceSnapshot, ());
        let client = BalanceSnapshotClient::new(&env, &contract_id);
        (env, client)
    }

    fn set_ledger(env: &Env, seq: u32, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            timestamp,
            protocol_version: 22,
            sequence_number: seq,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });
    }

    #[test]
    fn test_snapshot_preserves_historical_state() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);

        let snapshot_id = client.take_snapshot(&vec![&env, alice.clone(), bob.clone()]);

        client.transfer(&alice, &bob, &400);

        assert_eq!(client.snapshot_balance(&snapshot_id, &alice), Some(1000));
        assert_eq!(client.snapshot_balance(&snapshot_id, &bob), Some(0));
        assert_eq!(client.balance(&alice), 600);
        assert_eq!(client.balance(&bob), 400);
    }
}
```

The same pattern works for `examples/token-snapshot`:

- create a helper that registers the contract
- set the ledger before the snapshot if you need stable metadata
- assert on snapshot counts, balances, and metadata

## Running tests

To run one example crate directly:

```bash
cargo test --manifest-path examples/hello-world/Cargo.toml
```

To run every example crate the way CI does:

```bash
./scripts/test-examples.sh
```

To run a single example through the shared script:

```bash
./scripts/test-examples.sh hello-world
```

The script also handles examples that need extra build steps first, such as `contract-factory` and `upgradeable`.

## Good habits

- Keep the `setup()` helper small and reusable.
- Use one behavior per test when possible.
- Prefer `try_*` methods when you want to assert on failures.
- Assert that state is unchanged after rejected operations.
- Use snapshot-specific helpers for historical reads instead of reusing current-balance assertions.
- [Local Testing and Simulation](./local-testing-and-simulation.md) - Canonical local workflow
- [Testing Error Scenarios](./testing-errors.md) - Error testing patterns
- [Building and Compilation](./building-and-compilation.md) - Build system details

## Related docs

- [Local Testing and Simulation](./local-testing-and-simulation.md)
- [Testing Error Scenarios](./testing-errors.md)
- [Adding a Tested Code Example](/docs/contributing/add-tested-example)
