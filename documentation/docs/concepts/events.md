# Events and Logging

Events in Soroban provide a reliable audit trail of contract execution. They are essential for off-chain indexing, analytics, and building responsive front-end applications that react to on-chain activity.

## When to Emit Events

You should emit events for any significant state transition or authorization action within your contract. Common scenarios include:
- **Initialization:** When the contract is first configured.
- **Value Transfers:** Moving tokens, updating balances, or transferring ownership.
- **State Changes:** Changing configuration, updating user profiles, or pausing/unpausing the contract.
- **Access Control:** Granting or revoking admin roles.

> **Tip:** Do not use events as a primary data storage mechanism for on-chain logic. Smart contracts cannot read past events; they are strictly for off-chain consumers.

## Event Design and Payload Shape

Soroban events consist of two main parts: **topics** and **data**.
- **Topics (up to 4):** Used for filtering and indexing. Topics should be predictable symbols or addresses.
- **Data (1 value):** The payload containing the detailed information about the event. This can be any complex type, like a struct or map, but keeping it minimal saves fees.

### Naming and Versioning Conventions

- **Topic Naming:** Use clear, action-oriented names. For example, `(Symbol::new(&env, "transfer"), ...)` or `(symbol_short!("mint"), ...)`.
- **Versioning:** If your event schema might evolve, include a version number in your topics or data payload. For example, `(symbol_short!("transfer"), 1u32)`.
- **Standardized Shapes:** Many Soroban ecosystem tools expect standard topic structures, e.g., standard token events often use `("transfer", from, to)` as topics.

## Examples of Common Contract Operations

Here are some practical patterns for emitting events in different scenarios.

### 1. Token Transfer Event

A common pattern for financial contracts is emitting a transfer event. Notice how the `from` and `to` addresses are used as topics to allow efficient off-chain querying, while the amount is placed in the data payload.

```rust
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env};

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        // ... authorization and balance logic here ...

        // Emit the event
        // Topics: ["transfer", from, to]
        // Data: amount
        let topics = (symbol_short!("transfer"), from, to);
        env.events().publish(topics, amount);
    }
}
```

### 2. State Update with Complex Payload

When a configuration changes, you might need to emit multiple fields. Use a struct or a map for the data payload.

```rust
use soroban_sdk::{contracttype, symbol_short, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfigUpdateEvent {
    pub admin: Address,
    pub fee_rate: u32,
    pub paused: bool,
}

#[contractimpl]
impl TokenContract {
    pub fn update_config(env: Env, admin: Address, fee_rate: u32, paused: bool) {
        // ... logic to update config ...

        let payload = ConfigUpdateEvent {
            admin,
            fee_rate,
            paused,
        };

        // Topics: ["config", "update"]
        // Data: ConfigUpdateEvent struct
        let topics = (symbol_short!("config"), symbol_short!("update"));
        env.events().publish(topics, payload);
    }
}
```

### 3. Access Control Changes

When changing roles, emit an event to maintain a verifiable audit trail of administrators.

```rust
use soroban_sdk::{Symbol};

#[contractimpl]
impl TokenContract {
    pub fn grant_role(env: Env, target: Address, role: Symbol) {
        // ... logic to grant role ...

        // Topics: ["role", "grant", target]
        // Data: role
        let topics = (symbol_short!("role"), symbol_short!("grant"), target);
        env.events().publish(topics, role);
    }
}
```

## Indexing and Consumer Considerations

When designing your events, keep the downstream consumers in mind:

- **Filterability:** Indexers like Soroban RPC or third-party data providers filter events based on topics. Put addresses and action types in topics so consumers can easily subscribe to specific users or actions.
- **Payload Size:** The larger the data payload, the more it costs in fees. Only include necessary information. Avoid including large strings or arrays if a hash or identifier suffices.
- **Reorg Handling:** Blockchain reorganizations can cause events to be rolled back. Indexers should wait for ledger finality before treating events as permanent.

## Next

- [Storage Patterns](./storage.md)
- [Authorization](./authorization.md)
