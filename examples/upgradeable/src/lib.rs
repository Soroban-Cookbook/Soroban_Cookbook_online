#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Value,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotAuthorized = 1,
}

#[contract]
pub struct Upgradeable;

#[contractimpl]
impl Upgradeable {
    /// Store the admin address at deployment time.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Value, &0u32);
    }

    /// Return the contract version (v1).
    pub fn version() -> u32 {
        1
    }

    /// Read the stored counter value.
    pub fn get_value(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Value).unwrap_or(0)
    }

    /// Update the stored counter value.
    pub fn set_value(env: Env, value: u32) {
        env.storage().instance().set(&DataKey::Value, &value);
    }

    /// Replace the contract Wasm with a new version. Only the admin may call this.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }
}

#[cfg(test)]
mod test;
