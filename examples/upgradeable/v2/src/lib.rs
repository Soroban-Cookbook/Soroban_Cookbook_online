#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Value,
}

#[contract]
pub struct Upgradeable;

#[contractimpl]
impl Upgradeable {
    /// Return the contract version (v2).
    pub fn version() -> u32 {
        2
    }

    /// Read the stored counter value (preserved from v1).
    pub fn get_value(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Value).unwrap_or(0)
    }

    /// New v2 feature: return the stored value doubled.
    pub fn get_value_doubled(env: Env) -> u32 {
        let value: u32 = env.storage().instance().get(&DataKey::Value).unwrap_or(0);
        value.saturating_mul(2)
    }

    /// Replace the contract Wasm with a new version. Only the admin may call this.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}
