//! # Soulbound Token Contract
//!
//! A soulbound (non-transferable) token for Soroban. Once minted to an
//! address the token is permanently bound — transfer operations are
//! intentionally disabled and will always panic. Only the admin may mint
//! new tokens or burn (revoke) existing ones.
//!
//! **Typical use-cases:** verifiable credentials, achievement badges, KYC
//! attestations, reputation scores, and identity anchors.
//!
//! ## Related example
//! See `examples/token-transfer/` for a standard ERC-20-like token that
//! supports free transfers and allowances.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, String, Symbol,
};

// ── Storage keys ────────────────────────────────────────────────────────────

/// Persistent storage keys used by the soulbound token.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Token balance of a specific holder address.
    Balance(Address),
    /// The administrator address that controls minting and burning.
    Admin,
    /// Cumulative amount of tokens that have ever been minted minus burned.
    TotalSupply,
    /// Human-readable token name (e.g. "Soroban Contributor Badge").
    Name,
    /// Short token ticker symbol (e.g. "SCB").
    Symbol,
    /// Number of decimal places (typically 0 for credential-style tokens).
    Decimals,
}

// ── Error codes ──────────────────────────────────────────────────────────────

/// Error codes surfaced by the soulbound token contract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The caller is not the contract administrator.
    Unauthorized = 1,
    /// Amount must be a positive integer.
    InvalidAmount = 2,
    /// The holder does not have enough tokens to burn.
    InsufficientBalance = 3,
    /// The contract has already been initialized.
    AlreadyInitialized = 4,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct SoulboundToken;

#[contractimpl]
impl SoulboundToken {
    // ── Admin helpers ────────────────────────────────────────────────────────

    /// Retrieve the stored admin address, panicking if not yet initialized.
    fn get_admin(env: &Env) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("soulbound: contract not initialized")
    }

    /// Assert that `caller` is the admin and require their auth signature.
    fn require_admin(env: &Env, caller: &Address) {
        let admin = Self::get_admin(env);
        if *caller != admin {
            panic_with_error!(env, Error::Unauthorized);
        }
        caller.require_auth();
    }

    // ── Initialization ───────────────────────────────────────────────────────

    /// Initialize the soulbound token.
    ///
    /// Must be called exactly once after deployment. Stores the admin address
    /// and token metadata. Subsequent calls will panic.
    ///
    /// * `admin`    — Address that will be allowed to mint and burn tokens.
    /// * `name`     — Human-readable token name.
    /// * `symbol`   — Short ticker symbol.
    /// * `decimals` — Number of decimal places (use 0 for indivisible badges).
    pub fn initialize(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) -> Result<(), Error> {
        // Prevent re-initialization.
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Name, &name);
        env.storage().persistent().set(&DataKey::Symbol, &symbol);
        env.storage().persistent().set(&DataKey::Decimals, &decimals);
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &0_i128);

        env.events().publish(
            (Symbol::new(&env, "initialize"),),
            (admin.clone(), name.clone(), symbol.clone(), decimals),
        );

        Ok(())
    }

    // ── Minting ──────────────────────────────────────────────────────────────

    /// Mint (issue) `amount` soulbound tokens to `to`.
    ///
    /// Only the admin may call this. The minted tokens are permanently bound
    /// to `to`; they cannot be transferred away.
    ///
    /// * `admin`  — Must match the stored administrator address.
    /// * `to`     — Recipient that will receive the bound tokens.
    /// * `amount` — Positive integer amount to mint.
    pub fn mint(env: Env, admin: Address, to: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        Self::require_admin(&env, &admin);

        // Update holder balance.
        let balance_key = DataKey::Balance(to.clone());
        let current: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&balance_key, &(current + amount));

        // Update total supply.
        let supply_key = DataKey::TotalSupply;
        let supply: i128 = env
            .storage()
            .persistent()
            .get(&supply_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&supply_key, &(supply + amount));

        env.events()
            .publish((symbol_short!("mint"), to.clone()), (admin.clone(), amount));

        Ok(())
    }

    // ── Non-transfer enforcement ─────────────────────────────────────────────

    /// **Soulbound tokens cannot be transferred.**
    ///
    /// This function always panics to enforce the non-transferability invariant.
    /// It exists in the public interface so that clients expecting a standard
    /// token interface receive a clear, descriptive error rather than a missing-
    /// function error.
    ///
    /// See `examples/token-transfer/` for a freely-transferable token.
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {
        panic!("soulbound: transfer not allowed — tokens are permanently bound to the holder");
    }

    /// **Soulbound tokens cannot be transferred via allowance.**
    ///
    /// Like `transfer`, this always panics. Soulbound tokens do not support
    /// the approve/transferFrom delegation pattern.
    pub fn transfer_from(
        _env: Env,
        _spender: Address,
        _from: Address,
        _to: Address,
        _amount: i128,
    ) {
        panic!("soulbound: transfer_from not allowed — tokens are permanently bound to the holder");
    }

    // ── Burning (admin revocation) ────────────────────────────────────────────

    /// Burn (revoke) `amount` soulbound tokens from `from`.
    ///
    /// Only the admin may revoke tokens. This is useful for revoking
    /// credentials that were issued in error or have expired.
    ///
    /// * `admin`  — Must match the stored administrator address.
    /// * `from`   — Address whose token balance will be reduced.
    /// * `amount` — Positive integer amount to burn.
    pub fn burn(env: Env, admin: Address, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        Self::require_admin(&env, &admin);

        let balance_key = DataKey::Balance(from.clone());
        let current: i128 = env
            .storage()
            .persistent()
            .get(&balance_key)
            .unwrap_or(0);

        if current < amount {
            return Err(Error::InsufficientBalance);
        }

        env.storage()
            .persistent()
            .set(&balance_key, &(current - amount));

        let supply_key = DataKey::TotalSupply;
        let supply: i128 = env
            .storage()
            .persistent()
            .get(&supply_key)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&supply_key, &(supply - amount));

        env.events()
            .publish((symbol_short!("burn"), from.clone()), (admin.clone(), amount));

        Ok(())
    }

    // ── Read-only queries ────────────────────────────────────────────────────

    /// Return the token balance of `of`.
    pub fn balance(env: Env, of: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(of))
            .unwrap_or(0)
    }

    /// Return the human-readable token name.
    pub fn name(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Name)
            .expect("soulbound: not initialized")
    }

    /// Return the short ticker symbol.
    pub fn symbol(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Symbol)
            .expect("soulbound: not initialized")
    }

    /// Return the number of decimal places.
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Decimals)
            .expect("soulbound: not initialized")
    }

    /// Return the current total token supply.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Return the administrator address.
    pub fn admin(env: Env) -> Address {
        Self::get_admin(&env)
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    // ── Test helpers ─────────────────────────────────────────────────────────

    fn setup() -> (Env, Address, SoulboundTokenClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(SoulboundToken, ());
        let client = SoulboundTokenClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        // In Soroban SDK 27 the generated client for Result<(), Error> returns
        // () on success and panics on error — no .unwrap() needed.
        client.initialize(
            &admin,
            &String::from_str(&env, "Soroban Contributor Badge"),
            &String::from_str(&env, "SCB"),
            &0,
        );

        (env, admin, client)
    }

    // ── Initialization ───────────────────────────────────────────────────────

    #[test]
    fn test_initialize_stores_metadata() {
        let (env, admin, client) = setup();

        assert_eq!(client.name(), String::from_str(&env, "Soroban Contributor Badge"));
        assert_eq!(client.symbol(), String::from_str(&env, "SCB"));
        assert_eq!(client.decimals(), 0);
        assert_eq!(client.admin(), admin);
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    fn test_initialize_cannot_be_called_twice() {
        let (env, admin, client) = setup();

        let result = client.try_initialize(
            &admin,
            &String::from_str(&env, "Another Badge"),
            &String::from_str(&env, "AB"),
            &0,
        );

        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    // ── Minting ──────────────────────────────────────────────────────────────

    #[test]
    fn test_mint_increases_balance() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &1);

        assert_eq!(client.balance(&alice), 1);
    }

    #[test]
    fn test_mint_increases_total_supply() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&admin, &alice, &1);
        client.mint(&admin, &bob, &2);

        assert_eq!(client.total_supply(), 3);
    }

    #[test]
    fn test_mint_accumulates_for_same_holder() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &5);
        client.mint(&admin, &alice, &3);

        assert_eq!(client.balance(&alice), 8);
    }

    #[test]
    fn test_mint_unauthorized_non_admin() {
        let (env, _, client) = setup();
        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);

        // Non-admin caller should be rejected.
        let result = client.try_mint(&attacker, &victim, &1);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));

        // Victim balance must remain zero.
        assert_eq!(client.balance(&victim), 0);
    }

    #[test]
    fn test_mint_fails_on_zero_amount() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_mint(&admin, &alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_mint_fails_on_negative_amount() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_mint(&admin, &alice, &-10);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    // ── Non-transferability ──────────────────────────────────────────────────

    /// `transfer` must always panic — soulbound tokens cannot move between
    /// addresses regardless of balance, amount, or caller identity.
    /// The Soroban VM wraps the contract panic in a HostError envelope,
    /// so we assert on the panic itself rather than the exact message.
    #[test]
    #[should_panic]
    fn test_transfer_always_panics() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&admin, &alice, &1);

        // This call must panic, regardless of balance.
        client.transfer(&alice, &bob, &1);
    }

    /// `transfer_from` must always panic — the allowance/delegation pattern
    /// is also disabled for soulbound tokens.
    #[test]
    #[should_panic]
    fn test_transfer_from_always_panics() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&admin, &alice, &1);

        // Even with a spender attempting a delegated transfer, this must panic.
        client.transfer_from(&charlie, &alice, &bob, &1);
    }

    /// `transfer` panics even when the holder has zero balance — the
    /// restriction is unconditional and does not depend on state.
    #[test]
    #[should_panic]
    fn test_transfer_panics_with_zero_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // No mint — zero balance — still must panic.
        client.transfer(&alice, &bob, &0);
    }

    // ── Burning (admin revocation) ────────────────────────────────────────────

    #[test]
    fn test_burn_by_admin_decreases_balance() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &5);
        client.burn(&admin, &alice, &3);

        assert_eq!(client.balance(&alice), 2);
    }

    #[test]
    fn test_burn_by_admin_decreases_total_supply() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &10);
        assert_eq!(client.total_supply(), 10);

        client.burn(&admin, &alice, &4);
        assert_eq!(client.total_supply(), 6);
    }

    #[test]
    fn test_burn_full_balance() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &5);
        client.burn(&admin, &alice, &5);

        assert_eq!(client.balance(&alice), 0);
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    fn test_burn_unauthorized_non_admin() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        let attacker = Address::generate(&env);

        client.mint(&admin, &alice, &5);

        // Attacker cannot burn Alice's tokens.
        let result = client.try_burn(&attacker, &alice, &1);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));

        // Balance is unchanged.
        assert_eq!(client.balance(&alice), 5);
    }

    #[test]
    fn test_burn_fails_on_insufficient_balance() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &2);

        let result = client.try_burn(&admin, &alice, &10);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));

        // Balance must be unchanged.
        assert_eq!(client.balance(&alice), 2);
    }

    #[test]
    fn test_burn_fails_on_invalid_amount() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&admin, &alice, &5);

        assert_eq!(
            client.try_burn(&admin, &alice, &0),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            client.try_burn(&admin, &alice, &-1),
            Err(Ok(Error::InvalidAmount))
        );
    }

    // ── Read queries ─────────────────────────────────────────────────────────

    #[test]
    fn test_initial_balance_is_zero() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        assert_eq!(client.balance(&alice), 0);
    }

    #[test]
    fn test_initial_total_supply_is_zero() {
        let (_, _, client) = setup();
        assert_eq!(client.total_supply(), 0);
    }

    #[test]
    fn test_multiple_holders_independent_balances() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let charlie = Address::generate(&env);

        client.mint(&admin, &alice, &10);
        client.mint(&admin, &bob, &5);

        assert_eq!(client.balance(&alice), 10);
        assert_eq!(client.balance(&bob), 5);
        assert_eq!(client.balance(&charlie), 0);
        assert_eq!(client.total_supply(), 15);
    }
}
