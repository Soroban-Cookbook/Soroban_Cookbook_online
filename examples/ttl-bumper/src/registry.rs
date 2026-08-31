//! Registry module for tracking contract keys that require periodic TTL
//! maintenance.
//!
//! ## Design
//!
//! Each registered entry is stored under a composite `DataKey::Entry(contract,
//! key_name)` in `persistent` storage.  A separate `DataKey::Count` tracks the
//! total number of live registrations; this lets callers discover the population
//! size cheaply without iterating all storage slots.
//!
//! `RegistryEntry` carries the metadata the bumper needs at execution time:
//! - `contract`     – the address of the contract that owns the key
//! - `key_name`     – a short symbolic name identifying the storage key
//! - `threshold`    – ledgers-before-expiry at which a bump becomes eligible
//! - `extend_to`    – the TTL (in ledgers from now) to extend to on each bump
//!
//! Entries are stored in `persistent` storage so they survive across many
//! ledgers without themselves expiring during normal operation.  The bumper
//! contract is responsible for extending *its own* instance TTL on every
//! invocation.

use soroban_sdk::{contracttype, Address, Env, Symbol};

// ── types ──────────────────────────────────────────────────────────────────────

/// Storage keys used by the registry.
#[contracttype]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum DataKey {
    /// Admin address — only admin may register/deregister keys.
    Admin,
    /// Bounty pool balance (in stroops, i.e. 10^-7 XLM).
    BountyPool,
    /// Bounty paid per successful key extension (in stroops).
    BountyPerKey,
    /// Total number of currently registered entries.
    Count,
    /// Individual registry entry keyed by (contract address, key name).
    Entry(Address, Symbol),
}

/// A single registered maintenance target.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RegistryEntry {
    /// Address of the contract whose storage key requires maintenance.
    pub contract: Address,
    /// Short symbolic name identifying the key within that contract's storage.
    pub key_name: Symbol,
    /// Ledgers before expiry at which a bump becomes eligible.
    /// A bump attempted when `ttl_remaining > threshold` is rejected without
    /// paying out a bounty — preventing gas waste on healthy keys.
    pub threshold: u32,
    /// Target TTL (ledgers from *now*) after a successful bump.
    pub extend_to: u32,
}

// ── helpers ────────────────────────────────────────────────────────────────────

/// Persist a registry entry.  Increments `Count` if this is a new registration.
pub fn save_entry(env: &Env, entry: &RegistryEntry) {
    let key = DataKey::Entry(entry.contract.clone(), entry.key_name.clone());
    let is_new = !env.storage().persistent().has(&key);
    env.storage().persistent().set(&key, entry);
    if is_new {
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Count)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Count, &(count + 1));
    }
}

/// Load a registry entry, returning `None` if it does not exist.
pub fn load_entry(env: &Env, contract: &Address, key_name: &Symbol) -> Option<RegistryEntry> {
    env.storage()
        .persistent()
        .get(&DataKey::Entry(contract.clone(), key_name.clone()))
}

/// Remove a registry entry.  Decrements `Count` if the entry existed.
pub fn remove_entry(env: &Env, contract: &Address, key_name: &Symbol) {
    let key = DataKey::Entry(contract.clone(), key_name.clone());
    if env.storage().persistent().has(&key) {
        env.storage().persistent().remove(&key);
        let count: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Count)
            .unwrap_or(1);
        env.storage()
            .persistent()
            .set(&DataKey::Count, &count.saturating_sub(1));
    }
}

/// Return the number of currently registered entries.
pub fn entry_count(env: &Env) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::Count)
        .unwrap_or(0)
}

/// Load the bounty pool balance (stroops).
pub fn bounty_pool(env: &Env) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::BountyPool)
        .unwrap_or(0)
}

/// Overwrite the bounty pool balance.
pub fn set_bounty_pool(env: &Env, balance: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::BountyPool, &balance);
}

/// Load the per-key bounty amount (stroops).
pub fn bounty_per_key(env: &Env) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::BountyPerKey)
        .unwrap_or(0)
}

/// Overwrite the per-key bounty amount.
pub fn set_bounty_per_key(env: &Env, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::BountyPerKey, &amount);
}
