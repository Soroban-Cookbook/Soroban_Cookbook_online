#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

const COUNTER_KEY: &str = "count";

#[contract]
pub struct Counter;

#[contractimpl]
impl Counter {
    /// Increment the counter by one and return the new value.
    pub fn increment(env: Env) -> u32 {
        let count: u32 = env
            .storage()
            .instance()
            .get(&COUNTER_KEY)
            .unwrap_or(0);
        let new_count = count + 1;
        env.storage().instance().set(&COUNTER_KEY, &new_count);
        new_count
    }

    /// Return the current counter value without modifying state.
    pub fn get(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&COUNTER_KEY)
            .unwrap_or(0)
    }

    /// Reset the counter to zero.
    pub fn reset(env: Env) {
        env.storage().instance().set(&COUNTER_KEY, &0_u32);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_initial_value_is_zero() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_increment_increases_count() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        assert_eq!(client.increment(), 1);
        assert_eq!(client.increment(), 2);
        assert_eq!(client.increment(), 3);
    }

    #[test]
    fn test_reset_returns_to_zero() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        client.increment();
        assert_eq!(client.get(), 2);

        client.reset();
        assert_eq!(client.get(), 0);
    }

    #[test]
    fn test_get_does_not_change_state() {
        let env = Env::default();
        let contract_id = env.register(Counter, ());
        let client = CounterClient::new(&env, &contract_id);

        client.increment();
        assert_eq!(client.get(), 1);
        assert_eq!(client.get(), 1);
    }
}
