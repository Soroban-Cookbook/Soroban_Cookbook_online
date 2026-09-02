#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Value,
    Version,
}

#[contract]
pub struct Upgradeable;

#[contractimpl]
impl Upgradeable {
    /// Return the contract version (v2).
    pub fn version() -> u32 {
        2
    }

    /// Read the stored counter value (migrated from v1).
    pub fn get_value(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Value).unwrap_or(0)
    }

    /// New v2 feature: return the stored value doubled.
    pub fn get_value_doubled(env: Env) -> u32 {
        let value: u32 = env.storage().instance().get(&DataKey::Value).unwrap_or(0);
        value.saturating_mul(2)
    }

    /// New v2 feature: add a new field to storage.
    pub fn add_new_field(env: Env, new_value: u64) {
        env.storage().instance().set(&DataKey::Value, &new_value);
    }

    /// Replace the contract Wasm with a new version. Only the admin may call this.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Migrate storage from v1 to v2 layout.
    /// Reads the old v1 value, bumps the version byte, and stores the new format.
    /// Panics if called twice (idempotency guard).
    pub fn migrate(env: Env) {
        let version: u32 = env.storage().instance().get(&DataKey::Version).unwrap_or(0);
        if version >= 2 {
            panic!("Migration already applied");
        }
        let value: u32 = env.storage().instance().get(&DataKey::Value).unwrap_or(0);
        // Write new v2 format: version byte 2 + original value
        env.storage().instance().set(&DataKey::Version, &2u32);
        env.storage().instance().set(&DataKey::Value, &value);
    }
}
