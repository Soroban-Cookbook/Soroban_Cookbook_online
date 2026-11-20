// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, Address, Env};

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
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
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

    /// Return the stored balance of `address`, or 0 when it holds none.
    pub fn balance(env: Env, address: Address) -> i128 {
        env.storage().persistent().get(&address).unwrap_or(0)
    }

    /// Demonstrates checked arithmetic: an insufficient balance is reported as
    /// the contract error [`Error::InsufficientBalance`] instead of trapping
    /// on arithmetic underflow.
    pub fn checked_transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        let balance: i128 = env.storage().persistent().get(&from).unwrap_or(0);
        let new_balance = balance
            .checked_sub(amount)
            .ok_or(Error::InsufficientBalance)?;

        if new_balance < 0 {
            return Err(Error::InsufficientBalance);
        }

        env.storage().persistent().set(&from, &new_balance);
        env.storage().persistent().set(
            &to,
            &(env.storage().persistent().get(&to).unwrap_or(0) + amount),
        );
        Ok(())
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

    #[test]
    fn test_checked_transfer_insufficient_balance_returns_contract_error() {
        let env = Env::default();
        let contract_id = env.register(TokenContract, ());
        let client = TokenContractClient::new(&env, &contract_id);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        client.mint(&alice, &50);

        // An insufficient balance is the contract error, not a host trap.
        let result = client.try_checked_transfer(&alice, &bob, &100);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));

        // The failed attempt moved nothing.
        assert_eq!(client.balance(&alice), 50);
        assert_eq!(client.balance(&bob), 0);

        // Within the balance the same entry point succeeds.
        client.checked_transfer(&alice, &bob, &30);
        assert_eq!(client.balance(&alice), 20);
        assert_eq!(client.balance(&bob), 30);
    }
}
