//! Simple token contract that serves as the "callee" in cross-contract invocations.
//! 
//! This contract demonstrates:
//! - Basic token operations (mint, transfer, balance)
//! - Authorization requirements
//! - Error conditions that cross-contract callers must handle

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Balance(Address),
    Admin,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TokenError {
    /// Insufficient balance for the requested operation
    InsufficientBalance = 1,
    /// Unauthorized access - caller doesn't have permission
    Unauthorized = 2,
    /// Invalid amount - cannot be negative or zero
    InvalidAmount = 3,
}

#[contract]
pub struct Token;

#[contractimpl]
impl Token {
    /// Initialize the token contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Mint new tokens to a recipient (admin only)
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), TokenError> {
        // Verify admin authorization
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if amount <= 0 {
            return Err(TokenError::InvalidAmount);
        }

        let balance = Self::balance(env.clone(), to.clone());
        let new_balance = balance + amount;
        
        env.storage().persistent().set(&DataKey::Balance(to), &new_balance);
        
        // Emit transfer event
        env.events().publish(
            (Symbol::new(&env, "transfer"), Address::from_contract_address(&env)),
            (Address::from_contract_address(&env), to, amount)
        );
        
        Ok(())
    }

    /// Transfer tokens from one address to another
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), TokenError> {
        // Require authorization from the sender
        from.require_auth();

        if amount <= 0 {
            return Err(TokenError::InvalidAmount);
        }

        let from_balance = Self::balance(env.clone(), from.clone());
        
        if from_balance < amount {
            return Err(TokenError::InsufficientBalance);
        }

        let to_balance = Self::balance(env.clone(), to.clone());
        
        // Update balances
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        
        // Emit transfer event
        env.events().publish(
            (Symbol::new(&env, "transfer"), Address::from_contract_address(&env)),
            (from, to, amount)
        );
        
        Ok(())
    }

    /// Get the balance of an address
    pub fn balance(env: Env, address: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(address))
            .unwrap_or(0)
    }

    /// Get the admin address
    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Simulate a contract that might fail unpredictably
    pub fn risky_operation(env: Env, should_fail: bool) -> Result<i128, TokenError> {
        if should_fail {
            panic!("Simulated contract failure");
        }
        
        // Return some computation
        Ok(42)
    }

    /// Simulate budget-heavy operation
    pub fn heavy_computation(env: Env, iterations: u32) -> i128 {
        let mut result = 0i128;
        for i in 0..iterations {
            result += (i as i128) * (i as i128);
        }
        result
    }
}