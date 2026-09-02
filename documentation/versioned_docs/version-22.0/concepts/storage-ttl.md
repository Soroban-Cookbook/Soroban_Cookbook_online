---
sidebar_position: 5
title: Storage TTL and State Archival
description: Understand time-to-live (TTL) for Soroban storage entries, how state archival works, when to extend TTLs, and strategies for managing ledger rent costs.
---

# Storage TTL and State Archival

Every piece of data stored by a Soroban contract has a **time-to-live (TTL)** — a finite number of ledgers after which the entry expires. When an entry expires, the Stellar protocol either removes it permanently or moves it to an archival store. Understanding TTL is essential for designing contracts that maintain data correctly and manage rent costs efficiently.

## What is TTL?

TTL measures how many ledgers remain before a storage entry expires. Each ledger closes roughly every 5 seconds, so a TTL of 631,200 ledgers corresponds to approximately one year.

When a contract writes data via `env.storage()`, the entry is assigned an initial TTL based on network parameters:

| Parameter | Description |
|-----------|-------------|
| `min_persistent_entry_ttl` | Minimum TTL for new persistent and instance entries (network default: ~4,096 ledgers) |
| `min_temp_entry_ttl` | Minimum TTL for new temporary entries (network default: ~16 ledgers) |
| `max_entry_ttl` | Maximum TTL that any single extension can grant (network default: ~6,312,000 ledgers) |

The TTL counts down from the ledger sequence at creation. Every new ledger reduces the TTL of all active entries by one.

## TTL Behavior by Storage Type

Different storage types handle TTL expiration differently:

| Storage type | Cost | Behavior when TTL expires | Restorable? |
|-------------|------|--------------------------|-------------|
| **Persistent** | Highest | Archived (moved to cold storage) | Yes — auto-restored on access |
| **Instance** | Moderate | Archived (shares TTL with contract) | Yes — auto-restored with contract |
| **Temporary** | Lowest | Permanently deleted | No — gone forever |

### Persistent storage TTL

Persistent entries expire and move to **archival storage** (also called the "Extension Store" or ESS). When a transaction references an archived persistent entry, the protocol automatically restores it before execution. The restoration is mostly transparent but increases the transaction's resource consumption and fees.

```rust
// Persistent entries can be restored automatically
// when accessed after archival.
env.storage().persistent().set(&key, &value);
// ... many ledgers later ...
// Accessing the entry triggers automatic restoration.
let value = env.storage().persistent().get(&key).unwrap();
```

### Instance storage TTL

Instance storage shares its TTL with the contract instance itself. Extending the contract's TTL also extends all instance storage entries. This makes instance storage simpler to manage but means all instance data expires together.

```rust
// Instance storage extends with the contract TTL.
env.storage().instance().extend_ttl(2_000, 10_000);
```

### Temporary storage TTL

Temporary entries are **permanently deleted** when their TTL expires. There is no archive and no way to recover the data. This is both a feature (guaranteed cleanup) and a risk (data loss if TTL is too short).

```rust
// Temporary entries vanish when TTL expires.
env.storage().temporary().set(&key, &value);
// After TTL expires:
// env.storage().temporary().has(&key) → false
```

## Extending TTL

Every storage type supports TTL extension via `extend_ttl`. The extension operation takes two parameters:

- **`min_ttl`**: Only extend if the current remaining TTL is below this threshold.
- **`new_ttl`**: Set the TTL to at least this value.

This "extend if below threshold" pattern avoids paying for unnecessary extensions on every call.

### Extending persistent entries

```rust
pub fn keep_alive(env: Env, key: Symbol) {
    let value: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    env.storage().persistent().set(&key, &(value + 1));

    // Only extend when TTL drops below 100,000 ledgers (~6 days).
    // Extend to 600,000 ledgers (~35 days).
    env.storage().persistent().extend_ttl(&key, 100_000, 600_000);
}
```

### Extending temporary entries

```rust
pub fn place_bid(env: Env, user: Address, bid: i128, valid_until: u32) {
    user.require_auth();
    let key = DataKey::Bid(user.clone());
    env.storage().temporary().set(&key, &bid);

    // Extend TTL to guarantee the entry survives until the auction ends.
    let ttl = valid_until.checked_sub(env.ledger().sequence()).unwrap();
    env.storage().temporary().extend_ttl(&key, ttl, ttl);
}
```

### Extending instance storage

Instance TTL is extended at the storage level, not per-key:

```rust
pub fn extend_instance_ttl(env: Env) {
    // Extend instance storage TTL: if below 2,000 ledgers,
    // set it to at least 10,000.
    env.storage().instance().extend_ttl(2_000, 10_000);
}
```

### Extension limits

The `max_entry_ttl` network parameter caps the maximum TTL that any single extension can grant. You cannot extend an entry beyond `sequence_number + max_entry_ttl`. However, extensions can be called repeatedly, so entries can theoretically live indefinitely as long as they are periodically bumped.

## State Archival

**State archival** is the Stellar protocol's mechanism for preventing unbounded ledger growth. When a persistent or instance entry's TTL reaches zero, it is moved to the **Extension Store** (ESS) — a cold, off-chain archival layer.

### How archival works

1. **TTL countdown**: Each new ledger reduces all entry TTLs by one.
2. **Expiration**: When TTL reaches zero, the entry is no longer part of the active ledger.
3. **Archival**: Persistent and instance entries are moved to the ESS. Temporary entries are deleted.
4. **Automatic restoration**: When a transaction accesses an archived entry, the protocol restores it to the active ledger before execution. The restoration cost is added to the transaction's resource consumption.

### Manual restoration

For cases where automatic restoration is insufficient (e.g., pre-restoring entries for batch operations), use `env.storage().persistent().restore(&key)`:

```rust
pub fn batch_restore(env: Env, keys: Vec<Symbol>) {
    for key in keys.iter() {
        env.storage().persistent().restore(&key);
    }
    // All entries are now active again.
}
```

### Archival implications for contract design

- **Fees increase on access**: Accessing an archived entry costs more than accessing an active one because the protocol must restore it.
- **Restore operations are expensive**: Each restoration requires disk I/O for both reading the archived data and writing it back to the active ledger.
- **Batch restoration**: Restoring entries in bulk before processing can be more efficient than restoring them one-by-one during execution.

## TTL Management Strategies

### Strategy 1: Bump on every mutation

Extend TTL every time you write to an entry. This is the simplest and most reliable approach.

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
    let from_key = DataKey::Balance(from.clone());
    let to_key = DataKey::Balance(to.clone());

    let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
    let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

    env.storage().persistent().set(&from_key, &(from_balance - amount));
    env.storage().persistent().set(&to_key, &(to_balance + amount));

    // Keep both entries alive.
    env.storage().persistent().extend_ttl(&from_key, 100_000, 600_000);
    env.storage().persistent().extend_ttl(&to_key, 100_000, 600_000);
}
```

**Pros**: Simple, guaranteed data preservation.
**Cons**: Increases gas cost on every call.

### Strategy 2: Conditional bump

Only extend TTL when it drops below a threshold. This reduces costs for frequently accessed entries.

```rust
pub fn get_balance(env: Env, user: Address) -> i128 {
    let key = DataKey::Balance(user);
    let balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);

    // Only bump on reads if TTL is low — writes are rare.
    env.storage().persistent().extend_ttl(&key, 50_000, 600_000);

    balance
}
```

**Pros**: Lower gas cost when TTL is healthy.
**Cons**: Requires careful threshold selection.

### Strategy 3: External TTL extension service

Run an off-chain service that periodically extends TTLs for all active entries. This keeps gas costs predictable while ensuring data preservation.

```rust
// The contract does not extend TTL internally.
// An external service calls extend_entries periodically.
pub fn read_only_view(env: Env, key: Symbol) -> i128 {
    env.storage().persistent().get(&key).unwrap_or(0)
}
```

**Pros**: Lowest gas cost for contract users.
**Cons**: Requires infrastructure, introduces operational risk.

### Strategy 4: Use instance storage for small, stable data

Instance storage shares TTL with the contract instance. Extending the contract's TTL keeps all instance data alive without per-key management.

```rust
// Small config data lives in instance storage.
pub fn get_config(env: Env) -> Symbol {
    env.storage().instance().get(&Symbol::new(&env, "config")).unwrap()
}

// Extend contract and instance TTL together.
pub fn maintain(env: Env) {
    env.storage().instance().extend_ttl(500_000, 6_000_000);
}
```

**Pros**: Single extension covers all instance data.
**Cons**: Limited total size, shared TTL for all entries.

## Testing TTL Extension

Use `env.ledger().with_mut` to simulate TTL behavior in tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_ttl_extension() {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.sequence_number = 100_000;
            li.min_persistent_entry_ttl = 500;
            li.min_temp_entry_ttl = 100;
            li.max_entry_ttl = 15_000;
        });

        let contract_id = env.register_contract(None, MyContract);
        let client = MyContractClient::new(&env, &contract_id);

        // Create an entry
        client.setup();

        // Verify initial TTL
        env.as_contract(&contract_id, || {
            let ttl = env.storage().persistent().get_ttl(&DataKey::MyKey);
            assert_eq!(ttl, 499); // min_persistent_entry_ttl - 1
        });

        // Extend TTL
        client.extend_persistent();

        // Verify extended TTL
        env.as_contract(&contract_id, || {
            let ttl = env.storage().persistent().get_ttl(&DataKey::MyKey);
            assert_eq!(ttl, 5_000);
        });

        // Simulate passage of time
        env.ledger().with_mut(|li| {
            li.sequence_number = 100_000 + 5_001;
        });

        // Verify entry is archived (auto-restored on access)
        env.as_contract(&contract_id, || {
            let has = env.storage().persistent().has(&DataKey::MyKey);
            assert!(has); // Auto-restored
        });
    }
}
```

## Cost Considerations

### Rent fees

Stellar charges rent fees for ledger entries based on their size and TTL. Higher TTL means higher rent. The fee structure incentivizes:

- Using the minimum necessary TTL.
- Cleaning up entries that are no longer needed.
- Using temporary storage for short-lived data.

### Restoration costs

Accessing an archived entry incurs additional costs:

- **Disk read bytes**: Reading the archived data from the ESS.
- **Write bytes**: Writing the restored data back to the active ledger.
- **Write entries**: One write entry per restored key.

These costs can be significant for contracts that frequently access many archived entries.

### Optimization tips

- **Extend only when needed**: Use conditional extension (`min_ttl` parameter) to avoid unnecessary bumps.
- **Batch operations**: Restore multiple entries in a single transaction to amortize overhead.
- **Clean up expired data**: Remove entries that are no longer needed instead of extending their TTL indefinitely.
- **Choose the right storage type**: Temporary storage is cheaper and automatically cleaned up.

## Common Patterns

### Session-based TTL

For session-scoped data (e.g., temporary authorizations, cached computations), use temporary storage with a TTL matching the session duration:

```rust
pub fn create_session(env: Env, user: Address, duration: u32) {
    let key = DataKey::Session(user);
    env.storage().temporary().set(&key, &SessionData { active: true });

    // Ensure the session entry lives for the full duration.
    let ttl = duration;
    env.storage().temporary().extend_ttl(&key, ttl, ttl);
}
```

### Tiered TTL management

Use different TTL strategies for different data types:

```rust
// Hot data: extend on every access
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
    // ... transfer logic ...
    env.storage().persistent().extend_ttl(&from_key, 100_000, 600_000);
    env.storage().persistent().extend_ttl(&to_key, 100_000, 600_000);
}

// Cold data: extend only when below threshold
pub fn get_metadata(env: Env, token: Address) -> TokenMetadata {
    let key = DataKey::Metadata(token);
    let meta: TokenMetadata = env.storage().persistent().get(&key).unwrap();
    env.storage().persistent().extend_ttl(&key, 200_000, 6_000_000);
    meta
}
```

### Cleanup on expiry

When you detect that an entry has expired (or is about to), clean up associated state:

```rust
pub fn claim_expired(env: Env, user: Address) {
    let key = DataKey::Bid(user);
    if !env.storage().temporary().has(&key) {
        // Entry has expired and been deleted.
        // Clean up any dependent state.
        let refund_key = DataKey::Refund(user);
        if let Some(refund) = env.storage().persistent().get(&refund_key) {
            // Process refund...
            env.storage().persistent().remove(&refund_key);
        }
    }
}
```

## Anti-Patterns

### ❌ Relying on temporary storage TTL for time-based invariants

Temporary storage TTL is **not** a reliable time mechanism. Anyone can extend a temporary entry's TTL, and the entry might expire before or after the expected time due to network conditions.

```rust
// WRONG: TTL expiry is not a reliable enforcement mechanism.
pub fn validate_bid(env: Env, user: Address) -> bool {
    // This entry might have been extended by someone else.
    env.storage().temporary().has(&DataKey::Bid(user))
}
```

**Instead**: Store the expiration timestamp in the entry data and validate it explicitly.

### ❌ Forgetting to extend TTL

If a contract stores critical data in persistent storage but never extends its TTL, the data will eventually be archived. While auto-restoration works, it increases costs unpredictably.

```rust
// WRONG: No TTL extension — data may be archived.
pub fn save_balance(env: Env, user: Address, amount: i128) {
    env.storage().persistent().set(&DataKey::Balance(user), &amount);
}
```

**Instead**: Always extend TTL for critical persistent data.

### ❌ Extending TTL on every read

Extending TTL on every read operation increases gas costs unnecessarily. The conditional extension pattern is more efficient.

```rust
// EXPENSIVE: Extends TTL on every read.
pub fn get_balance(env: Env, user: Address) -> i128 {
    let key = DataKey::Balance(user);
    let balance = env.storage().persistent().get(&key).unwrap_or(0);
    env.storage().persistent().extend_ttl(&key, 100_000, 600_000);
    balance
}
```

**Instead**: Use conditional extension or extend only on writes.

## Related Resources

- [Storage Patterns](/docs/concepts/storage) — Choosing between instance, persistent, and temporary storage
- [Gas and Resource Management](/docs/concepts/gas-and-resources) — Understanding storage cost drivers
- [Gas and Resource Management](/docs/concepts/gas-and-resources) — Storage cost drivers
- [Authorization](/docs/concepts/authorization) — Access control and state management
- [Optimization Playbook](/docs/patterns/optimization-playbook) — Gas optimization strategies
- [Soroban Storage Docs](https://developers.stellar.org/docs/build/guides/storage/choosing-the-right-storage) — Official Stellar documentation on storage types
