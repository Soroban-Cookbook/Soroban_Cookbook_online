//! Balance Snapshot — capture account balances at specific points in time for
//! voting, dividends, and historical queries.
//!
//! ## Design
//!
//! This contract extends a basic token ledger with **historical balance
//! snapshots**.  Any caller can request a snapshot of selected addresses at the
//! current ledger.  Each snapshot is persisted on-chain with a composite key
//! `Snapshot(id, Address)` and an event is published so off-chain indexers can
//! replicate the data without querying every storage entry.
//!
//! ### Storage layout
//! | Scope      | Key                        | Value                         |
//! |------------|----------------------------|-------------------------------|
//! | Persistent | `Balance(Address)`        | `i128` current balance        |
//! | Persistent | `Snapshot(u32, Address)`  | `i128` balance at snapshot    |
//! | Instance   | `SnapshotCount`           | `u32` next snapshot id        |
//! | Instance   | `SnapshotMeta(u32)`       | `SnapshotMeta` ledger & time  |
//!
//! ### Events
//! When `take_snapshot` succeeds, a contract event is emitted:
//! - **topics**: `["snapshot", snapshot_id_as_symbol]`
//! - **data**: `(ledger_sequence, timestamp, num_addresses_snapshotted)`
//!
//! Off-chain indexers can listen for these events and reconstruct the full
//! snapshot history without scanning storage.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Vec};

// ── storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
    Snapshot(u32, Address),
    SnapshotCount,
    SnapshotMeta(u32),
}

// ── types ─────────────────────────────────────────────────────────────────────

/// Metadata recorded for each snapshot so off-chain indexers and clients can
/// correlate a snapshot id with a specific point in chain history.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SnapshotMeta {
    /// Ledger sequence at which the snapshot was taken.
    pub ledger: u32,
    /// UNIX timestamp (seconds) at the snapshot ledger.
    pub timestamp: u64,
}

// ── error taxonomy ────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Transfer amount must be strictly positive.
    InvalidAmount = 1,
    /// Sender balance is too low to cover the transfer.
    InsufficientBalance = 2,
    /// Source and destination must differ.
    SelfTransfer = 3,
    /// The addresses list for snapshot is empty.
    EmptyAddressList = 4,
}

// ── contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct BalanceSnapshot;

#[contractimpl]
impl BalanceSnapshot {
    // ── token ledger (same semantics as token-transfer) ────────────────────

    /// Mint tokens to `to`.  For testing / demo purposes only.
    pub fn mint(env: Env, to: Address, amount: i128) {
        let key = DataKey::Balance(to.clone());
        let current: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&key, &(current + amount));
    }

    /// Return the current balance of `of`.
    pub fn balance(env: Env, of: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(of))
            .unwrap_or(0)
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

    // ── snapshot operations ────────────────────────────────────────────────

    /// Take a snapshot of the current balances for every address in `addresses`.
    ///
    /// Each address' balance is stored under `Snapshot(id, address)` and an
    /// event is published so off-chain indexers can pick up the full snapshot
    /// without scanning storage.
    ///
    /// *Note:* Duplicate addresses are not filtered. They safely overwrite the
    /// snapshot with the same balance, but will inflate the `num_addresses`
    /// count in the emitted event.
    ///
    /// Returns the newly assigned snapshot id.
    pub fn take_snapshot(env: Env, addresses: Vec<Address>) -> Result<u32, Error> {
        if addresses.is_empty() {
            return Err(Error::EmptyAddressList);
        }

        // Allocate the next snapshot id (monotonically increasing).
        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::SnapshotCount)
            .unwrap_or(0);

        let ledger = env.ledger().sequence();
        let timestamp = env.ledger().timestamp();

        // Persist per-address balances and the snapshot metadata.
        for addr in addresses.iter() {
            let balance: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(addr.clone()))
                .unwrap_or(0);
            env.storage()
                .persistent()
                .set(&DataKey::Snapshot(id, addr), &balance);
        }

        env.storage().instance().set(
            &DataKey::SnapshotMeta(id),
            &SnapshotMeta { ledger, timestamp },
        );
        env.storage()
            .instance()
            .set(&DataKey::SnapshotCount, &(id + 1));

        // Emit event for off-chain indexer integration.
        // topics: ["snapshot", id] — allows filtering by snapshot event type.
        // data: (ledger, timestamp, num_addresses) — payload for indexers.
        let topics = (symbol_short!("snapshot"), id);
        env.events()
            .publish(topics, (ledger, timestamp, addresses.len()));

        Ok(id)
    }

    /// Return the balance `address` held at the moment `snapshot_id` was taken.
    ///
    /// Returns `None` when:
    /// - The snapshot id has never been created, or
    /// - The snapshot exists but `address` was not included in it.
    ///
    /// Callers can disambiguate these two cases by checking
    /// [`Self::snapshot_meta`] first.
    pub fn snapshot_balance(env: Env, snapshot_id: u32, address: Address) -> Option<i128> {
        if !env
            .storage()
            .instance()
            .has(&DataKey::SnapshotMeta(snapshot_id))
        {
            return None;
        }
        env.storage()
            .persistent()
            .get(&DataKey::Snapshot(snapshot_id, address))
    }

    /// Return the total number of snapshots that have been taken so far.
    pub fn snapshot_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::SnapshotCount)
            .unwrap_or(0)
    }

    /// Return metadata (ledger, timestamp) for the given snapshot id, if it exists.
    pub fn snapshot_meta(env: Env, snapshot_id: u32) -> Option<SnapshotMeta> {
        env.storage()
            .instance()
            .get(&DataKey::SnapshotMeta(snapshot_id))
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events, Ledger, LedgerInfo},
        vec, Env,
    };

    fn setup() -> (Env, soroban_sdk::Address, BalanceSnapshotClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(BalanceSnapshot, ());
        let client = BalanceSnapshotClient::new(&env, &contract_id);
        (env, contract_id, client)
    }

    /// Helper: advance the ledger to `seq` while preserving other ledger fields.
    fn set_ledger(env: &Env, seq: u32, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            timestamp,
            protocol_version: 22,
            sequence_number: seq,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });
    }

    // ── token ledger tests ─────────────────────────────────────────────────

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
        // State unchanged
        assert_eq!(client.balance(&alice), 100);
        assert_eq!(client.balance(&bob), 0);
    }

    #[test]
    fn test_transfer_fails_on_invalid_amount() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &100);
        assert_eq!(
            client.try_transfer(&alice, &bob, &0),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            client.try_transfer(&alice, &bob, &-50),
            Err(Ok(Error::InvalidAmount))
        );
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
        assert_eq!(client.balance(&Address::generate(&env)), 0);
    }

    // ── snapshot tests ─────────────────────────────────────────────────────

    #[test]
    fn test_snapshot_count_starts_at_zero() {
        let (_env, _, client) = setup();
        assert_eq!(client.snapshot_count(), 0);
    }

    #[test]
    fn test_snapshot_increments_count() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &1000);
        let id = client.take_snapshot(&vec![&env, alice.clone()]);
        assert_eq!(id, 0);
        assert_eq!(client.snapshot_count(), 1);

        let id2 = client.take_snapshot(&vec![&env, alice.clone()]);
        assert_eq!(id2, 1);
        assert_eq!(client.snapshot_count(), 2);
    }

    #[test]
    fn test_snapshot_captures_balances() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.mint(&alice, &1000);
        client.mint(&bob, &500);
        // carol has 0

        let id = client.take_snapshot(&vec![&env, alice.clone(), bob.clone(), carol.clone()]);

        assert_eq!(client.snapshot_balance(&id, &alice), Some(1000));
        assert_eq!(client.snapshot_balance(&id, &bob), Some(500));
        assert_eq!(client.snapshot_balance(&id, &carol), Some(0));
    }

    #[test]
    fn test_snapshot_does_not_include_omitted_address() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        client.mint(&bob, &500);

        // Only snapshot alice, not bob
        let id = client.take_snapshot(&vec![&env, alice.clone()]);

        assert_eq!(client.snapshot_balance(&id, &alice), Some(1000));
        assert_eq!(client.snapshot_balance(&id, &bob), None);
    }

    #[test]
    fn test_snapshot_preserves_historical_state() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);

        // Snapshot 0: alice=1000, bob=0
        let id0 = client.take_snapshot(&vec![&env, alice.clone(), bob.clone()]);

        // Transfer changes the state
        client.transfer(&alice, &bob, &400);

        // Snapshot 1: alice=600, bob=400
        let id1 = client.take_snapshot(&vec![&env, alice.clone(), bob.clone()]);

        // Historical snapshots remain unchanged
        assert_eq!(client.snapshot_balance(&id0, &alice), Some(1000));
        assert_eq!(client.snapshot_balance(&id0, &bob), Some(0));
        assert_eq!(client.snapshot_balance(&id1, &alice), Some(600));
        assert_eq!(client.snapshot_balance(&id1, &bob), Some(400));

        // Current balances reflect the most recent state
        assert_eq!(client.balance(&alice), 600);
        assert_eq!(client.balance(&bob), 400);
    }

    #[test]
    fn test_snapshot_meta_records_ledger_and_timestamp() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        // Advance ledger to a known point
        set_ledger(&env, 42, 1_700_000_000);

        client.mint(&alice, &1000);
        let id = client.take_snapshot(&vec![&env, alice.clone()]);

        let meta = client.snapshot_meta(&id);
        assert!(meta.is_some());
        let meta = meta.unwrap();
        assert_eq!(meta.ledger, 42);
        assert_eq!(meta.timestamp, 1_700_000_000);
    }

    #[test]
    fn test_snapshot_balance_nonexistent_id_returns_none() {
        let (env, _, client) = setup();
        assert_eq!(
            client.snapshot_balance(&999, &Address::generate(&env)),
            None
        );
    }

    #[test]
    fn test_snapshot_meta_nonexistent_id_returns_none() {
        let (_, _, client) = setup();
        assert_eq!(client.snapshot_meta(&999), None);
    }

    #[test]
    fn test_empty_address_list_is_rejected() {
        let (env, _, client) = setup();
        let result = client.try_take_snapshot(&vec![&env]);
        assert_eq!(result, Err(Ok(Error::EmptyAddressList)));
    }

    #[test]
    fn test_multiple_snapshots_independent() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        // Snapshot 0
        client.mint(&alice, &500);
        let id0 = client.take_snapshot(&vec![&env, alice.clone()]);

        // Snapshot 1 — double the balance
        client.mint(&alice, &500);
        let id1 = client.take_snapshot(&vec![&env, alice.clone(), bob.clone()]);

        assert_eq!(client.snapshot_balance(&id0, &alice), Some(500));
        assert_eq!(client.snapshot_balance(&id1, &alice), Some(1000));
        assert_eq!(client.snapshot_balance(&id1, &bob), Some(0));
    }

    /// Verifies that taking a snapshot emits a contract event with the correct
    /// topics and data — off-chain indexers listen for these events to
    /// reconstruct snapshot history without scanning storage.
    #[test]
    fn test_snapshot_emits_event() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &1000);
        client.mint(&bob, &500);

        // Advance ledger so event data is predictable
        set_ledger(&env, 10, 1_700_000_000);
        let id = client.take_snapshot(&vec![&env, alice.clone(), bob.clone()]);
        assert_eq!(id, 0);

        // Verify the event was actually published.
        let events = env.events().all();
        assert_eq!(events.len(), 1);
        let (_ev_contract, ev_topics, ev_data) = events.last().unwrap();
        assert_eq!(
            ev_topics,
            (symbol_short!("snapshot"), 0u32).into_val(&env)
        );
        assert_eq!(
            ev_data,
            (10u32, 1_700_000_000u64, 2u32).into_val(&env)
        );
    }

    #[test]
    fn test_snapshot_read_only_does_not_affect_current_balances() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        client.mint(&alice, &1000);
        let id = client.take_snapshot(&vec![&env, alice.clone()]);

        // Reading snapshot should not change current balance
        let _ = client.snapshot_balance(&id, &alice);
        let _ = client.snapshot_meta(&id);
        let _ = client.snapshot_count();

        assert_eq!(client.balance(&alice), 1000);
    }
}
