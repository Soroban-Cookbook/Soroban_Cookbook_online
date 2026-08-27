#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

/// A simple contract deployed as child instances by the factory.
#[contract]
pub struct ChildContract;

#[contractimpl]
impl ChildContract {
    /// Initialize a child contract with a name.
    pub fn init(env: Env, name: Symbol) {
        env.storage().instance().set(&symbol_short!("name"), &name);
    }

    /// Get the name of this child contract.
    pub fn get_name(env: Env) -> Symbol {
        env.storage()
            .instance()
            .get(&symbol_short!("name"))
            .unwrap_or(Symbol::new(&env, "unnamed"))
    }

    /// Get metadata about this child contract.
    pub fn get_info(env: Env) -> (Symbol, Address) {
        let name = env
            .storage()
            .instance()
            .get(&symbol_short!("name"))
            .unwrap_or(Symbol::new(&env, "unnamed"));
        let contract_id = env.current_contract_address();
        (name, contract_id)
    }
}
