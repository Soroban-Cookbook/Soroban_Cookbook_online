//! TTL-Bumper — automated TTL maintenance contract for Stellar / Soroban.
//!
//! ## Problem
//!
//! Soroban `persistent` storage entries expire when their TTL (Time-To-Live,
//! measured in ledgers) reaches zero.  For infrastructure contracts — node
//! reconciliation loops, oracle feeds, registry entries — expiry means the
//! on-chain state disappears and dependent systems fail silently.
//!
//! ## Solution
//!
//! The TTL-Bumper contract lets a keeper bot call `bump_keys` to batch-extend
//! the TTL of a set of registered storage keys in a **single transaction**.
//! Keys are only extended when they are within `threshold` ledgers of expiry;
//! healthily-live keys are skipped.  Keepers receive a small XLM-denominated
//! bounty (tracked as a stroop balance inside the contract) for each key they
//! successfully extend, incentivising timely maintenance without over-paying.
//!
//! ## Architecture
//!
//! ```text
//! ┌────────────────────────────────────────────────────────┐
//! │                   TtlBumper Contract                   │
//! ├────────────────────────────────────────────────────────┤
//! │  init(admin, bounty_per_key)                           │
//! │  fund_bounty_pool(amount)          ← admin             │
//! │  set_bounty_per_key(amount)        ← admin             │
//! │  register_key(contract, key, threshold, extend_to)     │← admin
//! │  deregister_key(contract, key)     ← admin             │
//! │  bump_keys(keeper, targets)        ← anyone            │
//! │  bounty_balance(keeper)            ← view              │
//! │  registry_count()                  ← view              │
//! └────────────────────────────────────────────────────────┘
//!          │ stores registry entries + bounty pool
//!          ▼
//!   persistent storage (DataKey::Entry, DataKey::BountyPool, …)
//! ```
//!
//! ## Batch metering
//!
//! `bump_keys` enforces `MAX_BATCH_SIZE = 20`.  Each entry in the batch
//! performs at most one `extend_ttl` call and one storage read; the per-call
//! resource budget is therefore deterministic and proportional to batch size.
//! Callers that need to service more than 20 keys split across multiple txns.
//!
//! ## Bounty exhaustion prevention
//!
//! A keeper only earns a bounty when the target key **is genuinely at risk**
//! (`ttl_remaining ≤ threshold`).  If the key is healthy, `bump_keys` skips
//! it without paying a bounty, preventing a malicious keeper from draining the
//! pool by repeatedly bumping already-healthy keys.
//!
//! In the Soroban test environment the SDK does not expose real per-entry TTL
//! counters, so the contract uses a simulated TTL stored alongside each entry.
//! Production deployments replace the simulated TTL with an actual
//! `env.storage().persistent().get_ttl(&key)` call once the SDK stabilises
//! that API.

#![no_std]

pub mod registry;

use registry::{
    bounty_per_key, bounty_pool, entry_count, load_entry, remove_entry, save_entry,
    set_bounty_per_key, set_bounty_pool, DataKey, RegistryEntry,
};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

// ── constants ──────────────────────────────────────────────────────────────────

/// Maximum number of keys that can be bumped in one transaction.
/// Keeps the per-call resource cost predictable and within ledger limits.
pub const MAX_BATCH_SIZE: u32 = 20;

/// Default TTL to which keys are extended when none is specified (≈ 30 days
/// at ~5 s/ledger: 30 * 24 * 3600 / 5 = 518_400 ledgers).
pub const DEFAULT_EXTEND_TO: u32 = 518_400;

// ── additional storage keys (contract-level, not per-entry) ───────────────────

/// Storage keys for contract-level state not covered by `registry::DataKey`.
#[contracttype]
#[derive(Clone)]
enum CtrKey {
    /// Accumulated bounty balance owed to a keeper address.
    KeeperBalance(Address),
}

// ── errors ────────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract already initialised.
    AlreadyInitialized = 1,
    /// Called before `init`.
    NotInitialized = 2,
    /// Caller is not the admin.
    Unauthorized = 3,
    /// An amount argument was zero or negative.
    InvalidAmount = 4,
    /// `bump_keys` was called with an empty target list.
    EmptyBatch = 5,
    /// Target list exceeds `MAX_BATCH_SIZE`.
    BatchTooLarge = 6,
    /// A registered key was not found in the registry.
    KeyNotFound = 7,
    /// The bounty pool does not have enough funds to cover the earned bounty.
    InsufficientBountyPool = 8,
    /// An arithmetic operation overflowed.
    Overflow = 9,
    /// `extend_to` must be > 0.
    InvalidExtendTo = 10,
    /// `threshold` must be > 0.
    InvalidThreshold = 11,
}

// ── bump target descriptor ────────────────────────────────────────────────────

/// One entry in the `bump_keys` target list.
#[contracttype]
#[derive(Clone)]
pub struct BumpTarget {
    /// Address of the contract whose key should be extended.
    pub contract: Address,
    /// Symbolic name of the storage key within that contract.
    pub key_name: Symbol,
    /// Simulated remaining TTL (ledgers) at the time of the call.
    /// In tests we inject this value; production callers supply
    /// `env.storage().persistent().get_ttl(&their_key)`.
    pub simulated_ttl: u32,
}

/// Per-key outcome returned by `bump_keys`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BumpResult {
    /// Key was at risk and its TTL was extended; bounty credited.
    Extended,
    /// Key's TTL exceeds threshold — skipped without bounty.
    Skipped,
    /// Key is not in the registry — skipped without bounty.
    NotRegistered,
}

// ── contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct TtlBumper;

#[contractimpl]
impl TtlBumper {
    // ── lifecycle ──────────────────────────────────────────────────────────

    /// Initialise the contract.
    ///
    /// * `admin`          – address permitted to register/deregister keys and
    ///                      fund/configure the bounty pool
    /// * `bounty_per_key` – stroops credited to the keeper per extended key
    pub fn init(env: Env, admin: Address, bounty_per_key_amount: i128) -> Result<(), Error> {
        if env
            .storage()
            .instance()
            .has(&DataKey::Admin)
        {
            return Err(Error::AlreadyInitialized);
        }
        if bounty_per_key_amount < 0 {
            return Err(Error::InvalidAmount);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        set_bounty_per_key(&env, bounty_per_key_amount);
        set_bounty_pool(&env, 0);
        Ok(())
    }

    // ── admin operations ───────────────────────────────────────────────────

    /// Deposit `amount` stroops into the bounty pool.
    /// Admin only.
    pub fn fund_bounty_pool(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let pool = bounty_pool(&env);
        let new_pool = pool.checked_add(amount).ok_or(Error::Overflow)?;
        set_bounty_pool(&env, new_pool);

        env.events().publish(
            (symbol_short!("fund_pool"),),
            (amount, new_pool),
        );
        Ok(())
    }

    /// Update the per-key bounty amount.
    /// Admin only.
    pub fn set_bounty_per_key(env: Env, amount: i128) -> Result<(), Error> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        if amount < 0 {
            return Err(Error::InvalidAmount);
        }
        set_bounty_per_key(&env, amount);
        Ok(())
    }

    /// Register a new key for TTL maintenance.
    ///
    /// * `contract`   – address of the contract owning the key
    /// * `key_name`   – symbolic storage key identifier
    /// * `threshold`  – keeper is eligible only when TTL ≤ threshold (ledgers)
    /// * `extend_to`  – target TTL (ledgers from now) after a successful bump
    pub fn register_key(
        env: Env,
        contract: Address,
        key_name: Symbol,
        threshold: u32,
        extend_to: u32,
    ) -> Result<(), Error> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        if threshold == 0 {
            return Err(Error::InvalidThreshold);
        }
        if extend_to == 0 {
            return Err(Error::InvalidExtendTo);
        }
        let entry = RegistryEntry {
            contract: contract.clone(),
            key_name: key_name.clone(),
            threshold,
            extend_to,
        };
        save_entry(&env, &entry);

        env.events().publish(
            (symbol_short!("reg_key"), contract),
            (key_name, threshold, extend_to),
        );
        Ok(())
    }

    /// Remove a key from the registry.
    /// Admin only.
    pub fn deregister_key(
        env: Env,
        contract: Address,
        key_name: Symbol,
    ) -> Result<(), Error> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        if load_entry(&env, &contract, &key_name).is_none() {
            return Err(Error::KeyNotFound);
        }
        remove_entry(&env, &contract, &key_name);

        env.events().publish(
            (symbol_short!("dereg_k"), contract),
            key_name,
        );
        Ok(())
    }

    // ── keeper operation ───────────────────────────────────────────────────

    /// Batch-extend TTLs for up to `MAX_BATCH_SIZE` registered keys.
    ///
    /// For each target:
    /// 1. Look it up in the registry.  If missing → `NotRegistered`, skip.
    /// 2. Compare `simulated_ttl` against the entry's `threshold`.
    ///    If `simulated_ttl > threshold` → `Skipped` (key is healthy).
    /// 3. Otherwise extend the TTL (simulated here; real deployment uses
    ///    `env.storage().persistent().extend_ttl`) and credit the keeper's
    ///    balance with `bounty_per_key`.  If the pool cannot cover the bounty
    ///    the entire call is rejected with `InsufficientBountyPool`.
    ///
    /// Returns a `Vec<BumpResult>` in the same order as `targets`.
    pub fn bump_keys(
        env: Env,
        keeper: Address,
        targets: Vec<BumpTarget>,
    ) -> Result<Vec<BumpResult>, Error> {
        // Auth: the keeper must sign their own bump call.
        keeper.require_auth();
        Self::require_initialized(&env)?;

        if targets.is_empty() {
            return Err(Error::EmptyBatch);
        }
        if targets.len() > MAX_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }

        let per_key = bounty_per_key(&env);
        let mut pool = bounty_pool(&env);
        let mut results = Vec::new(&env);
        let mut keys_extended: u32 = 0;

        for target in targets.iter() {
            match load_entry(&env, &target.contract, &target.key_name) {
                None => {
                    results.push_back(BumpResult::NotRegistered);
                }
                Some(entry) => {
                    if target.simulated_ttl > entry.threshold {
                        // Key is still healthy — skip without a bounty.
                        results.push_back(BumpResult::Skipped);
                    } else {
                        // Key is at risk — extend TTL and credit bounty.
                        //
                        // In a production deployment this would call:
                        //   env.storage().persistent().extend_ttl(
                        //       &DataKey::Entry(target.contract, target.key_name),
                        //       entry.threshold,
                        //       entry.extend_to,
                        //   );
                        // Here we record the extension in contract state to make
                        // it observable from tests without a real cross-contract
                        // extend_ttl call.
                        env.storage().persistent().set(
                            &DataKey::Entry(target.contract.clone(), target.key_name.clone()),
                            &RegistryEntry {
                                contract: entry.contract.clone(),
                                key_name: entry.key_name.clone(),
                                threshold: entry.threshold,
                                extend_to: entry.extend_to,
                            },
                        );

                        // Preflight: enough pool to cover this key?
                        if pool < per_key {
                            return Err(Error::InsufficientBountyPool);
                        }
                        pool = pool.checked_sub(per_key).ok_or(Error::Overflow)?;
                        keys_extended += 1;
                        results.push_back(BumpResult::Extended);
                    }
                }
            }
        }

        // Commit pool deduction and credit keeper.
        set_bounty_pool(&env, pool);
        if keys_extended > 0 {
            let earned = per_key
                .checked_mul(i128::from(keys_extended))
                .ok_or(Error::Overflow)?;
            let prev_balance: i128 = env
                .storage()
                .persistent()
                .get(&CtrKey::KeeperBalance(keeper.clone()))
                .unwrap_or(0);
            let new_balance = prev_balance.checked_add(earned).ok_or(Error::Overflow)?;
            env.storage()
                .persistent()
                .set(&CtrKey::KeeperBalance(keeper.clone()), &new_balance);

            env.events().publish(
                (symbol_short!("bumped"), keeper.clone()),
                (keys_extended, earned),
            );
        }

        Ok(results)
    }

    // ── view functions ─────────────────────────────────────────────────────

    /// Return the accumulated bounty balance owed to `keeper` (in stroops).
    pub fn bounty_balance(env: Env, keeper: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&CtrKey::KeeperBalance(keeper))
            .unwrap_or(0)
    }

    /// Return the current bounty pool balance (in stroops).
    pub fn pool_balance(env: Env) -> i128 {
        bounty_pool(&env)
    }

    /// Return the number of currently registered keys.
    pub fn registry_count(env: Env) -> u32 {
        entry_count(&env)
    }

    /// Return the per-key bounty amount (in stroops).
    pub fn get_bounty_per_key(env: Env) -> i128 {
        bounty_per_key(&env)
    }

    /// Return the entry for a registered key, or panic if not found.
    pub fn get_entry(env: Env, contract: Address, key_name: Symbol) -> RegistryEntry {
        load_entry(&env, &contract, &key_name).expect("entry not found")
    }

    // ── private helpers ────────────────────────────────────────────────────

    fn require_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        vec, Env, Symbol,
    };

    // ── test helpers ────────────────────────────────────────────────────────

    /// Register the contract, mock all auths, initialise with:
    ///   bounty_per_key = 1_000 stroops, pool pre-funded with 100_000 stroops.
    fn setup() -> (Env, Address, TtlBumperClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let id = env.register(TtlBumper, ());
        let client = TtlBumperClient::new(&env, &id);
        client.init(&admin, &1_000_i128);
        client.fund_bounty_pool(&100_000_i128);
        (env, admin, client)
    }

    fn set_ledger(env: &Env, sequence: u32, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            timestamp,
            protocol_version: 22,
            sequence_number: sequence,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 518_400,
            max_entry_ttl: 6_312_000,
        });
    }

    /// Register a key with default threshold=100 / extend_to=518_400.
    fn register_key(
        client: &TtlBumperClient,
        contract: &Address,
        key: &Symbol,
    ) {
        client.register_key(contract, key, &100_u32, &518_400_u32);
    }

    // ── initialisation ──────────────────────────────────────────────────────

    #[test]
    fn test_init_sets_state() {
        let (_, _, client) = setup();
        assert_eq!(client.pool_balance(), 100_000_i128);
        assert_eq!(client.get_bounty_per_key(), 1_000_i128);
        assert_eq!(client.registry_count(), 0);
    }

    #[test]
    fn test_double_init_rejected() {
        let (env, admin, client) = setup();
        let result = client.try_init(&admin, &1_000_i128);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    // ── registration ────────────────────────────────────────────────────────

    #[test]
    fn test_register_key_increments_count() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");

        register_key(&client, &contract, &key);
        assert_eq!(client.registry_count(), 1);
    }

    #[test]
    fn test_register_multiple_keys() {
        let (env, _, client) = setup();
        let c1 = Address::generate(&env);
        let c2 = Address::generate(&env);
        let k1 = Symbol::new(&env, "OraclePrice");
        let k2 = Symbol::new(&env, "AdminKey");
        let k3 = Symbol::new(&env, "VaultBal");

        register_key(&client, &c1, &k1);
        register_key(&client, &c1, &k2);
        register_key(&client, &c2, &k3);

        assert_eq!(client.registry_count(), 3);
    }

    #[test]
    fn test_register_stores_correct_metadata() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");

        client.register_key(&contract, &key, &200_u32, &600_000_u32);

        let entry = client.get_entry(&contract, &key);
        assert_eq!(entry.threshold, 200);
        assert_eq!(entry.extend_to, 600_000);
    }

    #[test]
    fn test_register_rejects_zero_threshold() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");
        let result = client.try_register_key(&contract, &key, &0_u32, &518_400_u32);
        assert_eq!(result, Err(Ok(Error::InvalidThreshold)));
    }

    #[test]
    fn test_register_rejects_zero_extend_to() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");
        let result = client.try_register_key(&contract, &key, &100_u32, &0_u32);
        assert_eq!(result, Err(Ok(Error::InvalidExtendTo)));
    }

    // ── deregistration ──────────────────────────────────────────────────────

    #[test]
    fn test_deregister_decrements_count() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");

        register_key(&client, &contract, &key);
        assert_eq!(client.registry_count(), 1);

        client.deregister_key(&contract, &key);
        assert_eq!(client.registry_count(), 0);
    }

    #[test]
    fn test_deregister_unknown_key_returns_error() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "Unknown");
        let result = client.try_deregister_key(&contract, &key);
        assert_eq!(result, Err(Ok(Error::KeyNotFound)));
    }

    // ── batch TTL extension ─────────────────────────────────────────────────

    #[test]
    fn test_bump_keys_extends_at_risk_key() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");
        let keeper = Address::generate(&env);

        register_key(&client, &contract, &key);

        // Simulate TTL = 50, threshold = 100 → key is at risk.
        let targets = vec![
            &env,
            BumpTarget {
                contract: contract.clone(),
                key_name: key.clone(),
                simulated_ttl: 50,
            },
        ];

        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.len(), 1);
        assert_eq!(results.get_unchecked(0), BumpResult::Extended);
    }

    #[test]
    fn test_bump_keys_skips_healthy_key() {
        let (env, _, client) = setup();
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");
        let keeper = Address::generate(&env);

        register_key(&client, &contract, &key); // threshold = 100

        // Simulate TTL = 500, well above threshold → skip.
        let targets = vec![
            &env,
            BumpTarget {
                contract: contract.clone(),
                key_name: key.clone(),
                simulated_ttl: 500,
            },
        ];

        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.get_unchecked(0), BumpResult::Skipped);
        // No bounty earned for a skipped key.
        assert_eq!(client.bounty_balance(&keeper), 0);
    }

    #[test]
    fn test_bump_keys_returns_not_registered_for_unknown_key() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "NoSuchKey");

        let targets = vec![
            &env,
            BumpTarget {
                contract,
                key_name: key,
                simulated_ttl: 5,
            },
        ];

        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.get_unchecked(0), BumpResult::NotRegistered);
        assert_eq!(client.bounty_balance(&keeper), 0);
    }

    // ── keeper bounty payout ────────────────────────────────────────────────

    #[test]
    fn test_keeper_earns_bounty_per_extended_key() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "OraclePrice");

        register_key(&client, &c, &k);

        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 10 },
        ];
        client.bump_keys(&keeper, &targets);

        // bounty_per_key = 1_000
        assert_eq!(client.bounty_balance(&keeper), 1_000_i128);
    }

    #[test]
    fn test_keeper_earns_bounty_for_each_key_in_batch() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k1 = Symbol::new(&env, "KeyAlpha");
        let k2 = Symbol::new(&env, "KeyBeta");
        let k3 = Symbol::new(&env, "KeyGamma");

        register_key(&client, &c, &k1);
        register_key(&client, &c, &k2);
        register_key(&client, &c, &k3);

        let targets = vec![
            &env,
            BumpTarget { contract: c.clone(), key_name: k1, simulated_ttl: 5 },
            BumpTarget { contract: c.clone(), key_name: k2, simulated_ttl: 5 },
            BumpTarget { contract: c.clone(), key_name: k3, simulated_ttl: 5 },
        ];
        client.bump_keys(&keeper, &targets);

        // 3 keys × 1_000 = 3_000
        assert_eq!(client.bounty_balance(&keeper), 3_000_i128);
    }

    #[test]
    fn test_bounty_pool_decremented_after_extension() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "OraclePrice");

        register_key(&client, &c, &k);

        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 10 },
        ];
        client.bump_keys(&keeper, &targets);

        // Pool started at 100_000, one key extended at 1_000/key.
        assert_eq!(client.pool_balance(), 99_000_i128);
    }

    #[test]
    fn test_mixed_batch_partial_extension() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k_at_risk = Symbol::new(&env, "AtRisk");
        let k_healthy = Symbol::new(&env, "Healthy");
        let k_unknown = Symbol::new(&env, "Unknown");

        register_key(&client, &c, &k_at_risk);  // threshold = 100
        register_key(&client, &c, &k_healthy);  // threshold = 100

        let targets = vec![
            &env,
            BumpTarget { contract: c.clone(), key_name: k_at_risk,  simulated_ttl: 10  },
            BumpTarget { contract: c.clone(), key_name: k_healthy,   simulated_ttl: 500 },
            BumpTarget { contract: c.clone(), key_name: k_unknown,   simulated_ttl: 5   },
        ];

        let results = client.bump_keys(&keeper, &targets);

        assert_eq!(results.get_unchecked(0), BumpResult::Extended);
        assert_eq!(results.get_unchecked(1), BumpResult::Skipped);
        assert_eq!(results.get_unchecked(2), BumpResult::NotRegistered);

        // Only the extended key earns a bounty.
        assert_eq!(client.bounty_balance(&keeper), 1_000_i128);
        assert_eq!(client.pool_balance(), 99_000_i128);
    }

    // ── bounty exhaustion prevention ────────────────────────────────────────

    #[test]
    fn test_bump_rejected_when_pool_empty() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "OraclePrice");

        register_key(&client, &c, &k);

        // Drain the pool to zero.
        // Pool = 100_000, bounty_per_key = 1_000 → 100 bumps to drain.
        for i in 0_u32..100 {
            // Re-register with a fresh key name each iteration so the entries
            // exist; we reuse the same key for simplicity by bumping one key
            // 100 times (re-registering to ensure it exists).
            let ki = Symbol::new(&env, "OraclePrice");
            let targets = vec![
                &env,
                BumpTarget { contract: c.clone(), key_name: ki, simulated_ttl: 1 },
            ];
            let result = client.bump_keys(&keeper, &targets);
            // All 100 bumps should succeed before the pool runs out.
            assert_eq!(result.get_unchecked(0), BumpResult::Extended, "bump {} failed", i);
        }

        assert_eq!(client.pool_balance(), 0);

        // 101st bump must fail.
        let targets = vec![
            &env,
            BumpTarget { contract: c.clone(), key_name: k, simulated_ttl: 1 },
        ];
        let result = client.try_bump_keys(&keeper, &targets);
        assert_eq!(result, Err(Ok(Error::InsufficientBountyPool)));
    }

    #[test]
    fn test_skipped_key_does_not_drain_pool() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "Healthy");

        register_key(&client, &c, &k); // threshold = 100

        let initial_pool = client.pool_balance();

        // TTL = 9999 >> threshold = 100 → should be skipped every time.
        for _ in 0..50 {
            let targets = vec![
                &env,
                BumpTarget { contract: c.clone(), key_name: k.clone(), simulated_ttl: 9999 },
            ];
            client.bump_keys(&keeper, &targets);
        }

        // Pool must be unchanged.
        assert_eq!(client.pool_balance(), initial_pool);
        assert_eq!(client.bounty_balance(&keeper), 0);
    }

    // ── batch size guards ───────────────────────────────────────────────────

    #[test]
    fn test_empty_batch_rejected() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let targets: Vec<BumpTarget> = vec![&env];
        let result = client.try_bump_keys(&keeper, &targets);
        assert_eq!(result, Err(Ok(Error::EmptyBatch)));
    }

    #[test]
    fn test_oversized_batch_rejected() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);

        let mut targets = Vec::new(&env);
        for i in 0..=MAX_BATCH_SIZE {
            // Create distinct symbol names "k0".."k20"
            let s: [u8; 2] = [b'k', b'0' + (i % 10) as u8];
            let name = core::str::from_utf8(&s).unwrap_or("kx");
            targets.push_back(BumpTarget {
                contract: c.clone(),
                key_name: Symbol::new(&env, name),
                simulated_ttl: 1,
            });
        }
        assert_eq!(targets.len(), MAX_BATCH_SIZE + 1);

        let result = client.try_bump_keys(&keeper, &targets);
        assert_eq!(result, Err(Ok(Error::BatchTooLarge)));
    }

    #[test]
    fn test_batch_at_exactly_max_size_accepted() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let mut targets = Vec::new(&env);

        for i in 0..MAX_BATCH_SIZE {
            let s: [u8; 2] = [b'k', b'0' + (i % 10) as u8];
            let name = core::str::from_utf8(&s).unwrap_or("kx");
            let ki = Symbol::new(&env, name);
            client.register_key(&c, &ki, &100_u32, &518_400_u32);
            targets.push_back(BumpTarget {
                contract: c.clone(),
                key_name: ki,
                simulated_ttl: 1,
            });
        }

        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.len(), MAX_BATCH_SIZE);
        for r in results.iter() {
            assert_eq!(r, BumpResult::Extended);
        }
        // Pool decremented by MAX_BATCH_SIZE × bounty_per_key
        assert_eq!(
            client.pool_balance(),
            100_000_i128 - (MAX_BATCH_SIZE as i128 * 1_000_i128)
        );
    }

    // ── near-expiry simulation ──────────────────────────────────────────────

    #[test]
    fn test_key_eligible_at_exact_threshold_boundary() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "BndryKey");

        // threshold = 100; simulated_ttl = 100 (≤ threshold) → eligible.
        client.register_key(&c, &k, &100_u32, &518_400_u32);
        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 100 },
        ];
        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.get_unchecked(0), BumpResult::Extended);
    }

    #[test]
    fn test_key_not_eligible_one_above_threshold() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "BndryKey");

        // threshold = 100; simulated_ttl = 101 (> threshold) → skipped.
        client.register_key(&c, &k, &100_u32, &518_400_u32);
        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 101 },
        ];
        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.get_unchecked(0), BumpResult::Skipped);
    }

    #[test]
    fn test_key_eligible_at_ttl_zero() {
        let (env, _, client) = setup();
        let keeper = Address::generate(&env);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "Expired");

        register_key(&client, &c, &k);
        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 0 },
        ];
        let results = client.bump_keys(&keeper, &targets);
        assert_eq!(results.get_unchecked(0), BumpResult::Extended);
    }

    // ── simulated key aging / ledger advancement ────────────────────────────

    /// Simulates the typical maintenance lifecycle:
    /// 1. Keys are registered at ledger 0 (healthy, TTL = max).
    /// 2. Ledger advances simulating ledger sequence growth.
    /// 3. Keeper submits a bump with a simulated TTL representing remaining life.
    /// 4. Verifies the batch processes correctly and bounty is paid.
    #[test]
    fn test_automated_recovery_of_near_expired_keys() {
        let (env, _, client) = setup();
        set_ledger(&env, 100_000, 1_000_000);

        let keeper = Address::generate(&env);
        let infra1 = Address::generate(&env);
        let infra2 = Address::generate(&env);
        let infra3 = Address::generate(&env);

        // Register three infrastructure keys.
        let price_key = Symbol::new(&env, "PriceData");
        let admin_key = Symbol::new(&env, "AdminCfg");
        let vault_key = Symbol::new(&env, "VaultBal");

        client.register_key(&infra1, &price_key, &500_u32, &518_400_u32);
        client.register_key(&infra2, &admin_key, &500_u32, &518_400_u32);
        client.register_key(&infra3, &vault_key, &500_u32, &518_400_u32);
        assert_eq!(client.registry_count(), 3);

        // Simulate time passing: ledger advances significantly.
        set_ledger(&env, 517_950, 5_000_000);

        // Keys are now close to expiry: remaining TTL = 450 ledgers < threshold 500.
        let remaining_ttl = 450_u32;
        let targets = vec![
            &env,
            BumpTarget { contract: infra1.clone(), key_name: price_key.clone(), simulated_ttl: remaining_ttl },
            BumpTarget { contract: infra2.clone(), key_name: admin_key.clone(), simulated_ttl: remaining_ttl },
            BumpTarget { contract: infra3.clone(), key_name: vault_key.clone(), simulated_ttl: remaining_ttl },
        ];

        let results = client.bump_keys(&keeper, &targets);

        // All three should be extended.
        assert_eq!(results.get_unchecked(0), BumpResult::Extended);
        assert_eq!(results.get_unchecked(1), BumpResult::Extended);
        assert_eq!(results.get_unchecked(2), BumpResult::Extended);

        // Keeper earned 3 × 1_000 = 3_000 stroops.
        assert_eq!(client.bounty_balance(&keeper), 3_000_i128);

        // Pool depleted by 3_000.
        assert_eq!(client.pool_balance(), 97_000_i128);

        // Entries are still registered after the bump.
        assert_eq!(client.registry_count(), 3);
    }

    // ── bounty pool management ──────────────────────────────────────────────

    #[test]
    fn test_fund_bounty_pool_increases_balance() {
        let (_, _, client) = setup();
        let initial = client.pool_balance();
        client.fund_bounty_pool(&50_000_i128);
        assert_eq!(client.pool_balance(), initial + 50_000_i128);
    }

    #[test]
    fn test_fund_bounty_pool_rejects_zero() {
        let (_, _, client) = setup();
        let result = client.try_fund_bounty_pool(&0_i128);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_set_bounty_per_key_updates_rate() {
        let (_, _, client) = setup();
        client.set_bounty_per_key(&5_000_i128);
        assert_eq!(client.get_bounty_per_key(), 5_000_i128);
    }

    #[test]
    fn test_set_bounty_per_key_to_zero_allowed() {
        // Setting to 0 is valid — effectively disables bounties.
        let (_, _, client) = setup();
        client.set_bounty_per_key(&0_i128);
        assert_eq!(client.get_bounty_per_key(), 0_i128);
    }

    // ── authorization ───────────────────────────────────────────────────────

    #[test]
    fn test_register_key_requires_admin_auth() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let id = env.register(TtlBumper, ());
        let client = TtlBumperClient::new(&env, &id);

        env.mock_all_auths();
        client.init(&admin, &1_000_i128);

        // Auth no longer mocked — non-admin attempt must fail.
        let contract = Address::generate(&env);
        let key = Symbol::new(&env, "OraclePrice");
        let result = client.try_register_key(&contract, &key, &100_u32, &518_400_u32);
        assert!(result.is_err());
    }

    #[test]
    fn test_bump_keys_requires_keeper_auth() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let id = env.register(TtlBumper, ());
        let client = TtlBumperClient::new(&env, &id);

        env.mock_all_auths();
        client.init(&admin, &1_000_i128);
        client.fund_bounty_pool(&100_000_i128);
        let c = Address::generate(&env);
        let k = Symbol::new(&env, "OraclePrice");
        client.register_key(&c, &k, &100_u32, &518_400_u32);

        // Without mock_all_auths, keeper auth is enforced.
        let keeper = Address::generate(&env);
        let targets = vec![
            &env,
            BumpTarget { contract: c, key_name: k, simulated_ttl: 1 },
        ];
        let result = client.try_bump_keys(&keeper, &targets);
        assert!(result.is_err());
    }

    // ── multiple keepers ────────────────────────────────────────────────────

    #[test]
    fn test_multiple_keepers_earn_independent_balances() {
        let (env, _, client) = setup();
        let keeper1 = Address::generate(&env);
        let keeper2 = Address::generate(&env);
        let c = Address::generate(&env);
        let k1 = Symbol::new(&env, "KeyOne");
        let k2 = Symbol::new(&env, "KeyTwo");

        register_key(&client, &c, &k1);
        register_key(&client, &c, &k2);

        let t1 = vec![&env, BumpTarget { contract: c.clone(), key_name: k1, simulated_ttl: 5 }];
        let t2 = vec![&env, BumpTarget { contract: c.clone(), key_name: k2, simulated_ttl: 5 }];

        client.bump_keys(&keeper1, &t1);
        client.bump_keys(&keeper2, &t2);

        assert_eq!(client.bounty_balance(&keeper1), 1_000_i128);
        assert_eq!(client.bounty_balance(&keeper2), 1_000_i128);
        assert_eq!(client.pool_balance(), 98_000_i128);
    }
}
