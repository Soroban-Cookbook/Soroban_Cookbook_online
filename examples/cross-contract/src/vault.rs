//! Vault contract that demonstrates cross-contract invocation patterns.
//! 
//! This contract shows:
//! - Safe cross-contract calls using typed clients
//! - Error handling with try_* methods
//! - Reentrancy protection through proper state management
//! - Fallback mechanisms for external contract failures

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};
use crate::token::{TokenClient, TokenError};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    TokenContract,
    Admin,
    UserBalance(Address),
    EmergencyMode,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VaultError {
    /// Contract not initialized
    NotInitialized = 1,
    /// Insufficient vault balance
    InsufficientBalance = 2,
    /// Unauthorized access
    Unauthorized = 3,
    /// External contract call failed
    ExternalCallFailed = 4,
    /// Emergency mode is active
    EmergencyMode = 5,
    /// Invalid amount
    InvalidAmount = 6,
}

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    /// Initialize the vault with a token contract and admin
    pub fn initialize(env: Env, token_contract: Address, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        // Validate the token contract by attempting a call
        let token_client = TokenClient::new(&env, &token_contract);
        let _admin = token_client.admin(); // This will panic if wrong interface
        
        env.storage().instance().set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EmergencyMode, &false);
    }

    /// Deposit tokens into the vault
    /// Demonstrates proper state management before cross-contract calls
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), VaultError> {
        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        // Check emergency mode first
        if Self::is_emergency_mode(env.clone()) {
            return Err(VaultError::EmergencyMode);
        }

        let token_contract: Address = env.storage().instance()
            .get(&DataKey::TokenContract)
            .ok_or(VaultError::NotInitialized)?;

        // Update user's vault balance BEFORE the cross-contract call (reentrancy protection)
        let current_balance = Self::user_balance(env.clone(), from.clone());
        let new_balance = current_balance + amount;
        env.storage().persistent().set(&DataKey::UserBalance(from.clone()), &new_balance);

        // Now make the cross-contract call to transfer tokens to the vault
        let token_client = TokenClient::new(&env, &token_contract);
        
        match token_client.try_transfer(&from, &env.current_contract_address(), &amount) {
            Ok(Ok(())) => {
                // Success - emit deposit event
                env.events().publish(
                    (Symbol::new(&env, "deposit"), env.current_contract_address()),
                    (from, amount)
                );
                Ok(())
            },
            Ok(Err(_token_error)) | Err(_host_error) => {
                // Revert the state change since the token transfer failed
                env.storage().persistent().set(&DataKey::UserBalance(from), &current_balance);
                Err(VaultError::ExternalCallFailed)
            }
        }
    }

    /// Withdraw tokens from the vault with fallback mechanisms
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), VaultError> {
        to.require_auth();

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        if Self::is_emergency_mode(env.clone()) {
            return Err(VaultError::EmergencyMode);
        }

        let current_balance = Self::user_balance(env.clone(), to.clone());
        if current_balance < amount {
            return Err(VaultError::InsufficientBalance);
        }

        let token_contract: Address = env.storage().instance()
            .get(&DataKey::TokenContract)
            .ok_or(VaultError::NotInitialized)?;

        // Update balance first (reentrancy protection)
        let new_balance = current_balance - amount;
        env.storage().persistent().set(&DataKey::UserBalance(to.clone()), &new_balance);

        // Attempt the withdrawal
        let token_client = TokenClient::new(&env, &token_contract);
        
        match token_client.try_transfer(&env.current_contract_address(), &to, &amount) {
            Ok(Ok(())) => {
                // Success
                env.events().publish(
                    (Symbol::new(&env, "withdraw"), env.current_contract_address()),
                    (to, amount)
                );
                Ok(())
            },
            Ok(Err(_token_error)) | Err(_host_error) => {
                // Revert the balance change
                env.storage().persistent().set(&DataKey::UserBalance(to), &current_balance);
                Err(VaultError::ExternalCallFailed)
            }
        }
    }

    /// Emergency withdrawal that bypasses normal token transfer
    /// Demonstrates graceful degradation when external calls fail
    pub fn emergency_withdraw(env: Env, to: Address) -> Result<i128, VaultError> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(VaultError::NotInitialized)?;
        admin.require_auth();

        let balance = Self::user_balance(env.clone(), to.clone());
        if balance > 0 {
            env.storage().persistent().remove(&DataKey::UserBalance(to.clone()));
            env.events().publish(
                (Symbol::new(&env, "emergency_withdraw"), env.current_contract_address()),
                (to, balance)
            );
        }
        
        Ok(balance)
    }

    /// Demonstrate calling an external contract that might fail
    pub fn risky_external_call(env: Env, should_fail: bool) -> Result<i128, VaultError> {
        let token_contract: Address = env.storage().instance()
            .get(&DataKey::TokenContract)
            .ok_or(VaultError::NotInitialized)?;

        let token_client = TokenClient::new(&env, &token_contract);
        
        // Use try_* method to handle potential failure
        match token_client.try_risky_operation(&should_fail) {
            Ok(Ok(result)) => Ok(result),
            Ok(Err(_contract_error)) => {
                // Contract returned an error - handle gracefully
                Ok(-1) // Fallback value
            },
            Err(_host_error) => {
                // Host-level error (panic, budget, etc.) - enable emergency mode
                env.storage().instance().set(&DataKey::EmergencyMode, &true);
                Err(VaultError::ExternalCallFailed)
            }
        }
    }

    /// Get user's balance in the vault
    pub fn user_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent()
            .get(&DataKey::UserBalance(user))
            .unwrap_or(0)
    }

    /// Check if emergency mode is active
    pub fn is_emergency_mode(env: Env) -> bool {
        env.storage().instance()
            .get(&DataKey::EmergencyMode)
            .unwrap_or(false)
    }

    /// Get the token contract address
    pub fn token_contract(env: Env) -> Result<Address, VaultError> {
        env.storage().instance()
            .get(&DataKey::TokenContract)
            .ok_or(VaultError::NotInitialized)
    }

    /// Admin function to toggle emergency mode
    pub fn set_emergency_mode(env: Env, enabled: bool) -> Result<(), VaultError> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(VaultError::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::EmergencyMode, &enabled);
        
        env.events().publish(
            (Symbol::new(&env, "emergency_mode"), env.current_contract_address()),
            enabled
        );
        
        Ok(())
    }

    /// Update the token contract address (admin only)
    pub fn update_token_contract(env: Env, new_token_contract: Address) -> Result<(), VaultError> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(VaultError::NotInitialized)?;
        admin.require_auth();

        // Validate the new contract by attempting a call
        let token_client = TokenClient::new(&env, &new_token_contract);
        let _admin = token_client.admin(); // This will panic if wrong interface

        env.storage().instance().set(&DataKey::TokenContract, &new_token_contract);
        
        env.events().publish(
            (Symbol::new(&env, "token_contract_updated"), env.current_contract_address()),
            new_token_contract
        );
        
        Ok(())
    }
}