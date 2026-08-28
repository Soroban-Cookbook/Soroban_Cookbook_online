#![no_std]
use soroban_sdk::{contract, contractimpl, contracterror, Address, Env};

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Error {
    InvalidAmount = 1,
    InvalidAddress = 2,
    Unauthorized = 3,
    RoleNotFound = 4,
    AlreadyInitialized = 5,
    NotInitialized = 6,
    InsufficientBalance = 7,
    InsufficientAllowance = 8,
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let balance: i128 = env.storage().persistent().get(&from).unwrap_or(0);
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let new_balance = balance - amount;
        env.storage().persistent().set(&from, &new_balance);
        let to_balance: i128 = env.storage().persistent().get(&to).unwrap_or(0);
        env.storage().persistent().set(&to, &(to_balance + amount));

        Ok(())
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let balance: i128 = env.storage().persistent().get(&to).unwrap_or(0);
        env.storage().persistent().set(&to, &(balance + amount));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_invalid_amount() {
        let env = Env::default();
        let contract_id = env.register(TokenContract, ());
        let client = TokenContractClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        let result = client.try_transfer(&alice, &bob, &-10);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_insufficient_balance() {
        let env = Env::default();
        let contract_id = env.register(TokenContract, ());
        let client = TokenContractClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        let result = client.try_transfer(&alice, &bob, &100);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }

    #[test]
    fn test_successful_transfer() {
        let env = Env::default();
        let contract_id = env.register(TokenContract, ());
        let client = TokenContractClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        client.mint(&alice, &500);
        client.transfer(&alice, &bob, &200);
    }
}
