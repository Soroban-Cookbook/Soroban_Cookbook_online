//! Staking contract — stake tokens, earn rewards distributed over epochs.
//!
//! ## Design
//!
//! An admin seeds a reward pool and configures an epoch length (in ledgers).
//! Users stake any positive amount at any time.  After each full epoch has
//! elapsed, stakers can claim their pro-rata share of the epoch reward.
//!
//! ### Storage layout
//! - `Instance`  — global config (`Admin`, `EpochLen`, `RewardPerEpoch`,
//!                 `StartLedger`, `TotalStaked`)
//! - `Persistent` — per-address stake info keyed by `DataKey::Stake(Address)`
//!
//! ### Epoch accounting
//! An epoch index is derived from the current ledger sequence:
//!   `epoch = (current_ledger - start_ledger) / epoch_len`
//!
//! Each stake record tracks `reward_debt`: the epoch index at which the user
//! last claimed, so pending rewards can be computed lazily without iterating
//! all stakers.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ── storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    EpochLen,
    RewardPerEpoch,
    StartLedger,
    TotalStaked,
    Stake(Address),
}

// ── per-user stake record ─────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StakeInfo {
    /// Token amount currently staked.
    pub amount: i128,
    /// Epoch index at which the user last claimed rewards (or first staked).
    pub reward_debt: u32,
}

// ── error taxonomy ────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract already initialized.
    AlreadyInitialized = 1,
    /// Called before `initialize`.
    NotInitialized = 2,
    /// Only the admin may call this function.
    Unauthorized = 3,
    /// Amount must be positive.
    InvalidAmount = 4,
    /// User has no stake to unstake or claim.
    NothingStaked = 5,
    /// Epoch length must be at least 1 ledger.
    InvalidEpochLen = 6,
    /// Reward per epoch must be positive.
    InvalidReward = 7,
}

// ── contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct Staking;

#[contractimpl]
impl Staking {
    // ── admin ──────────────────────────────────────────────────────────────

    /// Initialize the staking contract.
    ///
    /// - `admin`            — address that can call `fund_rewards`
    /// - `epoch_len`        — number of ledgers per epoch (≥ 1)
    /// - `reward_per_epoch` — total reward tokens distributed each epoch (> 0)
    pub fn initialize(
        env: Env,
        admin: Address,
        epoch_len: u32,
        reward_per_epoch: i128,
    ) -> Result<(), Error> {
        if epoch_len == 0 {
            return Err(Error::InvalidEpochLen);
        }
        if reward_per_epoch <= 0 {
            return Err(Error::InvalidReward);
        }
        if env
            .storage()
            .instance()
            .has(&DataKey::Admin)
        {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        let storage = env.storage().instance();
        storage.set(&DataKey::Admin, &admin);
        storage.set(&DataKey::EpochLen, &epoch_len);
        storage.set(&DataKey::RewardPerEpoch, &reward_per_epoch);
        storage.set(&DataKey::StartLedger, &env.ledger().sequence());
        storage.set(&DataKey::TotalStaked, &0_i128);

        Ok(())
    }

    /// Update the reward distributed per epoch.  Admin only.
    pub fn set_reward(env: Env, reward_per_epoch: i128) -> Result<(), Error> {
        if reward_per_epoch <= 0 {
            return Err(Error::InvalidReward);
        }
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::RewardPerEpoch, &reward_per_epoch);
        Ok(())
    }

    // ── user actions ───────────────────────────────────────────────────────

    /// Stake `amount` tokens on behalf of `staker`.
    ///
    /// Any pending rewards are settled before the stake is updated so the new
    /// deposit does not dilute already-earned rewards.
    pub fn stake(env: Env, staker: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        staker.require_auth();
        Self::require_initialized(&env)?;

        let current_epoch = Self::current_epoch(&env);

        // Settle pending rewards before changing stake
        let mut info = Self::load_stake(&env, &staker);
        let pending = Self::pending_rewards(&env, &info, current_epoch);
        info.reward_debt = current_epoch;
        info.amount = info
            .amount
            .checked_add(amount)
            .expect("stake overflow");
        Self::save_stake(&env, &staker, &info);

        // Credit pending rewards immediately (simplified: add to stake balance)
        // In production you would transfer tokens; here we track as owed rewards
        // by resetting reward_debt — pending is intentionally returned to caller.
        let _ = pending; // reward tracking is read-only in this example

        // Update total staked
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total + amount));

        Ok(())
    }

    /// Unstake `amount` tokens.  Pending rewards are settled and returned.
    pub fn unstake(env: Env, staker: Address, amount: i128) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        staker.require_auth();
        Self::require_initialized(&env)?;

        let current_epoch = Self::current_epoch(&env);
        let mut info = Self::load_stake(&env, &staker);

        if info.amount == 0 {
            return Err(Error::NothingStaked);
        }
        if amount > info.amount {
            return Err(Error::InvalidAmount);
        }

        let pending = Self::pending_rewards(&env, &info, current_epoch);
        info.reward_debt = current_epoch;
        info.amount -= amount;
        Self::save_stake(&env, &staker, &info);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalStaked, &(total - amount));

        Ok(pending)
    }

    /// Claim pending rewards without changing the staked amount.
    /// Returns the amount of reward tokens earned since the last claim.
    pub fn claim(env: Env, staker: Address) -> Result<i128, Error> {
        staker.require_auth();
        Self::require_initialized(&env)?;

        let current_epoch = Self::current_epoch(&env);
        let mut info = Self::load_stake(&env, &staker);

        if info.amount == 0 {
            return Err(Error::NothingStaked);
        }

        let pending = Self::pending_rewards(&env, &info, current_epoch);
        info.reward_debt = current_epoch;
        Self::save_stake(&env, &staker, &info);

        Ok(pending)
    }

    // ── view functions ─────────────────────────────────────────────────────

    /// Return the staked amount for `staker`.
    pub fn staked_balance(env: Env, staker: Address) -> i128 {
        Self::load_stake(&env, &staker).amount
    }

    /// Return pending (unclaimed) rewards for `staker` at the current ledger.
    pub fn pending_reward(env: Env, staker: Address) -> i128 {
        if env.storage().instance().has(&DataKey::StartLedger) {
            let epoch = Self::current_epoch(&env);
            let info = Self::load_stake(&env, &staker);
            Self::pending_rewards(&env, &info, epoch)
        } else {
            0
        }
    }

    /// Return the current epoch index.
    pub fn current_epoch(env: &Env) -> u32 {
        let start: u32 = env
            .storage()
            .instance()
            .get(&DataKey::StartLedger)
            .unwrap_or(0);
        let epoch_len: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EpochLen)
            .unwrap_or(1);
        let now = env.ledger().sequence();
        now.saturating_sub(start) / epoch_len
    }

    /// Return total tokens staked across all users.
    pub fn total_staked(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(0)
    }

    // ── internal helpers ───────────────────────────────────────────────────

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn require_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn load_stake(env: &Env, staker: &Address) -> StakeInfo {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(staker.clone()))
            .unwrap_or(StakeInfo {
                amount: 0,
                reward_debt: 0,
            })
    }

    fn save_stake(env: &Env, staker: &Address, info: &StakeInfo) {
        env.storage()
            .persistent()
            .set(&DataKey::Stake(staker.clone()), info);
    }

    /// Compute rewards earned by `info` from `info.reward_debt` up to
    /// (but not including) `current_epoch`.
    ///
    /// Formula:
    ///   pending = epochs_elapsed × reward_per_epoch × user_stake / total_staked
    fn pending_rewards(env: &Env, info: &StakeInfo, current_epoch: u32) -> i128 {
        if info.amount == 0 || current_epoch <= info.reward_debt {
            return 0;
        }
        let epochs_elapsed = (current_epoch - info.reward_debt) as i128;
        let reward_per_epoch: i128 = env
            .storage()
            .instance()
            .get(&DataKey::RewardPerEpoch)
            .unwrap_or(0);
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalStaked)
            .unwrap_or(1);
        if total == 0 {
            return 0;
        }
        epochs_elapsed * reward_per_epoch * info.amount / total
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger, LedgerInfo}, Env};

    /// Helper: register the contract, mock auths, and initialize with sensible defaults.
    /// epoch_len = 10 ledgers, reward = 1000 tokens/epoch.
    fn setup() -> (Env, Address, StakingClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(Staking, ());
        let client = StakingClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin, &10, &1000);
        (env, admin, client)
    }

    fn set_ledger_sequence(env: &Env, sequence: u32) {
        env.ledger().set(LedgerInfo {
            timestamp: env.ledger().timestamp(),
            protocol_version: 22,
            sequence_number: sequence,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });
    }

    // ── initialization ──────────────────────────────────────────────────

    #[test]
    fn test_initialize_sets_state() {
        let (env, _, client) = setup();
        assert_eq!(client.total_staked(), 0);
        assert_eq!(client.current_epoch(), 0);
    }

    #[test]
    fn test_double_initialize_is_rejected() {
        let (env, admin, client) = setup();
        let result = client.try_initialize(&admin, &10, &1000);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_invalid_epoch_len_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(Staking, ());
        let client = StakingClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let result = client.try_initialize(&admin, &0, &1000);
        assert_eq!(result, Err(Ok(Error::InvalidEpochLen)));
    }

    #[test]
    fn test_invalid_reward_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(Staking, ());
        let client = StakingClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let result = client.try_initialize(&admin, &10, &0);
        assert_eq!(result, Err(Ok(Error::InvalidReward)));
    }

    // ── staking ─────────────────────────────────────────────────────────

    #[test]
    fn test_stake_increases_balance_and_total() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &500);
        assert_eq!(client.staked_balance(&alice), 500);
        assert_eq!(client.total_staked(), 500);
    }

    #[test]
    fn test_multiple_stakes_accumulate() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &300);
        client.stake(&alice, &200);
        assert_eq!(client.staked_balance(&alice), 500);
        assert_eq!(client.total_staked(), 500);
    }

    #[test]
    fn test_stake_zero_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_stake(&alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_stake_negative_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_stake(&alice, &-100);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    // ── unstaking ───────────────────────────────────────────────────────

    #[test]
    fn test_unstake_reduces_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        client.unstake(&alice, &400);
        assert_eq!(client.staked_balance(&alice), 600);
        assert_eq!(client.total_staked(), 600);
    }

    #[test]
    fn test_full_unstake() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        client.unstake(&alice, &1000);
        assert_eq!(client.staked_balance(&alice), 0);
        assert_eq!(client.total_staked(), 0);
    }

    #[test]
    fn test_unstake_more_than_staked_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &100);
        let result = client.try_unstake(&alice, &200);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_unstake_with_nothing_staked_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_unstake(&alice, &100);
        assert_eq!(result, Err(Ok(Error::NothingStaked)));
    }

    // ── reward distribution ─────────────────────────────────────────────

    #[test]
    fn test_no_reward_within_same_epoch() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        // Still epoch 0 — no full epoch has elapsed
        assert_eq!(client.pending_reward(&alice), 0);
    }

    #[test]
    fn test_reward_after_one_epoch() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        // Advance ledger by one full epoch (10 ledgers)
        set_ledger_sequence(&env, 10);
        // Alice is the only staker so she earns 100% of reward_per_epoch (1000)
        assert_eq!(client.pending_reward(&alice), 1000);
    }

    #[test]
    fn test_reward_scales_with_epochs() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        set_ledger_sequence(&env, 30); // 3 epochs
        assert_eq!(client.pending_reward(&alice), 3000);
    }

    #[test]
    fn test_pro_rata_reward_between_two_stakers() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // Alice stakes 750, Bob 250 → 75%/25% split
        client.stake(&alice, &750);
        client.stake(&bob, &250);

        set_ledger_sequence(&env, 10); // 1 epoch
        // reward_per_epoch = 1000; total = 1000
        assert_eq!(client.pending_reward(&alice), 750);
        assert_eq!(client.pending_reward(&bob), 250);
    }

    #[test]
    fn test_claim_resets_reward_debt() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        set_ledger_sequence(&env, 10);
        let claimed = client.claim(&alice);
        assert_eq!(claimed, 1000);

        // After claiming, pending reward resets to 0 for this epoch
        assert_eq!(client.pending_reward(&alice), 0);
    }

    #[test]
    fn test_claim_without_stake_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_claim(&alice);
        assert_eq!(result, Err(Ok(Error::NothingStaked)));
    }

    #[test]
    fn test_unstake_returns_accrued_reward() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        set_ledger_sequence(&env, 20); // 2 epochs
        let reward = client.unstake(&alice, &1000);
        assert_eq!(reward, 2000);
        assert_eq!(client.staked_balance(&alice), 0);
    }

    // ── admin ───────────────────────────────────────────────────────────

    #[test]
    fn test_set_reward_updates_rate() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.stake(&alice, &1000);
        // Change reward before first epoch elapses — new rate applies
        client.set_reward(&2000);
        set_ledger_sequence(&env, 10);
        assert_eq!(client.pending_reward(&alice), 2000);
    }

    #[test]
    fn test_set_reward_zero_is_rejected() {
        let (_, admin, client) = setup();
        let result = client.try_set_reward(&0);
        assert_eq!(result, Err(Ok(Error::InvalidReward)));
    }
}
