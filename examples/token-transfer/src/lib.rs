#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
    Allowance(Address, Address), // (owner, spender)
    TotalSupply,
    Name,
    Symbol,
    Decimals,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 1,
    InvalidAmount = 2,
    SelfTransfer = 3,
    InsufficientAllowance = 4,
}

#[contract]
pub struct TokenTransfer;

#[contractimpl]
impl TokenTransfer {

    /// Initialize the token metadata.
/// This should only be called once after deployment.
pub fn initialize(
    env: Env,
    name: String,
    symbol: String,
    decimals: u32,
) {
    env.storage().persistent().set(&DataKey::Name, &name);
    env.storage().persistent().set(&DataKey::Symbol, &symbol);
    env.storage().persistent().set(&DataKey::Decimals, &decimals);
}

    /// Mint tokens to an address (for testing purposes).
    pub fn mint(env: Env, to: Address, amount: i128) {
    let key = DataKey::Balance(to.clone());
    let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
    env.storage().persistent().set(&key, &(current + amount));

    let supply_key = DataKey::TotalSupply;
    let supply: i128 = env.storage().persistent().get(&supply_key).unwrap_or(0);
    env.storage().persistent().set(&supply_key, &(supply + amount));
}

    /// Return the balance of an address.

    /// Transfer tokens from one address to another.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if from == to {
            return Err(Error::SelfTransfer);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));

        Ok(())
    }


    /// Burn tokens from an address, reducing total supply. Requires authorization from `from`.
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));

        let supply_key = DataKey::TotalSupply;
        let supply: i128 = env.storage().persistent().get(&supply_key).unwrap_or(0);
        env.storage().persistent().set(&supply_key, &(supply - amount));

        Ok(())
    }

    /// Approve another address to spend tokens on behalf of the caller.
    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) -> Result<(), Error> {
        owner.require_auth();

        if amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Allowance(owner, spender);
        env.storage().persistent().set(&key, &amount);

        Ok(())
    }

    /// Get the allowance that spender can spend on behalf of owner.
    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(owner, spender);
        env.storage().persistent().get(&key).unwrap_or(0)
    }


    /// Return the balance of an address.
    pub fn balance(env: Env, of: Address) -> i128 {
        let key = DataKey::Balance(of);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

      /// Return the token name.
    pub fn name(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Name)
            .unwrap()
    }

    /// Return the token symbol.
    pub fn symbol(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Symbol)
            .unwrap()
    }

    /// Return the number of decimals used by the token.
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Decimals)
            .unwrap()
    }

    /// Return the total supply of the token.
    pub fn total_supply(env: Env) -> i128 {
        env.storage().persistent().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    /// Transfer tokens from one address to another.
    /// Transfer tokens from one address to another using allowance.
    /// The caller must be approved to spend tokens on behalf of the from address.
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        spender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if from == to {
            return Err(Error::SelfTransfer);
        }

        // Check allowance
        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let current_allowance: i128 = env.storage().persistent().get(&allowance_key).unwrap_or(0);

        if current_allowance < amount {
            return Err(Error::InsufficientAllowance);
        }

        // Check balance
        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Update allowance
        env.storage()
            .persistent()
            .set(&allowance_key, &(current_allowance - amount));

        // Update balances
        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, soroban_sdk::Address, TokenTransferClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TokenTransfer, ());
        let client = TokenTransferClient::new(&env, &contract_id);
        (env, contract_id, client)
    }

    #[test]
    fn test_mint_increases_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        assert_eq!(client.balance(&alice), 500);
    }

    #[test]
    fn test_transfer_moves_tokens() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        client.transfer(&alice, &bob, &400);

        assert_eq!(client.balance(&alice), 600);
        assert_eq!(client.balance(&bob), 400);
    }

    #[test]
    fn test_transfer_fails_on_insufficient_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &100);
        let result = client.try_transfer(&alice, &bob, &200);

        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
        // Verify state rolled back
        assert_eq!(client.balance(&alice), 100);
        assert_eq!(client.balance(&bob), 0);
    }

    #[test]
    fn test_transfer_fails_on_invalid_amount() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &100);
        let result = client.try_transfer(&alice, &bob, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));

        let result = client.try_transfer(&alice, &bob, &-50);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_self_transfer_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &100);
        let result = client.try_transfer(&alice, &alice, &50);
        assert_eq!(result, Err(Ok(Error::SelfTransfer)));
    }

    #[test]
    fn test_initial_balance_is_zero() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        assert_eq!(client.balance(&alice), 0);
    }

    #[test]
    fn test_approve_sets_allowance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.approve(&alice, &bob, &500);
        assert_eq!(client.allowance(&alice, &bob), 500);
    }

    #[test]
    fn test_approve_overwrites_existing_allowance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.approve(&alice, &bob, &300);
        assert_eq!(client.allowance(&alice, &bob), 300);

        client.approve(&alice, &bob, &700);
        assert_eq!(client.allowance(&alice, &bob), 700);
    }

    #[test]
    fn test_approve_fails_on_negative_amount() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let result = client.try_approve(&alice, &bob, &-100);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_initial_allowance_is_zero() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        assert_eq!(client.allowance(&alice, &bob), 0);
    }

    #[test]
    fn test_transfer_from_success() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        // Alice mints tokens and approves Bob to spend them
        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &500);

        // Bob transfers from Alice to Charlie
        client.transfer_from(&bob, &alice, &charlie, &300);

        // Check balances
        assert_eq!(client.balance(&alice), 700);
        assert_eq!(client.balance(&charlie), 300);
        assert_eq!(client.balance(&bob), 0);

        // Check remaining allowance
        assert_eq!(client.allowance(&alice, &bob), 200);
    }

    #[test]
    fn test_transfer_from_fails_on_insufficient_allowance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &200);

        let result = client.try_transfer_from(&bob, &alice, &charlie, &300);
        assert_eq!(result, Err(Ok(Error::InsufficientAllowance)));

        // Verify state unchanged
        assert_eq!(client.balance(&alice), 1000);
        assert_eq!(client.balance(&charlie), 0);
        assert_eq!(client.allowance(&alice, &bob), 200);
    }

    #[test]
    fn test_transfer_from_fails_on_insufficient_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&alice, &100);
        client.approve(&alice, &bob, &500);

        let result = client.try_transfer_from(&bob, &alice, &charlie, &200);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));

        // Verify state unchanged
        assert_eq!(client.balance(&alice), 100);
        assert_eq!(client.balance(&charlie), 0);
        assert_eq!(client.allowance(&alice, &bob), 500);
    }

    #[test]
    fn test_approve_zero_revokes_allowance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.approve(&alice, &bob, &500);
        assert_eq!(client.allowance(&alice, &bob), 500);

        client.approve(&alice, &bob, &0);
        assert_eq!(client.allowance(&alice, &bob), 0);
    }

    #[test]
    fn test_initial_total_supply_is_zero() {
        let (_, _, client) = setup();
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    fn test_mint_increases_total_supply() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        assert_eq!(client.total_supply(), 500);

        client.mint(&alice, &300);
        assert_eq!(client.total_supply(), 800);
    }

    #[test]
    fn test_burn_decreases_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &1000);
        client.burn(&alice, &400);

        assert_eq!(client.balance(&alice), 600);
    }

    #[test]
    fn test_burn_decreases_total_supply() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &500);
        client.mint(&bob, &300);
        assert_eq!(client.total_supply(), 800);

        client.burn(&alice, &200);
        assert_eq!(client.total_supply(), 600);
    }

    #[test]
    fn test_burn_fails_on_insufficient_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &100);
        let result = client.try_burn(&alice, &200);

        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
        assert_eq!(client.balance(&alice), 100);
        assert_eq!(client.total_supply(), 100);
    }

    #[test]
    fn test_burn_fails_on_invalid_amount() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &100);

        let result = client.try_burn(&alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));

        let result = client.try_burn(&alice, &-50);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_burn_entire_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        client.burn(&alice, &500);

        assert_eq!(client.balance(&alice), 0);
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    fn test_transfer_from_fails_on_invalid_amount() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &500);

        let result = client.try_transfer_from(&bob, &alice, &charlie, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));

        let result = client.try_transfer_from(&bob, &alice, &charlie, &-50);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_transfer_from_fails_on_self_transfer() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &500);

        let result = client.try_transfer_from(&bob, &alice, &alice, &200);
        assert_eq!(result, Err(Ok(Error::SelfTransfer)));
    }

    #[test]
    fn test_transfer_from_with_zero_allowance_fails() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&alice, &1000);
        // No approval given

        let result = client.try_transfer_from(&bob, &alice, &charlie, &100);
        assert_eq!(result, Err(Ok(Error::InsufficientAllowance)));
    }

    #[test]
    fn test_multiple_spenders_with_different_allowances() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);
        let dave = Address::generate(&env);

        client.mint(&alice, &1000);
        client.approve(&alice, &bob, &300);
        client.approve(&alice, &charlie, &200);

        // Bob transfers
        client.transfer_from(&bob, &alice, &dave, &100);
        assert_eq!(client.allowance(&alice, &bob), 200);
        assert_eq!(client.allowance(&alice, &charlie), 200);

        // Charlie transfers
        client.transfer_from(&charlie, &alice, &dave, &150);
        assert_eq!(client.allowance(&alice, &bob), 200);
        assert_eq!(client.allowance(&alice, &charlie), 50);

        // Check final balances
        assert_eq!(client.balance(&alice), 750);
        assert_eq!(client.balance(&dave), 250);
    }
    
    #[test]
    fn test_name_returns_initialized_value() {
        let (env, _, client) = setup();

        client.initialize(
            &String::from_str(&env, "Example Token"),
            &String::from_str(&env, "EXT"),
            &7,
        );

        assert_eq!(
            client.name(),
            String::from_str(&env, "Example Token")
        );
    }

    #[test]
    fn test_symbol_returns_initialized_value() {
        let (env, _, client) = setup();

        client.initialize(
            &String::from_str(&env, "Example Token"),
            &String::from_str(&env, "EXT"),
            &7,
        );

        assert_eq!(
            client.symbol(),
            String::from_str(&env, "EXT")
        );
    }

    #[test]
    fn test_decimals_returns_initialized_value() {
        let (env, _, client) = setup();

        client.initialize(
            &String::from_str(&env, "Example Token"),
            &String::from_str(&env, "EXT"),
            &7,
        );

        assert_eq!(client.decimals(), 7);
    }

}