#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
    Treasury,
    FeeBps,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    InvalidFeeBps = 2,
    InvalidAmount = 3,
    InsufficientBalance = 4,
}

#[contract]
pub struct TokenWrapper;

#[contractimpl]
impl TokenWrapper {
    /// Initialize wrapper fee config.
    pub fn init(env: Env, treasury: Address, fee_bps: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Treasury) {
            return Err(Error::AlreadyInitialized);
        }
        if fee_bps > 10_000 {
            return Err(Error::InvalidFeeBps);
        }
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        Ok(())
    }

    /// Mint wrapped balance for tests/demo.
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = DataKey::Balance(to);
        let current = Self::get_balance(&env, &key);
        env.storage().persistent().set(&key, &(current + amount));
        Ok(())
    }

    /// Wrapped token balance for address.
    pub fn balance(env: Env, of: Address) -> i128 {
        Self::get_balance(&env, &DataKey::Balance(of))
    }

    /// Transfer wrapped token with protocol fee credited to treasury.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance = Self::get_balance(&env, &from_key);
        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
        let fee = amount * fee_bps as i128 / 10_000;
        let net = amount - fee;

        let to_key = DataKey::Balance(to);
        let treasury_key = DataKey::Balance(treasury);
        let to_balance = Self::get_balance(&env, &to_key);
        let treasury_balance = Self::get_balance(&env, &treasury_key);

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage().persistent().set(&to_key, &(to_balance + net));
        env.storage()
            .persistent()
            .set(&treasury_key, &(treasury_balance + fee));
        Ok(())
    }

    pub fn fee_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
    }

    pub fn treasury(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Treasury).unwrap()
    }

    fn get_balance(env: &Env, key: &DataKey) -> i128 {
        env.storage().persistent().get(key).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup() -> (Env, TokenWrapperClient<'static>, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TokenWrapper, ());
        let client = TokenWrapperClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let treasury = Address::generate(&env);
        (env, client, alice, bob, treasury)
    }

    #[test]
    fn transfer_applies_fee_to_treasury() {
        let (_env, client, alice, bob, treasury) = setup();
        client.init(&treasury, &100);
        client.mint(&alice, &1_000);

        client.transfer(&alice, &bob, &500);

        assert_eq!(client.balance(&alice), 500);
        assert_eq!(client.balance(&bob), 495);
        assert_eq!(client.balance(&treasury), 5);
    }

    #[test]
    fn init_rejects_invalid_fee() {
        let (_env, client, _alice, _bob, treasury) = setup();
        let result = client.try_init(&treasury, &20_000);
        assert_eq!(result, Err(Ok(Error::InvalidFeeBps)));
    }
}
