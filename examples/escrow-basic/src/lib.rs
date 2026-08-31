//! # Escrow Basic
//!
//! A two-party escrow contract with an arbiter for dispute resolution.
//! Funds deposited by a buyer are held until either:
//!   - The **seller** is approved by the **buyer** or **arbiter** (release).
//!   - The **buyer** is approved by the **arbiter** (refund).
//!
//! ## Roles
//!
//! | Role     | Description                                             |
//! |----------|---------------------------------------------------------|
//! | Buyer    | Deposits funds and can release them to the seller.      |
//! | Seller   | Receives funds once the escrow is released.             |
//! | Arbiter  | Trusted third party that can release OR refund.         |
//!
//! ## State machine
//!
//! ```text
//!  [Created] --deposit--> [Funded]
//!  [Funded]  --release--> [Released]   (buyer or arbiter)
//!  [Funded]  --refund --> [Refunded]   (arbiter only)
//! ```
//!
//! ## Storage layout
//!
//! All entries use `persistent` storage.
//!
//! | Key        | Type      | Description                                 |
//! |------------|-----------|---------------------------------------------|
//! | `Buyer`    | `Address` | Address that deposits and can release funds |
//! | `Seller`   | `Address` | Address that receives released funds        |
//! | `Arbiter`  | `Address` | Trusted dispute resolver                    |
//! | `Token`    | `Address` | Token contract used for the escrow          |
//! | `Amount`   | `i128`    | Token amount held in escrow                 |
//! | `State`    | `State`   | Current state of the escrow                 |

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Buyer,
    Seller,
    Arbiter,
    Token,
    Amount,
    State,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EscrowState {
    /// Escrow has been initialised but no funds deposited yet.
    Created,
    /// Funds have been deposited and are held in the contract.
    Funded,
    /// Funds were released to the seller.
    Released,
    /// Funds were refunded to the buyer.
    Refunded,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Escrow has already been initialised.
    AlreadyInitialised = 1,
    /// Escrow has not been initialised yet.
    NotInitialised = 2,
    /// Deposit amount must be greater than zero.
    InvalidAmount = 3,
    /// Escrow is not in the `Funded` state; action is invalid.
    NotFunded = 4,
    /// Only the buyer or arbiter may release funds.
    UnauthorisedRelease = 5,
    /// Only the arbiter may refund funds.
    UnauthorisedRefund = 6,
    /// Escrow is already settled (released or refunded).
    AlreadySettled = 7,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowBasic;

#[contractimpl]
impl EscrowBasic {
    /// Initialise the escrow.
    ///
    /// Must be called before `deposit`. Sets up the three roles and the
    /// token to be used. Does **not** move any funds.
    ///
    /// # Arguments
    /// * `buyer`   – Deposits funds and can approve release to seller.
    /// * `seller`  – Receives funds on release.
    /// * `arbiter` – Trusted party that can release or refund.
    /// * `token`   – Contract address of the Stellar asset / SEP-41 token.
    /// * `amount`  – Amount (in token's smallest unit) to be held in escrow.
    pub fn initialise(
        env: Env,
        buyer: Address,
        seller: Address,
        arbiter: Address,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::State) {
            return Err(Error::AlreadyInitialised);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage().persistent().set(&DataKey::Buyer, &buyer);
        env.storage().persistent().set(&DataKey::Seller, &seller);
        env.storage().persistent().set(&DataKey::Arbiter, &arbiter);
        env.storage().persistent().set(&DataKey::Token, &token);
        env.storage().persistent().set(&DataKey::Amount, &amount);
        env.storage()
            .persistent()
            .set(&DataKey::State, &EscrowState::Created);

        env.events().publish(
            (Symbol::new(&env, "initialise"),),
            (buyer.clone(), seller.clone(), arbiter.clone(), token.clone(), amount),
        );

        Ok(())
    }

    /// Deposit funds into the escrow.
    ///
    /// Only the **buyer** may call this. Transfers `amount` tokens from the
    /// buyer to the contract and advances state to `Funded`.
    pub fn deposit(env: Env) -> Result<(), Error> {
        let state: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        match state {
            EscrowState::Created => {}
            EscrowState::Funded => return Err(Error::AlreadySettled),
            _ => return Err(Error::AlreadySettled),
        }

        let buyer: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Buyer)
            .ok_or(Error::NotInitialised)?;
        buyer.require_auth();

        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &env.current_contract_address(), &amount);

        env.storage()
            .persistent()
            .set(&DataKey::State, &EscrowState::Funded);

        env.events().publish((symbol_short!("deposit"),), (buyer.clone(), amount));

        Ok(())
    }

    /// Release funds to the seller.
    ///
    /// May be called by the **buyer** (happy-path approval) or the
    /// **arbiter** (dispute resolution in favour of the seller).
    pub fn release(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let state: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        if state != EscrowState::Funded {
            return Err(Error::NotFunded);
        }

        let buyer: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Buyer)
            .ok_or(Error::NotInitialised)?;
        let arbiter: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter)
            .ok_or(Error::NotInitialised)?;

        if caller != buyer && caller != arbiter {
            return Err(Error::UnauthorisedRelease);
        }

        let seller: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Seller)
            .ok_or(Error::NotInitialised)?;
        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &seller, &amount);

        env.storage()
            .persistent()
            .set(&DataKey::State, &EscrowState::Released);

        env.events().publish(
            (symbol_short!("release"),),
            (caller.clone(), seller.clone(), amount),
        );

        Ok(())
    }

    /// Refund the buyer.
    ///
    /// Only the **arbiter** may trigger a refund (dispute resolution in
    /// favour of the buyer). Returns the full escrow amount to the buyer.
    pub fn refund(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let state: EscrowState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        if state != EscrowState::Funded {
            return Err(Error::NotFunded);
        }

        let arbiter: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Arbiter)
            .ok_or(Error::NotInitialised)?;

        if caller != arbiter {
            return Err(Error::UnauthorisedRefund);
        }

        let buyer: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Buyer)
            .ok_or(Error::NotInitialised)?;
        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &buyer, &amount);

        env.storage()
            .persistent()
            .set(&DataKey::State, &EscrowState::Refunded);

        env.events().publish(
            (symbol_short!("refund"),),
            (caller.clone(), buyer.clone(), amount),
        );

        Ok(())
    }

    /// Return the current escrow state.
    pub fn get_state(env: Env) -> Option<EscrowState> {
        env.storage().persistent().get(&DataKey::State)
    }

    /// Return the amount held (or to be held) in this escrow.
    pub fn get_amount(env: Env) -> Option<i128> {
        env.storage().persistent().get(&DataKey::Amount)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        symbol_short, testutils::Address as _, token::{self, StellarAssetClient}, Address, Env, Val,
    };

    /// Helper: register a Stellar asset contract and mint tokens to `to`.
    fn create_token<'a>(
        env: &Env,
        admin: &Address,
        to: &Address,
        amount: i128,
    ) -> (Address, token::Client<'a>) {
        let contract_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let sac = StellarAssetClient::new(env, &contract_address);
        sac.mint(to, &amount);
        let client = token::Client::new(env, &contract_address);
        (contract_address, client)
    }

    /// Helper: return a fully-wired escrow ready to deposit.
    fn setup() -> (Env, Address, Address, Address, Address, EscrowBasicClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let arbiter = Address::generate(&env);

        let (token_addr, _token_client) = create_token(&env, &buyer, &buyer, 1_000);

        let contract_id = env.register(EscrowBasic, ());
        let client = EscrowBasicClient::new(&env, &contract_id);

        client
            .initialise(&buyer, &seller, &arbiter, &token_addr, &500)
            .unwrap();

        (env, buyer, seller, arbiter, token_addr, client)
    }

    // ── initialise ────────────────────────────────────────────────────────────

    #[test]
    fn test_initialise_sets_state_to_created() {
        let (_env, _buyer, _seller, _arbiter, _token, client) = setup();
        assert_eq!(client.get_state(), Some(EscrowState::Created));
    }

    #[test]
    fn test_double_initialise_fails() {
        let (env, buyer, seller, arbiter, token, client) = setup();
        let result = client.try_initialise(&buyer, &seller, &arbiter, &token, &100);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialised)));
        let _ = env; // silence unused warning
    }

    #[test]
    fn test_initialise_with_zero_amount_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        let arbiter = Address::generate(&env);
        let (token_addr, _) = create_token(&env, &buyer, &buyer, 1_000);

        let contract_id = env.register(EscrowBasic, ());
        let client = EscrowBasicClient::new(&env, &contract_id);

        let result = client.try_initialise(&buyer, &seller, &arbiter, &token_addr, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    // ── deposit ───────────────────────────────────────────────────────────────

    #[test]
    fn test_deposit_moves_tokens_and_sets_funded() {
        let (env, _buyer, _seller, _arbiter, token_addr, client) = setup();
        client.deposit().unwrap();
        assert_eq!(client.get_state(), Some(EscrowState::Funded));

        let token_client = token::Client::new(&env, &token_addr);
        // Contract holds 500; buyer retains 500.
        assert_eq!(token_client.balance(&client.address), 500);
    }

    #[test]
    fn test_double_deposit_fails() {
        let (_env, _buyer, _seller, _arbiter, _token, client) = setup();
        client.deposit().unwrap();
        let result = client.try_deposit();
        assert_eq!(result, Err(Ok(Error::AlreadySettled)));
    }

    // ── release ───────────────────────────────────────────────────────────────

    #[test]
    fn test_buyer_can_release_to_seller() {
        let (env, buyer, seller, _arbiter, token_addr, client) = setup();
        client.deposit().unwrap();
        client.release(&buyer).unwrap();

        assert_eq!(client.get_state(), Some(EscrowState::Released));
        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&seller), 500);
        assert_eq!(token_client.balance(&client.address), 0);
    }

    #[test]
    fn test_arbiter_can_release_to_seller() {
        let (env, _buyer, seller, arbiter, token_addr, client) = setup();
        client.deposit().unwrap();
        client.release(&arbiter).unwrap();

        assert_eq!(client.get_state(), Some(EscrowState::Released));
        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&seller), 500);
    }

    #[test]
    fn test_seller_cannot_release() {
        let (_env, _buyer, seller, _arbiter, _token, client) = setup();
        client.deposit().unwrap();
        let result = client.try_release(&seller);
        assert_eq!(result, Err(Ok(Error::UnauthorisedRelease)));
    }

    #[test]
    fn test_release_before_deposit_fails() {
        let (_env, buyer, _seller, _arbiter, _token, client) = setup();
        let result = client.try_release(&buyer);
        assert_eq!(result, Err(Ok(Error::NotFunded)));
    }

    #[test]
    fn test_double_release_fails() {
        let (_env, buyer, _seller, _arbiter, _token, client) = setup();
        client.deposit().unwrap();
        client.release(&buyer).unwrap();
        let result = client.try_release(&buyer);
        assert_eq!(result, Err(Ok(Error::NotFunded)));
    }

    // ── refund ────────────────────────────────────────────────────────────────

    #[test]
    fn test_arbiter_can_refund_buyer() {
        let (env, buyer, _seller, arbiter, token_addr, client) = setup();
        client.deposit().unwrap();
        client.refund(&arbiter).unwrap();

        assert_eq!(client.get_state(), Some(EscrowState::Refunded));
        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&buyer), 1_000); // buyer gets their 500 back
        assert_eq!(token_client.balance(&client.address), 0);
    }

    #[test]
    fn test_buyer_cannot_refund_self() {
        let (_env, buyer, _seller, _arbiter, _token, client) = setup();
        client.deposit().unwrap();
        let result = client.try_refund(&buyer);
        assert_eq!(result, Err(Ok(Error::UnauthorisedRefund)));
    }

    #[test]
    fn test_refund_before_deposit_fails() {
        let (_env, _buyer, _seller, arbiter, _token, client) = setup();
        let result = client.try_refund(&arbiter);
        assert_eq!(result, Err(Ok(Error::NotFunded)));
    }

    #[test]
    fn test_refund_after_release_fails() {
        let (_env, buyer, _seller, arbiter, _token, client) = setup();
        client.deposit().unwrap();
        client.release(&buyer).unwrap();
        let result = client.try_refund(&arbiter);
        assert_eq!(result, Err(Ok(Error::NotFunded)));
    }

    // ── get_amount ────────────────────────────────────────────────────────────

    #[test]
    fn test_get_amount_returns_initialised_amount() {
        let (_env, _buyer, _seller, _arbiter, _token, client) = setup();
        assert_eq!(client.get_amount(), Some(500));
    }

    // ── events ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_release_emits_event() {
        let (env, buyer, _seller, _arbiter, _token, client) = setup();
        client.deposit().unwrap();

        let before = env.events().all().len();
        client.release(&buyer).unwrap();

        let events = env.events().all();
        assert!(events.len() > before);
        let released: Vec<_> = events
            .iter()
            .filter(|e| e.1.iter().any(|v| *v == Val::from(symbol_short!("release"))))
            .collect();
        assert_eq!(released.len(), 1);
    }

    #[test]
    fn test_refund_emits_event() {
        let (env, _buyer, _seller, arbiter, _token, client) = setup();
        client.deposit().unwrap();

        let before = env.events().all().len();
        client.refund(&arbiter).unwrap();

        let events = env.events().all();
        assert!(events.len() > before);
        let refunded: Vec<_> = events
            .iter()
            .filter(|e| e.1.iter().any(|v| *v == Val::from(symbol_short!("refund"))))
            .collect();
        assert_eq!(refunded.len(), 1);
    }
}
