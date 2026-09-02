#![no_std]

//! A minimal, side-by-side example of instance, persistent, and temporary
//! storage. See the README and the storage concept guide for the rent/TTL
//! trade-offs behind each choice.

use soroban_sdk::{contract, contractimpl, contracttype, Env};

#[contracttype]
pub enum DataKey {
    Record(u32),
    Cache(u32),
}

#[contract]
pub struct StorageKinds;

#[contractimpl]
impl StorageKinds {
    /// Instance storage is for a small value shared by this contract.
    pub fn set_config(env: Env, value: u32) {
        env.storage()
            .instance()
            .set(&soroban_sdk::symbol_short!("config"), &value);
    }

    pub fn config(env: Env) -> Option<u32> {
        env.storage()
            .instance()
            .get(&soroban_sdk::symbol_short!("config"))
    }

    /// Persistent storage is for user/record data that must remain available.
    pub fn set_record(env: Env, id: u32, value: u32) {
        env.storage().persistent().set(&DataKey::Record(id), &value);
    }

    pub fn record(env: Env, id: u32) -> Option<u32> {
        env.storage().persistent().get(&DataKey::Record(id))
    }

    /// Temporary storage is for data safe to lose when its TTL expires.
    pub fn set_cache(env: Env, id: u32, value: u32) {
        env.storage().temporary().set(&DataKey::Cache(id), &value);
    }

    pub fn cache(env: Env, id: u32) -> Option<u32> {
        env.storage().temporary().get(&DataKey::Cache(id))
    }

    /// Extending TTL is the rent decision: renew only data the contract still needs.
    pub fn extend_all(env: Env, id: u32, threshold: u32, extend_to: u32) {
        env.storage().instance().extend_ttl(threshold, extend_to);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Record(id), threshold, extend_to);
        env.storage()
            .temporary()
            .extend_ttl(&DataKey::Cache(id), threshold, extend_to);
    }
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::{
        storage::{Instance as _, Persistent as _, Temporary as _},
        Ledger as _,
    };

    fn setup() -> (Env, soroban_sdk::Address) {
        let env = Env::default();
        env.ledger().with_mut(|ledger| {
            ledger.sequence_number = 100;
            ledger.min_persistent_entry_ttl = 20;
            ledger.min_temp_entry_ttl = 10;
            ledger.max_entry_ttl = 100;
        });
        let id = env.register(StorageKinds, ());
        (env, id)
    }

    #[test]
    fn writes_all_three_storage_kinds() {
        let (env, id) = setup();
        let client = StorageKindsClient::new(&env, &id);
        client.set_config(&1);
        client.set_record(&7, &2);
        client.set_cache(&9, &3);
        assert_eq!(client.config(), Some(1));
        assert_eq!(client.record(&7), Some(2));
        assert_eq!(client.cache(&9), Some(3));
    }

    #[test]
    fn temporary_data_expires_while_persistent_data_remains() {
        let (env, id) = setup();
        let client = StorageKindsClient::new(&env, &id);
        client.set_record(&7, &2);
        client.set_cache(&9, &3);
        env.ledger().with_mut(|ledger| ledger.sequence_number += 11);
        assert_eq!(client.cache(&9), None);
        assert_eq!(client.record(&7), Some(2));
    }
}
