//! Token Snapshot — immutable balance snapshots for voting and dividends.
//!
//! ## Design
//!
//! An admin creates point-in-time balance snapshots by capturing every known
//! holder's balance.  Each snapshot stores the ledger sequence, total supply,
//! and per-address balances so governance contracts can query historical voting
//! power or compute dividend allocations without trusting off-chain data alone.
//!
//! ### Flash-loan resistance
//!
//! Snapshots record balances at the ledger when `create_snapshot` is called,
//! **before** the snapshot ID is assigned.  Because the snapshot ID is only
//! known after the transaction commits, a flash-loan attacker cannot know the
//! snapshot ID ahead of time to front-run a vote or dividend claim.
//!
//! ### Double-claim prevention
//!
//! Each snapshot supports a `mark_claimed` / `has_claimed` mechanism keyed by
//! `(snapshot_id, address)`.  Downstream contracts (governance, dividends)
//! call `mark_claimed` after honoring the balance; the flag prevents reuse.
//!
//! ### Off-chain indexer integration
//!
//! Every `create_snapshot` emits a `snapshot_created` event containing the
//! snapshot ID, ledger sequence, and total supply.  Indexers can then walk
//! all known holders via `snapshot_holder_count` / `snapshot_holder_at` and
//! call `balance_at` to reconstruct the full snapshot state without iterating
//! on-chain.  See the [pattern documentation][snapshot-docs] for a complete
//! indexer integration recipe.
//!
//! [snapshot-docs]: /docs/patterns/token-snapshot
//!
//! ### Storage layout
//! - `Instance`  — `Admin`, `SnapshotCounter`, `HolderCounter`
//! - `Persistent` — `Balance(Address)`, `IsHolder(Address)`,
//!                  `Holder(u32)`, `SnapshotMeta(u32)`,
//!                  `SnapshotBalance(u32, Address)`,
//!                  `SnapshotClaimed(u32, Address)`

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env};

// ── storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Current token balance of an address.
    Balance(Address),
    /// Whether an address has ever held tokens (for holder-set membership).
    IsHolder(Address),
    /// Nth holder in the linear holder set.
    Holder(u32),
    /// Snapshot metadata keyed by snapshot ID.
    SnapshotMeta(u32),
    /// Balance of an address at a given snapshot.
    SnapshotBalance(u32, Address),
    /// Whether an address has already claimed from a snapshot.
    SnapshotClaimed(u32, Address),
}

// ── instance-level keys (small cardinality) ───────────────────────────────────

const INSTANCE_ADMIN: &str = "Admin";
const INSTANCE_SNAPSHOT_COUNTER: &str = "SnapshotCounter";
const INSTANCE_HOLDER_COUNTER: &str = "HolderCounter";

// ── snapshot metadata ─────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SnapshotMeta {
    /// Ledger sequence at which this snapshot was taken.
    pub ledger: u32,
    /// Total token supply at the moment of snapshot.
    pub total_supply: i128,
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
    /// Amount must be positive.
    InvalidAmount = 3,
    /// Source account has insufficient balance for transfer.
    InsufficientBalance = 4,
    /// Self-transfer is disallowed.
    SelfTransfer = 5,
    /// The requested snapshot does not exist.
    SnapshotNotFound = 6,
    /// Address already claimed from this snapshot.
    AlreadyClaimed = 7,
    /// The snapshot ID is 0 (reserved for "no snapshot").
    InvalidSnapshotId = 8,
}

// ── contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct TokenSnapshot;

#[contractimpl]
impl TokenSnapshot {
    // ── admin ──────────────────────────────────────────────────────────────

    /// Initialize the contract with an admin address.
    ///
    /// The admin can mint tokens and create snapshots.  Call exactly once.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        if env.storage().instance().has(&INSTANCE_ADMIN) {
            return Err(Error::AlreadyInitialized);
        }

        let storage = env.storage().instance();
        storage.set(&INSTANCE_ADMIN, &admin);
        storage.set(&INSTANCE_SNAPSHOT_COUNTER, &1_u32); // 0 reserved
        storage.set(&INSTANCE_HOLDER_COUNTER, &0_u32);

        Ok(())
    }

    // ── token operations ───────────────────────────────────────────────────

    /// Mint tokens to `to`.  Admin only.
    ///
    /// If `to` has never held tokens, it is added to the holder set so
    /// future snapshots include it.
    pub fn mint(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let admin = Self::require_admin(&env)?;
        admin.require_auth();

        Self::ensure_holder(&env, &to);

        let key = DataKey::Balance(to.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&key, &(current + amount));

        Ok(())
    }

    /// Return the current balance of `of`.
    pub fn balance(env: Env, of: Address) -> i128 {
        let key = DataKey::Balance(of);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    /// Transfer tokens from `from` to `to`.
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if from == to {
            return Err(Error::SelfTransfer);
        }

        Self::ensure_holder(&env, &to);

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&from_key)
            .unwrap_or(0);

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

    // ── snapshot operations ────────────────────────────────────────────────

    /// Create a new balance snapshot.
    ///
    /// Iterates over every known holder, records their current balance, and
    /// stores summary metadata.  Returns the new snapshot ID.
    ///
    /// **Gas note**: cost scales linearly with the number of holders.  For
    /// contracts with thousands of holders, prefer the off-chain indexer
    /// approach described in the pattern documentation.
    pub fn create_snapshot(env: Env) -> Result<u32, Error> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();

        let snapshot_id: u32 = env
            .storage()
            .instance()
            .get(&INSTANCE_SNAPSHOT_COUNTER)
            .unwrap_or(1);

        let ledger = env.ledger().sequence();
        let holder_count: u32 = env
            .storage()
            .instance()
            .get(&INSTANCE_HOLDER_COUNTER)
            .unwrap_or(0);

        let mut total_supply: i128 = 0;

        // Walk every known holder and persist their balance under the
        // snapshot-scoped key.
        for i in 0..holder_count {
            let holder: Address = env
                .storage()
                .persistent()
                .get(&DataKey::Holder(i))
                .unwrap();
            let bal: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(holder.clone()))
                .unwrap_or(0);
            total_supply += bal;

            env.storage().persistent().set(
                &DataKey::SnapshotBalance(snapshot_id, holder),
                &bal,
            );
        }

        // Store snapshot metadata.
        let meta = SnapshotMeta {
            ledger,
            total_supply,
        };
        env.storage()
            .persistent()
            .set(&DataKey::SnapshotMeta(snapshot_id), &meta);

        // Bump the counter for the next snapshot.
        env.storage()
            .instance()
            .set(&INSTANCE_SNAPSHOT_COUNTER, &(snapshot_id + 1));

        // Emit event for off-chain indexers.
        env.events().publish(
            (symbol_short!("snapshot"), snapshot_id),
            (ledger, total_supply),
        );

        Ok(snapshot_id)
    }

    /// Return the balance of `address` at `snapshot_id`.
    ///
    /// Returns 0 if the address was not a holder at snapshot time.
    pub fn balance_at(env: Env, address: Address, snapshot_id: u32) -> Result<i128, Error> {
        if snapshot_id == 0 {
            return Err(Error::InvalidSnapshotId);
        }
        Self::require_snapshot(&env, snapshot_id)?;
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::SnapshotBalance(snapshot_id, address))
            .unwrap_or(0))
    }

    /// Return the total supply at `snapshot_id`.
    pub fn total_supply_at(env: Env, snapshot_id: u32) -> Result<i128, Error> {
        if snapshot_id == 0 {
            return Err(Error::InvalidSnapshotId);
        }
        let meta: SnapshotMeta = env
            .storage()
            .persistent()
            .get(&DataKey::SnapshotMeta(snapshot_id))
            .ok_or(Error::SnapshotNotFound)?;
        Ok(meta.total_supply)
    }

    /// Return the ledger sequence at which `snapshot_id` was created.
    pub fn snapshot_ledger(env: Env, snapshot_id: u32) -> Result<u32, Error> {
        if snapshot_id == 0 {
            return Err(Error::InvalidSnapshotId);
        }
        let meta: SnapshotMeta = env
            .storage()
            .persistent()
            .get(&DataKey::SnapshotMeta(snapshot_id))
            .ok_or(Error::SnapshotNotFound)?;
        Ok(meta.ledger)
    }

    /// Return the total number of snapshots created so far.
    ///
    /// Valid snapshot IDs are `1..snapshot_count()`.
    pub fn snapshot_count(env: Env) -> u32 {
        let counter: u32 = env
            .storage()
            .instance()
            .get(&INSTANCE_SNAPSHOT_COUNTER)
            .unwrap_or(1);
        counter.saturating_sub(1)
    }

    // ── holder enumeration (for off-chain indexers) ────────────────────────

    /// Return the number of addresses ever recorded as holders.
    pub fn snapshot_holder_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&INSTANCE_HOLDER_COUNTER)
            .unwrap_or(0)
    }

    /// Return the address of the `index`-th holder (0-based).
    ///
    /// Panics if `index` is out of bounds.
    pub fn snapshot_holder_at(env: Env, index: u32) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Holder(index))
            .unwrap()
    }

    // ── claim tracking (double-claim prevention) ───────────────────────────

    /// Mark that `address` has claimed from `snapshot_id`.
    ///
    /// Requires authorization from `address`.  Typically called by the
    /// downstream governance or dividend contract on behalf of the user.
    pub fn mark_claimed(
        env: Env,
        address: Address,
        snapshot_id: u32,
    ) -> Result<(), Error> {
        address.require_auth();

        if snapshot_id == 0 {
            return Err(Error::InvalidSnapshotId);
        }
        Self::require_snapshot(&env, snapshot_id)?;

        let key = DataKey::SnapshotClaimed(snapshot_id, address.clone());
        if env.storage().persistent().get::<_, bool>(&key).unwrap_or(false) {
            return Err(Error::AlreadyClaimed);
        }

        env.storage().persistent().set(&key, &true);
        Ok(())
    }

    /// Check whether `address` has already claimed from `snapshot_id`.
    pub fn has_claimed(env: Env, address: Address, snapshot_id: u32) -> Result<bool, Error> {
        if snapshot_id == 0 {
            return Err(Error::InvalidSnapshotId);
        }
        Self::require_snapshot(&env, snapshot_id)?;
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::SnapshotClaimed(snapshot_id, address))
            .unwrap_or(false))
    }

    // ── internal helpers ───────────────────────────────────────────────────

    fn require_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&INSTANCE_ADMIN)
            .ok_or(Error::NotInitialized)
    }

    fn require_snapshot(env: &Env, snapshot_id: u32) -> Result<(), Error> {
        if !env
            .storage()
            .persistent()
            .has(&DataKey::SnapshotMeta(snapshot_id))
        {
            return Err(Error::SnapshotNotFound);
        }
        Ok(())
    }

    /// Ensure `addr` is tracked in the holder set.  Idempotent.
    fn ensure_holder(env: &Env, addr: &Address) {
        let is_key = DataKey::IsHolder(addr.clone());
        if env.storage().persistent().has(&is_key) {
            return;
        }

        // First time we see this address — assign it a holder slot.
        let idx: u32 = env
            .storage()
            .instance()
            .get(&INSTANCE_HOLDER_COUNTER)
            .unwrap_or(0);

        env.storage().persistent().set(&is_key, &true);
        env.storage()
            .persistent()
            .set(&DataKey::Holder(idx), addr);
        env.storage()
            .instance()
            .set(&INSTANCE_HOLDER_COUNTER, &(idx + 1));
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger, LedgerInfo},
        Env,
    };

    fn setup() -> (Env, Address, TokenSnapshotClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(TokenSnapshot, ());
        let client = TokenSnapshotClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
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

    // ── initialization ────────────────────────────────────────────────────

    #[test]
    fn test_initialize_sets_admin_and_counters() {
        let (env, admin, client) = setup();
        // After init, no snapshots yet
        assert_eq!(client.snapshot_count(), 0);
        assert_eq!(client.snapshot_holder_count(), 0);
        // Admin is stored (implicit — mint works)
        let alice = Address::generate(&env);
        client.mint(&alice, &100);
        assert_eq!(client.balance(&alice), 100);
    }

    #[test]
    fn test_double_initialize_is_rejected() {
        let (env, admin, client) = setup();
        let result = client.try_initialize(&admin);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    // ── mint & balance ────────────────────────────────────────────────────

    #[test]
    fn test_mint_increases_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        client.mint(&alice, &500);
        assert_eq!(client.balance(&alice), 500);
    }

    #[test]
    fn test_mint_tracks_holder() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        client.mint(&alice, &500);
        assert_eq!(client.snapshot_holder_count(), 1);
        assert_eq!(client.snapshot_holder_at(&0), alice);
    }

    #[test]
    fn test_mint_zero_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_mint(&alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_mint_negative_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_mint(&alice, &-100);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_initial_balance_is_zero() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        assert_eq!(client.balance(&alice), 0);
    }

    // ── transfers ─────────────────────────────────────────────────────────

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
    fn test_transfer_tracks_new_holder() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        assert_eq!(client.snapshot_holder_count(), 1);

        client.transfer(&alice, &bob, &400);
        assert_eq!(client.snapshot_holder_count(), 2);
    }

    #[test]
    fn test_transfer_fails_on_insufficient_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &100);
        let result = client.try_transfer(&alice, &bob, &200);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
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

    // ── snapshots ─────────────────────────────────────────────────────────

    #[test]
    fn test_create_snapshot_returns_sequential_ids() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let id1 = client.create_snapshot();
        assert_eq!(id1, 1);

        let id2 = client.create_snapshot();
        assert_eq!(id2, 2);

        assert_eq!(client.snapshot_count(), 2);
    }

    #[test]
    fn test_snapshot_captures_balance() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snapshot_id = client.create_snapshot();

        assert_eq!(client.balance_at(&alice, &snapshot_id), 500);
    }

    #[test]
    fn test_snapshot_captures_total_supply() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &300);
        client.mint(&bob, &200);
        let snapshot_id = client.create_snapshot();

        assert_eq!(client.total_supply_at(&snapshot_id), 500);
    }

    #[test]
    fn test_snapshot_captures_multiple_holders() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.mint(&alice, &100);
        client.mint(&bob, &200);
        client.mint(&carol, &300);
        let snapshot_id = client.create_snapshot();

        assert_eq!(client.balance_at(&alice, &snapshot_id), 100);
        assert_eq!(client.balance_at(&bob, &snapshot_id), 200);
        assert_eq!(client.balance_at(&carol, &snapshot_id), 300);
    }

    #[test]
    fn test_snapshot_balance_zero_for_unknown_address() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let stranger = Address::generate(&env);

        client.mint(&alice, &500);
        let snapshot_id = client.create_snapshot();

        assert_eq!(client.balance_at(&stranger, &snapshot_id), 0);
    }

    #[test]
    fn test_snapshot_is_immutable() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snapshot_id = client.create_snapshot();

        // Transfer after snapshot — snapshot balance unchanged
        let bob = Address::generate(&env);
        client.transfer(&alice, &bob, &300);

        assert_eq!(client.balance(&alice), 200);
        assert_eq!(client.balance_at(&alice, &snapshot_id), 500);
        assert_eq!(client.balance_at(&bob, &snapshot_id), 0);
    }

    #[test]
    fn test_multiple_snapshots_reflect_different_states() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snap1 = client.create_snapshot();

        client.mint(&alice, &300);
        let snap2 = client.create_snapshot();

        assert_eq!(client.balance_at(&alice, &snap1), 500);
        assert_eq!(client.balance_at(&alice, &snap2), 800);
    }

    #[test]
    fn test_snapshot_records_ledger_sequence() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        set_ledger_sequence(&env, 42);
        client.mint(&alice, &100);
        let snapshot_id = client.create_snapshot();

        assert_eq!(client.snapshot_ledger(&snapshot_id), 42);
    }

    #[test]
    fn test_snapshot_zero_id_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_balance_at(&alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidSnapshotId)));
    }

    #[test]
    fn test_snapshot_not_found_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_balance_at(&alice, &99);
        assert_eq!(result, Err(Ok(Error::SnapshotNotFound)));
    }

    #[test]
    fn test_snapshot_emits_event() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let _snapshot_id = client.create_snapshot();

        let events = env.events().all();
        // Filter for snapshot topic
        let snapshot_events: Vec<_> = events
            .iter()
            .filter(|e| {
                e.0 .0
                    .iter()
                    .any(|v| v == &soroban_sdk::Val::from(symbol_short!("snapshot")))
            })
            .collect();
        assert_eq!(snapshot_events.len(), 1);
    }

    // ── claim tracking ────────────────────────────────────────────────────

    #[test]
    fn test_mark_claimed_and_check() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snapshot_id = client.create_snapshot();

        assert!(!client.has_claimed(&alice, &snapshot_id));

        client.mark_claimed(&alice, &snapshot_id);
        assert!(client.has_claimed(&alice, &snapshot_id));
    }

    #[test]
    fn test_double_claim_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snapshot_id = client.create_snapshot();

        client.mark_claimed(&alice, &snapshot_id);
        let result = client.try_mark_claimed(&alice, &snapshot_id);
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
    }

    #[test]
    fn test_has_claimed_invalid_snapshot_is_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_has_claimed(&alice, &0);
        assert_eq!(result, Err(Ok(Error::InvalidSnapshotId)));

        let result = client.try_has_claimed(&alice, &99);
        assert_eq!(result, Err(Ok(Error::SnapshotNotFound)));
    }

    #[test]
    fn test_claim_independent_across_snapshots() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &500);
        let snap1 = client.create_snapshot();
        let snap2 = client.create_snapshot();

        client.mark_claimed(&alice, &snap1);

        // snap1 claimed, snap2 not claimed
        assert!(client.has_claimed(&alice, &snap1));
        assert!(!client.has_claimed(&alice, &snap2));
    }

    #[test]
    fn test_claim_independent_across_addresses() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &500);
        client.mint(&bob, &300);
        let snapshot_id = client.create_snapshot();

        client.mark_claimed(&alice, &snapshot_id);

        assert!(client.has_claimed(&alice, &snapshot_id));
        assert!(!client.has_claimed(&bob, &snapshot_id));
    }

    // ── holder enumeration ────────────────────────────────────────────────

    #[test]
    fn test_holder_enumeration_order_matches_first_seen() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.mint(&alice, &100);
        client.mint(&bob, &200);
        client.mint(&carol, &300);

        assert_eq!(client.snapshot_holder_count(), 3);
        assert_eq!(client.snapshot_holder_at(&0), alice);
        assert_eq!(client.snapshot_holder_at(&1), bob);
        assert_eq!(client.snapshot_holder_at(&2), carol);
    }

    // ── end-to-end scenario ───────────────────────────────────────────────

    #[test]
    fn test_full_voting_snapshot_flow() {
        let (env, _, client) = setup();

        // Three voters receive tokens
        let voter_a = Address::generate(&env);
        let voter_b = Address::generate(&env);
        let voter_c = Address::generate(&env);

        client.mint(&voter_a, &1000);
        client.mint(&voter_b, &500);
        client.mint(&voter_c, &2500);

        // Admin creates a governance snapshot at ledger 10
        set_ledger_sequence(&env, 10);
        let snapshot_id = client.create_snapshot();

        // Verify snapshot data
        assert_eq!(client.snapshot_ledger(&snapshot_id), 10);
        assert_eq!(client.total_supply_at(&snapshot_id), 4000);
        assert_eq!(client.balance_at(&voter_a, &snapshot_id), 1000);
        assert_eq!(client.balance_at(&voter_b, &snapshot_id), 500);
        assert_eq!(client.balance_at(&voter_c, &snapshot_id), 2500);

        // Voters "claim" their vote (downstream contract would call this)
        client.mark_claimed(&voter_a, &snapshot_id);
        client.mark_claimed(&voter_b, &snapshot_id);
        client.mark_claimed(&voter_c, &snapshot_id);

        // Double-claim prevented
        assert!(client.has_claimed(&voter_a, &snapshot_id));
        let result = client.try_mark_claimed(&voter_a, &snapshot_id);
        assert_eq!(result, Err(Ok(Error::AlreadyClaimed)));
    }
}
