#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Env};

#[contract]
pub struct TinyContract;

#[contractimpl]
impl TinyContract {
    /// Return a compact fixed value.
    pub fn ping() -> u32 {
        42
    }

    /// Add two numbers without touching storage.
    pub fn add(a: u32, b: u32) -> u32 {
        a + b
    }

    /// Increment a single instance key and return the new value.
    pub fn increment(env: Env) -> u32 {
        let key = symbol_short!("count");
        let current: u32 = env.storage().instance().get(&key).unwrap_or(0);
        let next = current + 1;
        env.storage().instance().set(&key, &next);
        next
    }

    /// Return the current stored count.
    pub fn get(env: Env) -> u32 {
        let key = symbol_short!("count");
        env.storage().instance().get(&key).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_ping_returns_fixed_value() {
        let env = Env::default();
        let contract_id = env.register(TinyContract, ());
        let client = TinyContractClient::new(&env, &contract_id);

        assert_eq!(client.ping(), 42);
    }

    #[test]
    fn test_add_sums_values() {
        let env = Env::default();
        let contract_id = env.register(TinyContract, ());
        let client = TinyContractClient::new(&env, &contract_id);

        assert_eq!(client.add(&1, &2), 3);
        assert_eq!(client.add(&10, &32), 42);
    }

    #[test]
    fn test_increment_and_get_track_storage() {
        let env = Env::default();
        let contract_id = env.register(TinyContract, ());
        let client = TinyContractClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
        assert_eq!(client.increment(), 1);
        assert_eq!(client.get(), 1);
        assert_eq!(client.increment(), 2);
        assert_eq!(client.get(), 2);
    }
}
