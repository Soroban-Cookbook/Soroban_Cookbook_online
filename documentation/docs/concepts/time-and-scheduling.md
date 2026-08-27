---
sidebar_position: 8
title: Time & Scheduling
description: Handle timestamps, time-based logic, and scheduling patterns in Soroban smart contracts with ledger time APIs.
---

# Time & Scheduling

Soroban contracts use deterministic ledger time to implement time-based logic, scheduling patterns, and timestamp validation. Unlike off-chain systems with local clocks and timezones, Soroban provides a single canonical timestamp that all validators agree on.

## Getting Current Time

Use `env.ledger().timestamp()` to retrieve the current ledger close time as a Unix timestamp in seconds:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct TimeAware;

#[contractimpl]
impl TimeAware {
    pub fn current_time(env: Env) -> u64 {
        env.ledger().timestamp()
    }
    
    pub fn is_after(env: Env, target_time: u64) -> bool {
        env.ledger().timestamp() >= target_time
    }
}
```

## Time Properties in Soroban

- **Deterministic**: All nodes see the same timestamp for a given ledger
- **Unix timestamp**: Seconds since January 1, 1970 (UTC)
- **Monotonic**: Time never moves backward between ledgers
- **Approximate**: Ledger close time reflects network consensus, not real-time precision
- **No timezone**: All timestamps are UTC; timezone handling happens off-chain

## Time-Based Logic Patterns

### Expiration Check

Validate that an action occurs before a deadline:

```rust
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    Expired = 1,
}

#[contract]
pub struct ExpiringOffer;

#[contractimpl]
impl ExpiringOffer {
    pub fn accept_offer(env: Env, expiration: u64) -> Result<(), Error> {
        if env.ledger().timestamp() > expiration {
            return Err(Error::Expired);
        }
        // Process the offer acceptance
        Ok(())
    }
}
```

### Time Window Validation

Ensure actions happen within a valid time range:

```rust
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    TooEarly = 1,
    TooLate  = 2,
}

#[contract]
pub struct TimedAction;

#[contractimpl]
impl TimedAction {
    pub fn execute(env: Env, start_time: u64, end_time: u64) -> Result<(), Error> {
        let now = env.ledger().timestamp();
        
        if now < start_time {
            return Err(Error::TooEarly);
        }
        if now > end_time {
            return Err(Error::TooLate);
        }
        
        // Execute the time-bound action
        Ok(())
    }
}
```

### Cooldown Period

Enforce a minimum delay between actions:

```rust
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    LastAction(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    CooldownActive = 1,
}

#[contract]
pub struct CooldownContract;

const COOLDOWN_SECONDS: u64 = 3600; // 1 hour

#[contractimpl]
impl CooldownContract {
    pub fn perform_action(env: Env, user: Address) -> Result<(), Error> {
        user.require_auth();
        
        let key = DataKey::LastAction(user.clone());
        let now = env.ledger().timestamp();
        
        if let Some(last_time) = env.storage().persistent().get::<DataKey, u64>(&key) {
            if now < last_time + COOLDOWN_SECONDS {
                return Err(Error::CooldownActive);
            }
        }
        
        env.storage().persistent().set(&key, &now);
        // Perform the action
        Ok(())
    }
}
```

## Scheduling Patterns

### Time-Locked Release

Lock assets or functionality until a specific timestamp:

```rust
#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    StillLocked = 1,
}

#[contract]
pub struct TimeLock;

#[contractimpl]
impl TimeLock {
    pub fn release(env: Env, unlock_time: u64) -> Result<(), Error> {
        if env.ledger().timestamp() < unlock_time {
            return Err(Error::StillLocked);
        }
        // Release the locked resource
        Ok(())
    }
    
    pub fn time_remaining(env: Env, unlock_time: u64) -> u64 {
        let now = env.ledger().timestamp();
        if now >= unlock_time {
            0
        } else {
            unlock_time - now
        }
    }
}
```

For a complete implementation with storage, see the [Timelock Vault pattern](/docs/patterns/timelock-vault).

### Scheduled Activation

Enable features or functionality at a predetermined time:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct ScheduledFeature;

#[contractimpl]
impl ScheduledFeature {
    pub fn set_activation_time(env: Env, activation_time: u64) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "activation_time"), &activation_time);
    }
    
    pub fn is_active(env: Env) -> bool {
        if let Some(activation_time) = env.storage()
            .instance()
            .get::<Symbol, u64>(&Symbol::new(&env, "activation_time"))
        {
            env.ledger().timestamp() >= activation_time
        } else {
            false
        }
    }
}
```

### Phase-Based State Machine

Progress through states based on time milestones:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, Symbol};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Phase {
    Planning    = 0,
    Active      = 1,
    Voting      = 2,
    Completed   = 3,
}

#[contract]
pub struct PhaseContract;

#[contractimpl]
impl PhaseContract {
    pub fn initialize(env: Env, active_start: u64, voting_start: u64, completion: u64) {
        env.storage().instance().set(&Symbol::new(&env, "active_start"), &active_start);
        env.storage().instance().set(&Symbol::new(&env, "voting_start"), &voting_start);
        env.storage().instance().set(&Symbol::new(&env, "completion"), &completion);
    }
    
    pub fn current_phase(env: Env) -> Phase {
        let now = env.ledger().timestamp();
        let active_start: u64 = env.storage()
            .instance()
            .get(&Symbol::new(&env, "active_start"))
            .unwrap_or(u64::MAX);
        let voting_start: u64 = env.storage()
            .instance()
            .get(&Symbol::new(&env, "voting_start"))
            .unwrap_or(u64::MAX);
        let completion: u64 = env.storage()
            .instance()
            .get(&Symbol::new(&env, "completion"))
            .unwrap_or(u64::MAX);
        
        if now >= completion {
            Phase::Completed
        } else if now >= voting_start {
            Phase::Voting
        } else if now >= active_start {
            Phase::Active
        } else {
            Phase::Planning
        }
    }
}
```

## Timestamp Handling Best Practices

### Input Validation

Always validate timestamp inputs to prevent logic errors:

```rust
pub fn schedule_event(env: Env, event_time: u64) -> Result<(), Error> {
    let now = env.ledger().timestamp();
    
    // Reject timestamps in the past
    if event_time <= now {
        return Err(Error::InvalidTimestamp);
    }
    
    // Optional: reject timestamps too far in the future
    if event_time > now + (365 * 24 * 3600) {  // 1 year
        return Err(Error::TimestampTooFar);
    }
    
    // Store the valid timestamp
    env.storage().persistent().set(&DataKey::EventTime, &event_time);
    Ok(())
}
```

### Overflow Protection

Use checked arithmetic when calculating time differences:

```rust
pub fn calculate_duration(start: u64, end: u64) -> Result<u64, Error> {
    if end < start {
        return Err(Error::InvalidTimeRange);
    }
    Ok(end - start)
}

pub fn add_duration(base_time: u64, duration: u64) -> Result<u64, Error> {
    base_time
        .checked_add(duration)
        .ok_or(Error::TimeOverflow)
}
```

### Comparison Operators

Use appropriate comparison operators for time checks:

- `>=` for "on or after" conditions (inclusive)
- `>` for "strictly after" conditions (exclusive)
- `<=` for "on or before" conditions (inclusive)
- `<` for "strictly before" conditions (exclusive)

Be explicit about boundary cases when a timestamp exactly matches a deadline.

## Timezone Considerations

Soroban contracts operate exclusively in UTC. All timezone handling must happen off-chain:

### Off-Chain Responsibilities

- Convert user local times to Unix timestamps before contract calls
- Display contract timestamps in user-friendly formats with timezone awareness
- Handle daylight saving time transitions in the application layer

### Contract Responsibilities

- Store and compare Unix timestamps only
- Document expected timestamp formats in function comments
- Validate that input timestamps are reasonable

Example documentation:

```rust
/// Schedules an event for a future time.
///
/// # Arguments
/// * `event_time` - Unix timestamp in seconds (UTC). Must be in the future.
///
/// # Errors
/// * `InvalidTimestamp` - If event_time is not strictly greater than current ledger time
pub fn schedule_event(env: Env, event_time: u64) -> Result<(), Error> {
    // Implementation
}
```

## Time Precision and Ledger Close Time

### Ledger Close Intervals

Stellar ledgers close approximately every 5 seconds. This means:

- Time resolution is limited to 5-second granularity in practice
- Two transactions in the same ledger see identical timestamps
- Precise millisecond timing is not available

### Implications for Design

- Do not rely on microsecond or millisecond precision
- Design time windows with 30+ second margins to avoid edge cases
- For very short durations (seconds), consider using ledger sequence numbers instead

### Ledger Sequence as Alternative

When you need fine-grained ordering within short time periods:

```rust
pub fn record_action(env: Env) -> u32 {
    // Use ledger sequence number for ordering
    env.ledger().sequence()
}
```

## Common Patterns and Anti-Patterns

### ✅ Recommended Patterns

- Store timestamps in `u64` Unix seconds
- Validate timestamp inputs before storage
- Use `env.ledger().timestamp()` consistently
- Check time conditions at the start of functions
- Document timezone expectations clearly

### ❌ Anti-Patterns

- Storing time as strings or formatted dates
- Assuming millisecond precision
- Hardcoding timezone offsets in contracts
- Using timestamps for high-frequency ordering (use ledger sequence instead)
- Ignoring timestamp overflow in arithmetic

## Testing Time-Based Logic

Use `env.ledger().with_mut(|li| li.timestamp = ...)` in tests to simulate time progression:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;
    
    #[test]
    fn test_time_lock() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TimeLock);
        let client = TimeLockClient::new(&env, &contract_id);
        
        // Set initial time
        env.ledger().with_mut(|li| li.timestamp = 1000);
        
        let unlock_time = 2000;
        
        // Should fail before unlock
        assert_eq!(
            client.try_release(&unlock_time),
            Err(Ok(Error::StillLocked))
        );
        
        // Advance time
        env.ledger().with_mut(|li| li.timestamp = 2000);
        
        // Should succeed at unlock time
        assert!(client.try_release(&unlock_time).is_ok());
    }
}
```

## Related Resources

- [Timelock Vault](/docs/patterns/timelock-vault) — Complete time-locked vault implementation
- [Storage Patterns](/docs/concepts/storage) — Choosing storage types for timestamp data
- [Error Handling](/docs/concepts/error-handling) — Handling time validation errors
- [Testing Strategies](/docs/concepts/testing-strategies) — Testing time-dependent contracts

