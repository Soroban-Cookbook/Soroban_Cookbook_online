//! # Multi-Token Vault
//!
//! A vault that holds accounting balances for **multiple different tokens**
//! simultaneously. Any address may deposit any positive amount of any token
//! address; the vault records the balance per (user, token) pair and allows
//! partial or full withdrawals at any time.
//!
//! ## What this example demonstrates
//!
//! * Using a **compound storage key** (`DataKey::Balance(Address, Address)`)
//!   to track per-user, per-token balances.
//! * Keeping a **vault-wide total** per token for quick liquidity checks.
//! * Proper **authorization** — only the depositing account may withdraw its
//!   own balance.
//! * **Input validation** and a complete **error taxonomy**.
//! * The *accounting-only* pattern: the contract records amounts in storage
//!   without performing SAC token transfers — it is intentionally scoped to
//!   teach the multi-asset ledger pattern without cross-contract complexity.
//!
//! ## Storage layout
//!
//! All entries use **instance** storage (appropriate for a single-session
//! demo).  Production vaults would use `persistent` storage and extend TTLs.
//!
//! | Key                              | Type   | Description                          |
//! |----------------------------------|--------|--------------------------------------|
//! | `Balance(user, token)`           | `i128` | Deposited balance for (user, token)  |
//! | `VaultTotal(token)`              | `i128` | Sum of all deposits for a token      |

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ─── Storage keys ─────────────────────────────────────────────────────────────

/// Storage keys for the multi-token vault.
///
/// Using a compound key `Balance(user, token)` lets us store one entry per
/// (depositor, token) pair without a nested map abstraction.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Per-user, per-token deposited balance.
    Balance(Address, Address),
    /// Vault-wide total deposits for a given token.
    VaultTotal(Address),
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Deposit or withdraw amount must be greater than zero.
    InvalidAmount = 1,
    /// Withdrawal exceeds the caller's recorded balance for that token.
    InsufficientBalance = 2,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct MultiTokenVault;

#[contractimpl]
impl MultiTokenVault {
    // ── Mutating operations ───────────────────────────────────────────────────

    /// Record a deposit of `amount` units of `token` from `depositor`.
    ///
    /// # Arguments
    /// * `depositor` – Address making the deposit; must authorise this call.
    /// * `token`     – Address of the token being deposited.
    /// * `amount`    – Number of token units to deposit (must be > 0).
    ///
    /// # Errors
    /// * [`Error::InvalidAmount`] — `amount` is zero or negative.
    pub fn deposit(env: Env, depositor: Address, token: Address, amount: i128) -> Result<(), Error> {
        depositor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let balance_key = DataKey::Balance(depositor.clone(), token.clone());
        let current: i128 = env
            .storage()
            .instance()
            .get(&balance_key)
            .unwrap_or(0_i128);
        env.storage()
            .instance()
            .set(&balance_key, &(current + amount));

        let total_key = DataKey::VaultTotal(token);
        let vault_total: i128 = env
            .storage()
            .instance()
            .get(&total_key)
            .unwrap_or(0_i128);
        env.storage()
            .instance()
            .set(&total_key, &(vault_total + amount));

        Ok(())
    }

    /// Withdraw `amount` units of `token` from the caller's balance.
    ///
    /// # Arguments
    /// * `withdrawer` – Address requesting the withdrawal; must authorise this call.
    /// * `token`      – Address of the token to withdraw.
    /// * `amount`     – Number of token units to withdraw (must be > 0).
    ///
    /// # Errors
    /// * [`Error::InvalidAmount`]       — `amount` is zero or negative.
    /// * [`Error::InsufficientBalance`] — caller's recorded balance is less than `amount`.
    pub fn withdraw(
        env: Env,
        withdrawer: Address,
        token: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        withdrawer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let balance_key = DataKey::Balance(withdrawer.clone(), token.clone());
        let current: i128 = env
            .storage()
            .instance()
            .get(&balance_key)
            .unwrap_or(0_i128);

        if current < amount {
            return Err(Error::InsufficientBalance);
        }

        // Update user balance before touching vault total (checks-effects).
        let new_balance = current - amount;
        env.storage().instance().set(&balance_key, &new_balance);

        let total_key = DataKey::VaultTotal(token);
        let vault_total: i128 = env
            .storage()
            .instance()
            .get(&total_key)
            .unwrap_or(0_i128);
        env.storage()
            .instance()
            .set(&total_key, &(vault_total - amount));

        Ok(amount)
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /// Return the deposited balance of `token` for `user`.
    ///
    /// Returns `0` if the user has never deposited that token.
    pub fn balance(env: Env, user: Address, token: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(user, token))
            .unwrap_or(0_i128)
    }

    /// Return the vault-wide total deposited balance for `token`.
    ///
    /// Returns `0` if no deposits have been recorded for that token.
    pub fn vault_total(env: Env, token: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::VaultTotal(token))
            .unwrap_or(0_i128)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    // ── helpers ───────────────────────────────────────────────────────────────

    /// Boot a fresh environment with mocked auths and a registered vault contract.
    fn setup() -> (Env, MultiTokenVaultClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(MultiTokenVault, ());
        let client = MultiTokenVaultClient::new(&env, &contract_id);
        (env, client)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // deposit
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_deposit_records_balance() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &1_000);

        assert_eq!(client.balance(&user, &token), 1_000);
    }

    #[test]
    fn test_deposit_accumulates_multiple_deposits_same_token() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &500);
        client.deposit(&user, &token, &300);

        assert_eq!(client.balance(&user, &token), 800);
    }

    #[test]
    fn test_deposit_tracks_different_tokens_independently() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token_a = Address::generate(&env);
        let token_b = Address::generate(&env);

        client.deposit(&user, &token_a, &1_000);
        client.deposit(&user, &token_b, &2_000);

        assert_eq!(client.balance(&user, &token_a), 1_000);
        assert_eq!(client.balance(&user, &token_b), 2_000);
    }

    #[test]
    fn test_deposit_tracks_different_users_same_token() {
        let (env, client) = setup();
        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user_a, &token, &400);
        client.deposit(&user_b, &token, &600);

        assert_eq!(client.balance(&user_a, &token), 400);
        assert_eq!(client.balance(&user_b, &token), 600);
    }

    #[test]
    fn test_deposit_updates_vault_total() {
        let (env, client) = setup();
        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user_a, &token, &700);
        client.deposit(&user_b, &token, &300);

        assert_eq!(client.vault_total(&token), 1_000);
    }

    #[test]
    fn test_deposit_vault_total_independent_per_token() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token_a = Address::generate(&env);
        let token_b = Address::generate(&env);

        client.deposit(&user, &token_a, &100);
        client.deposit(&user, &token_b, &999);

        assert_eq!(client.vault_total(&token_a), 100);
        assert_eq!(client.vault_total(&token_b), 999);
    }

    #[test]
    fn test_deposit_rejects_zero_amount() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        let result = client.try_deposit(&user, &token, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_deposit_rejects_negative_amount() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        let result = client.try_deposit(&user, &token, &-1);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // withdraw
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_withdraw_full_balance() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &1_000);
        let released = client.withdraw(&user, &token, &1_000);

        assert_eq!(released, 1_000);
        assert_eq!(client.balance(&user, &token), 0);
    }

    #[test]
    fn test_withdraw_partial_balance() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &1_000);
        let released = client.withdraw(&user, &token, &400);

        assert_eq!(released, 400);
        assert_eq!(client.balance(&user, &token), 600);
    }

    #[test]
    fn test_withdraw_decrements_vault_total() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &1_000);
        client.withdraw(&user, &token, &250);

        assert_eq!(client.vault_total(&token), 750);
    }

    #[test]
    fn test_withdraw_does_not_affect_other_tokens() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token_a = Address::generate(&env);
        let token_b = Address::generate(&env);

        client.deposit(&user, &token_a, &500);
        client.deposit(&user, &token_b, &800);
        client.withdraw(&user, &token_a, &200);

        assert_eq!(client.balance(&user, &token_a), 300);
        assert_eq!(client.balance(&user, &token_b), 800);
    }

    #[test]
    fn test_withdraw_does_not_affect_other_users() {
        let (env, client) = setup();
        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user_a, &token, &500);
        client.deposit(&user_b, &token, &700);
        client.withdraw(&user_a, &token, &500);

        assert_eq!(client.balance(&user_a, &token), 0);
        assert_eq!(client.balance(&user_b, &token), 700);
    }

    #[test]
    fn test_withdraw_rejects_zero_amount() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &100);
        let result = client.try_withdraw(&user, &token, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_withdraw_rejects_negative_amount() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &100);
        let result = client.try_withdraw(&user, &token, &-50);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_withdraw_rejects_overdraft() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &100);
        let result = client.try_withdraw(&user, &token, &101);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }

    #[test]
    fn test_withdraw_rejects_with_no_prior_deposit() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        let result = client.try_withdraw(&user, &token, &1);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }

    #[test]
    fn test_withdraw_after_full_withdrawal_rejects_second_attempt() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user, &token, &50);
        client.withdraw(&user, &token, &50);

        let result = client.try_withdraw(&user, &token, &1);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // balance / vault_total view helpers
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_balance_returns_zero_for_unknown_user() {
        let (env, client) = setup();
        let user = Address::generate(&env);
        let token = Address::generate(&env);

        assert_eq!(client.balance(&user, &token), 0);
    }

    #[test]
    fn test_vault_total_returns_zero_for_unknown_token() {
        let (env, client) = setup();
        let token = Address::generate(&env);

        assert_eq!(client.vault_total(&token), 0);
    }

    #[test]
    fn test_vault_total_stays_consistent_across_deposits_and_withdrawals() {
        let (env, client) = setup();
        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);
        let token = Address::generate(&env);

        client.deposit(&user_a, &token, &1_000);
        client.deposit(&user_b, &token, &500);
        client.withdraw(&user_a, &token, &200);
        client.withdraw(&user_b, &token, &100);

        // total = 1000 + 500 - 200 - 100 = 1200
        assert_eq!(client.vault_total(&token), 1_200);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // multi-token scenarios
    // ─────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_multiple_users_multiple_tokens() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let token_xlm = Address::generate(&env);
        let token_usdc = Address::generate(&env);

        // Alice deposits both tokens
        client.deposit(&alice, &token_xlm, &2_000);
        client.deposit(&alice, &token_usdc, &500);

        // Bob deposits only XLM
        client.deposit(&bob, &token_xlm, &1_500);

        // Alice partially withdraws USDC
        client.withdraw(&alice, &token_usdc, &200);

        // Verify isolated balances
        assert_eq!(client.balance(&alice, &token_xlm), 2_000);
        assert_eq!(client.balance(&alice, &token_usdc), 300);
        assert_eq!(client.balance(&bob, &token_xlm), 1_500);
        assert_eq!(client.balance(&bob, &token_usdc), 0);

        // Verify vault totals
        assert_eq!(client.vault_total(&token_xlm), 3_500);
        assert_eq!(client.vault_total(&token_usdc), 300);
    }
}
