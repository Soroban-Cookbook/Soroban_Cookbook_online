#![no_std]
//! Demonstrates extending TTL ("rent") on Soroban's three storage kinds,
//! and what happens when an entry's TTL runs out.
//!
//! ## Why this matters
//!
//! Every ledger entry a contract creates — instance, persistent, or
//! temporary — has a **time-to-live** (TTL), measured in ledgers. Nothing
//! extends a TTL automatically; when it reaches zero:
//!
//! - a **temporary** entry is permanently deleted. Reading it afterwards
//!   behaves exactly as if the key had never been set.
//! - a **persistent** entry (which includes the contract instance itself,
//!   and everything stored in instance storage) is *archived*, not
//!   deleted. The network transparently restores it the next time a
//!   contract call touches the key, but that restoration costs more than
//!   an ordinary read/write.
//!
//! "Paying rent" means calling `extend_ttl` — on a specific persistent or
//! temporary key, or on the whole instance — before the TTL runs out. The
//! common pattern is to extend TTLs from within the normal contract calls
//! that already touch that data, so storage the contract still cares
//! about keeps renewing itself, while storage nobody touches quietly
//! expires and stops costing rent.
//!
//! Use **temporary** storage for data your contract can safely regenerate
//! or that's only meaningful for a bounded window — rate-limit counters,
//! short-lived caches, one-time nonces. Use **persistent** storage for
//! state that must never silently disappear — balances, ownership,
//! configuration.

use soroban_sdk::{contract, contractimpl, contracttype, Env};

#[contracttype]
pub enum DataKey {
    /// Persistent storage, keyed per record.
    Record(u32),
    /// Temporary storage, keyed per cache entry.
    Cache(u32),
}

#[contract]
pub struct StorageTtl;

#[contractimpl]
impl StorageTtl {
    /// Writes one entry into instance storage, one into persistent
    /// storage, and one into temporary storage.
    pub fn setup(env: Env, record_id: u32, cache_id: u32) {
        env.storage().instance().set(&symbol_config(), &1u32);
        env.storage()
            .persistent()
            .set(&DataKey::Record(record_id), &100u32);
        env.storage()
            .temporary()
            .set(&DataKey::Cache(cache_id), &200u32);
    }

    /// Extends a persistent record's TTL to `extend_to` ledgers, but only
    /// if its current TTL is below `threshold` ledgers (a no-op
    /// otherwise). This is the "rent payment" for long-lived, important
    /// state.
    pub fn extend_record(env: Env, record_id: u32, threshold: u32, extend_to: u32) {
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Record(record_id), threshold, extend_to);
    }

    /// Extends the contract instance's own TTL. In a real deployment this
    /// also keeps every instance-storage key alive, since they all share
    /// one ledger entry with the instance.
    pub fn extend_instance(env: Env, threshold: u32, extend_to: u32) {
        env.storage().instance().extend_ttl(threshold, extend_to);
    }

    /// Extends a temporary cache entry's TTL.
    pub fn extend_cache(env: Env, cache_id: u32, threshold: u32, extend_to: u32) {
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::Cache(cache_id), threshold, extend_to);
    }

    /// Reads a persistent record. Returns `None` if it was never set.
    pub fn get_record(env: Env, record_id: u32) -> Option<u32> {
        env.storage().persistent().get(&DataKey::Record(record_id))
    }

    /// Reads a temporary cache entry. Returns `None` if it was never set
    /// *or* if its TTL has since expired — from the caller's perspective
    /// the two cases are indistinguishable, which is the point of
    /// temporary storage.
    pub fn get_cache(env: Env, cache_id: u32) -> Option<u32> {
        env.storage().temporary().get(&DataKey::Cache(cache_id))
    }
}

fn symbol_config() -> soroban_sdk::Symbol {
    // A fixed key is fine for instance storage — the contract only ever
    // has one instance.
    soroban_sdk::symbol_short!("config")
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::{
        storage::{Instance as _, Persistent as _, Temporary as _},
        Ledger as _,
    };

    /// A ledger with explicit, small TTL settings so the tests are easy to
    /// reason about (mirrors the network's real minimums, just scaled down).
    fn create_env() -> Env {
        let env = Env::default();
        env.ledger().with_mut(|li| {
            li.sequence_number = 100_000;
            li.min_persistent_entry_ttl = 500;
            li.min_temp_entry_ttl = 100;
            li.max_entry_ttl = 15_000;
        });
        env
    }

    #[test]
    fn test_new_entries_get_the_minimum_ttl() {
        let env = create_env();
        let contract_id = env.register(StorageTtl, ());
        let client = StorageTtlClient::new(&env, &contract_id);

        client.setup(&1, &1);

        env.as_contract(&contract_id, || {
            // TTL excludes the current ledger, so it's one less than the
            // `min_*_entry_ttl` configured in `create_env`.
            assert_eq!(env.storage().persistent().get_ttl(&DataKey::Record(1)), 499);
            assert_eq!(env.storage().instance().get_ttl(), 499);
            assert_eq!(env.storage().temporary().get_ttl(&DataKey::Cache(1)), 99);
        });
    }

    #[test]
    fn test_extend_ttl_pushes_expiry_out() {
        let env = create_env();
        let contract_id = env.register(StorageTtl, ());
        let client = StorageTtlClient::new(&env, &contract_id);
        client.setup(&1, &1);

        client.extend_record(&1, &1000, &5000);
        client.extend_instance(&2000, &10_000);
        client.extend_cache(&1, &3000, &7000);

        env.as_contract(&contract_id, || {
            assert_eq!(env.storage().persistent().get_ttl(&DataKey::Record(1)), 5000);
            assert_eq!(env.storage().instance().get_ttl(), 10_000);
            assert_eq!(env.storage().temporary().get_ttl(&DataKey::Cache(1)), 7000);
        });
    }

    #[test]
    fn test_extend_ttl_below_threshold_is_a_no_op() {
        let env = create_env();
        let contract_id = env.register(StorageTtl, ());
        let client = StorageTtlClient::new(&env, &contract_id);
        client.setup(&1, &1);

        client.extend_record(&1, &1000, &5000);
        // Current TTL (5000) is already above this threshold (2000), so
        // this call does nothing — it does NOT shrink the TTL back down
        // to `extend_to`.
        client.extend_record(&1, &2000, &3000);

        env.as_contract(&contract_id, || {
            assert_eq!(env.storage().persistent().get_ttl(&DataKey::Record(1)), 5000);
        });
    }

    #[test]
    fn test_temporary_entry_is_gone_after_ttl_expires() {
        let env = create_env();
        let contract_id = env.register(StorageTtl, ());
        let client = StorageTtlClient::new(&env, &contract_id);
        client.setup(&1, &1);

        client.extend_instance(&2000, &10_000);
        client.extend_cache(&1, &3000, &7000);

        // Move one ledger past the temporary entry's TTL.
        env.ledger().with_mut(|li| li.sequence_number += 7001);

        // Gone for good — this is the trade-off for temporary storage's
        // lower cost.
        assert_eq!(client.get_cache(&1), None);
        env.as_contract(&contract_id, || {
            assert!(!env.storage().temporary().has(&DataKey::Cache(1)));
        });
    }

    #[test]
    fn test_persistent_entry_is_archived_then_auto_restored() {
        let env = create_env();
        let contract_id = env.register(StorageTtl, ());
        let client = StorageTtlClient::new(&env, &contract_id);
        client.setup(&1, &1);

        client.extend_instance(&2000, &10_000);
        client.extend_record(&1, &1000, &5000);

        // Move past the persistent entry's TTL. It is archived, not
        // deleted — the data is still there, just not reachable without
        // a restore.
        env.ledger().with_mut(|li| li.sequence_number += 5001);

        // Touching the archived key restores it transparently — but at a
        // higher fee. This is what letting the TTL lapse actually costs.
        client.extend_record(&1, &1000, &5000);
        let resources = env.cost_estimate().resources();
        assert!(resources.write_bytes > 0);

        env.as_contract(&contract_id, || {
            assert_eq!(env.storage().persistent().get_ttl(&DataKey::Record(1)), 5000);
        });
        assert_eq!(client.get_record(&1), Some(100));
    }
}
