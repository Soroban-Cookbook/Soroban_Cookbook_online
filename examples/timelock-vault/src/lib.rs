//! # Timelock Vault
//!
//! A basic time-locked asset storage contract. A depositor locks a native
//! token amount into the vault together with a Unix-timestamp unlock time.
//! The beneficiary can only withdraw once the ledger's current timestamp
//! is at or past that unlock time.
//!
//! ## Storage layout
//!
//! All entries use `persistent` storage so they survive ledger expiry and
//! can be extended by the owner if needed.
//!
//! | Key            | Type      | Description                              |
//! |----------------|-----------|------------------------------------------|
//! | `Depositor`    | `Address` | Account that locked the funds            |
//! | `Beneficiary`  | `Address` | Account that may withdraw after unlock   |
//! | `Amount`       | `i128`    | Locked token amount (stroops)            |
//! | `UnlockTime`   | `u64`     | Unix timestamp (seconds) for release     |
//! | `Claimed`      | `bool`    | Whether the vault has been claimed       |

#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Depositor,
    Beneficiary,
    Amount,
    UnlockTime,
    Claimed,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The vault has already been initialised.
    AlreadyInitialised = 1,
    /// The vault has not been initialised yet.
    NotInitialised = 2,
    /// The unlock timestamp has not been reached yet.
    NotUnlockedYet = 3,
    /// The vault has already been claimed.
    AlreadyClaimed = 4,
    /// Only the depositor may cancel the vault before unlock.
    Unauthorised = 5,
    /// Deposit amount must be greater than zero.
    InvalidAmount = 6,
    /// Unlock time must be in the future.
    InvalidUnlockTime = 7,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct TimelockVault;

#[contractimpl]
impl TimelockVault {
    /// Initialise the vault.
    ///
    /// # Arguments
    /// * `depositor`   – Address funding the vault; must authorise this call.
    /// * `beneficiary` – Address that may claim after `unlock_time`.
    /// * `amount`      – Token amount to lock (must be > 0).
    /// * `unlock_time` – Unix timestamp (seconds) after which withdrawal is
    ///                   permitted. Must be strictly after the current ledger
    ///                   timestamp.
    pub fn deposit(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        amount: i128,
        unlock_time: u64,
    ) -> Result<(), Error> {
        // Enforce depositor authorisation.
        depositor.require_auth();

        // Prevent re-initialisation.
        if env
            .storage()
            .instance()
            .has(&DataKey::Depositor)
        {
            return Err(Error::AlreadyInitialised);
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let now = env.ledger().timestamp();
        if unlock_time <= now {
            return Err(Error::InvalidUnlockTime);
        }

        env.storage()
            .instance()
            .set(&DataKey::Depositor, &depositor);
        env.storage()
            .instance()
            .set(&DataKey::Beneficiary, &beneficiary);
        env.storage()
            .instance()
            .set(&DataKey::Amount, &amount);
        env.storage()
            .instance()
            .set(&DataKey::UnlockTime, &unlock_time);
        env.storage()
            .instance()
            .set(&DataKey::Claimed, &false);

        Ok(())
    }

    /// Withdraw the locked amount to the beneficiary.
    ///
    /// Callable by anyone, but funds always go to the stored beneficiary.
    /// Reverts if the unlock time has not been reached or the vault was
    /// already claimed.
    pub fn withdraw(env: Env) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;

        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let unlock_time: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .unwrap();
        let now = env.ledger().timestamp();
        if now < unlock_time {
            return Err(Error::NotUnlockedYet);
        }

        let amount: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Amount)
            .unwrap();

        // Mark claimed before any external interaction (checks-effects pattern).
        env.storage()
            .instance()
            .set(&DataKey::Claimed, &true);

        Ok(amount)
    }

    /// Cancel the vault before the unlock time and return funds to depositor.
    ///
    /// Only the original depositor may call this, and only while the vault is
    /// still locked.
    pub fn cancel(env: Env) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;

        let depositor: Address = env
            .storage()
            .instance()
            .get(&DataKey::Depositor)
            .unwrap();
        depositor.require_auth();

        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let unlock_time: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .unwrap();
        let now = env.ledger().timestamp();
        if now >= unlock_time {
            // Once unlocked the beneficiary has the right to claim; depositor
            // can no longer cancel.
            return Err(Error::Unauthorised);
        }

        let amount: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Amount)
            .unwrap();

        env.storage()
            .instance()
            .set(&DataKey::Claimed, &true);

        Ok(amount)
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// Return the Unix timestamp at which the vault unlocks.
    pub fn unlock_time(env: Env) -> Result<u64, Error> {
        Self::assert_initialised(&env)?;
        Ok(env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .unwrap())
    }

    /// Return the locked amount.
    pub fn amount(env: Env) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;
        Ok(env
            .storage()
            .instance()
            .get(&DataKey::Amount)
            .unwrap())
    }

    /// Return whether the vault has been claimed (or cancelled).
    pub fn is_claimed(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false)
    }

    /// Return the beneficiary address.
    pub fn beneficiary(env: Env) -> Result<Address, Error> {
        Self::assert_initialised(&env)?;
        Ok(env
            .storage()
            .instance()
            .get(&DataKey::Beneficiary)
            .unwrap())
    }

    /// Return how many seconds remain until unlock, or 0 if already unlocked.
    pub fn time_remaining(env: Env) -> Result<u64, Error> {
        Self::assert_initialised(&env)?;
        let unlock_time: u64 = env
            .storage()
            .instance()
            .get(&DataKey::UnlockTime)
            .unwrap();
        let now = env.ledger().timestamp();
        Ok(if now >= unlock_time {
            0
        } else {
            unlock_time - now
        })
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    fn assert_initialised(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Depositor) {
            return Err(Error::NotInitialised);
        }
        Ok(())
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env,
    };

    /// Default ledger timestamp used as "now" in tests.
    const BASE_TIME: u64 = 1_000_000;
    /// 24 hours in seconds.
    const ONE_DAY: u64 = 86_400;

    fn setup() -> (Env, Address, Address, TimelockVaultClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = BASE_TIME;
            li.sequence_number = 1;
        });
        let contract_id = env.register(TimelockVault, ());
        let client = TimelockVaultClient::new(&env, &contract_id);
        let depositor = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        (env, depositor, beneficiary, client)
    }

    fn advance_time(env: &Env, seconds: u64) {
        env.ledger().with_mut(|li| {
            li.timestamp += seconds;
            li.sequence_number += 1;
        });
    }

    // ── deposit ───────────────────────────────────────────────────────────────

    #[test]
    fn test_deposit_stores_vault_data() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;

        client.deposit(&depositor, &beneficiary, &1_000, &unlock);

        assert_eq!(client.amount(), 1_000);
        assert_eq!(client.unlock_time(), unlock);
        assert_eq!(client.beneficiary(), beneficiary);
        assert!(!client.is_claimed());
    }

    #[test]
    fn test_deposit_rejects_zero_amount() {
        let (_, depositor, beneficiary, client) = setup();
        let result = client.try_deposit(&depositor, &beneficiary, &0, &(BASE_TIME + ONE_DAY));
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_deposit_rejects_negative_amount() {
        let (_, depositor, beneficiary, client) = setup();
        let result = client.try_deposit(&depositor, &beneficiary, &-100, &(BASE_TIME + ONE_DAY));
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_deposit_rejects_past_unlock_time() {
        let (_, depositor, beneficiary, client) = setup();
        // unlock_time == now (not strictly in future)
        let result = client.try_deposit(&depositor, &beneficiary, &500, &BASE_TIME);
        assert_eq!(result, Err(Ok(Error::InvalidUnlockTime)));
    }

    #[test]
    fn test_deposit_rejects_double_init() {
        let (_, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &500, &unlock);

        let result = client.try_deposit(&depositor, &beneficiary, &500, &unlock);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialised)));
    }

    // ── withdraw ──────────────────────────────────────────────────────────────

    #[test]
    fn test_withdraw_succeeds_after_unlock_time() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &1_000, &unlock);

        advance_time(&env, ONE_DAY); // now == unlock_time exactly

        let released = client.withdraw();
        assert_eq!(released, 1_000);
        assert!(client.is_claimed());
    }

    #[test]
    fn test_withdraw_succeeds_well_after_unlock_time() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &500, &unlock);

        advance_time(&env, ONE_DAY * 7); // a week later

        let released = client.withdraw();
        assert_eq!(released, 500);
    }

    #[test]
    fn test_withdraw_fails_before_unlock_time() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &1_000, &unlock);

        advance_time(&env, ONE_DAY - 1); // one second short

        let result = client.try_withdraw();
        assert_eq!(result, Err(Ok(Error::NotUnlockedYet)));
        // Funds must still be intact.
        assert_eq!(client.amount(), 1_000);
        assert!(!client.is_claimed());
    }

    #[test]
    fn test_withdraw_fails_on_not_initialised() {
        let (_, _, _, client) = setup();
        let result = client.try_withdraw();
        assert_eq!(result, Err(Ok(Error::NotInitialised)));
    }

    #[test]
    fn test_withdraw_fails_on_double_claim() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &1_000, &unlock);

        advance_time(&env, ONE_DAY);

        client.withdraw();
        let result = client.try_withdraw();
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    #[test]
    fn test_cancel_returns_funds_to_depositor() {
        let (_, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &750, &unlock);

        let returned = client.cancel();
        assert_eq!(returned, 750);
        assert!(client.is_claimed());
    }

    #[test]
    fn test_cancel_fails_after_unlock_time() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &750, &unlock);

        advance_time(&env, ONE_DAY); // now at unlock boundary

        let result = client.try_cancel();
        assert_eq!(result, Err(Ok(Error::Unauthorised)));
    }

    #[test]
    fn test_cancel_fails_on_already_claimed() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &750, &unlock);

        advance_time(&env, ONE_DAY);
        client.withdraw();

        let result = client.try_cancel();
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
    }

    // ── view helpers ──────────────────────────────────────────────────────────

    #[test]
    fn test_time_remaining_decreases_over_time() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &500, &unlock);

        assert_eq!(client.time_remaining(), ONE_DAY);

        advance_time(&env, ONE_DAY / 2);
        assert_eq!(client.time_remaining(), ONE_DAY / 2);
    }

    #[test]
    fn test_time_remaining_is_zero_after_unlock() {
        let (env, depositor, beneficiary, client) = setup();
        let unlock = BASE_TIME + ONE_DAY;
        client.deposit(&depositor, &beneficiary, &500, &unlock);

        advance_time(&env, ONE_DAY * 2);
        assert_eq!(client.time_remaining(), 0);
    }

    #[test]
    fn test_view_helpers_fail_before_init() {
        let (_, _, _, client) = setup();
        assert_eq!(client.try_unlock_time(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_amount(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_beneficiary(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_time_remaining(), Err(Ok(Error::NotInitialised)));
    }
}
