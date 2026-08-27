//! # Multi-Party Escrow
//!
//! An escrow contract that supports three roles:
//!
//! * **Depositor** – funds the escrow and can cancel before it is released.
//! * **Recipient** – receives funds when the escrow is released.
//! * **Arbitrator** – a neutral third party who can resolve disputes by
//!   releasing funds to the recipient *or* refunding them to the depositor.
//!
//! ## Happy path
//! 1. Depositor calls [`deposit`] to lock funds.
//! 2. Depositor calls [`release`] to send funds to the recipient, **or**
//!    either party calls [`dispute`] to hand control to the arbitrator.
//! 3. If disputed, arbitrator calls [`resolve`] with their decision.
//!
//! ## State machine
//!
//! ```text
//! PENDING ──release()──► RELEASED
//!         ──cancel()───► CANCELLED   (depositor only, before dispute)
//!         ──dispute()──► DISPUTED
//!                            │
//!                   resolve()├──► RELEASED  (arbitrator rules for recipient)
//!                            └──► CANCELLED (arbitrator rules for depositor)
//! ```
//!
//! ## Storage layout
//!
//! | Key          | Type      | Description                           |
//! |--------------|-----------|---------------------------------------|
//! | `Depositor`  | `Address` | Account that locked the funds         |
//! | `Recipient`  | `Address` | Intended receiver of the funds        |
//! | `Arbitrator` | `Address` | Neutral dispute resolver              |
//! | `Amount`     | `i128`    | Locked amount                         |
//! | `State`      | `State`   | Current state of the escrow           |

#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ─── Types ────────────────────────────────────────────────────────────────────

/// Life-cycle state of the escrow.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum State {
    /// Funds are locked; awaiting depositor action.
    Pending,
    /// Depositor or arbitrator triggered a dispute; awaiting arbitrator ruling.
    Disputed,
    /// Funds have been released to the recipient.
    Released,
    /// Funds have been returned to the depositor.
    Cancelled,
}

/// Persistent storage keys.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Depositor,
    Recipient,
    Arbitrator,
    Amount,
    State,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract has already been funded.
    AlreadyInitialised = 1,
    /// Contract has not been funded yet.
    NotInitialised = 2,
    /// Amount must be greater than zero.
    InvalidAmount = 3,
    /// Caller is not authorised to perform this action.
    Unauthorised = 4,
    /// Action is not permitted in the current state.
    InvalidState = 5,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowMultiparty;

#[contractimpl]
impl EscrowMultiparty {
    /// Lock funds into the escrow.
    ///
    /// # Arguments
    /// * `depositor`  – Funds the escrow; must authorise this call.
    /// * `recipient`  – Will receive the funds on a successful release.
    /// * `arbitrator` – Resolves disputes between depositor and recipient.
    /// * `amount`     – Token amount to lock (must be > 0).
    pub fn deposit(
        env: Env,
        depositor: Address,
        recipient: Address,
        arbitrator: Address,
        amount: i128,
    ) -> Result<(), Error> {
        depositor.require_auth();

        if env.storage().instance().has(&DataKey::State) {
            return Err(Error::AlreadyInitialised);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage().instance().set(&DataKey::Depositor, &depositor);
        env.storage().instance().set(&DataKey::Recipient, &recipient);
        env.storage().instance().set(&DataKey::Arbitrator, &arbitrator);
        env.storage().instance().set(&DataKey::Amount, &amount);
        env.storage().instance().set(&DataKey::State, &State::Pending);

        Ok(())
    }

    /// Release funds to the recipient.
    ///
    /// Only the depositor may call this, and only while the escrow is
    /// `Pending` (not yet disputed).
    pub fn release(env: Env) -> Result<i128, Error> {
        let depositor = Self::depositor(&env)?;
        depositor.require_auth();

        Self::require_state(&env, State::Pending)?;

        let amount = Self::amount(&env)?;
        env.storage().instance().set(&DataKey::State, &State::Released);
        Ok(amount)
    }

    /// Cancel the escrow and return funds to the depositor.
    ///
    /// Only the depositor may call this, and only while the escrow is
    /// `Pending` (not yet disputed).
    pub fn cancel(env: Env) -> Result<i128, Error> {
        let depositor = Self::depositor(&env)?;
        depositor.require_auth();

        Self::require_state(&env, State::Pending)?;

        let amount = Self::amount(&env)?;
        env.storage().instance().set(&DataKey::State, &State::Cancelled);
        Ok(amount)
    }

    /// Open a dispute, handing resolution authority to the arbitrator.
    ///
    /// Either the depositor or the recipient may raise a dispute, but only
    /// while the escrow is `Pending`.
    pub fn dispute(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        // Only depositor or recipient may open a dispute.
        let depositor = Self::depositor(&env)?;
        let recipient: Address = env
            .storage()
            .instance()
            .get(&DataKey::Recipient)
            .ok_or(Error::NotInitialised)?;

        if caller != depositor && caller != recipient {
            return Err(Error::Unauthorised);
        }

        Self::require_state(&env, State::Pending)?;
        env.storage().instance().set(&DataKey::State, &State::Disputed);
        Ok(())
    }

    /// Resolve a disputed escrow.
    ///
    /// Only the arbitrator may call this, and only while the escrow is
    /// `Disputed`.
    ///
    /// # Arguments
    /// * `release_to_recipient` – `true` releases funds to the recipient;
    ///   `false` refunds the depositor.
    pub fn resolve(env: Env, release_to_recipient: bool) -> Result<i128, Error> {
        let arbitrator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Arbitrator)
            .ok_or(Error::NotInitialised)?;
        arbitrator.require_auth();

        Self::require_state(&env, State::Disputed)?;

        let amount = Self::amount(&env)?;
        let new_state = if release_to_recipient {
            State::Released
        } else {
            State::Cancelled
        };
        env.storage().instance().set(&DataKey::State, &new_state);
        Ok(amount)
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// Return the current escrow state.
    pub fn state(env: Env) -> Result<State, Error> {
        env.storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)
    }

    /// Return the locked amount.
    pub fn get_amount(env: Env) -> Result<i128, Error> {
        Self::amount(&env)
    }

    /// Return the depositor address.
    pub fn get_depositor(env: Env) -> Result<Address, Error> {
        Self::depositor(&env)
    }

    /// Return the recipient address.
    pub fn get_recipient(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Recipient)
            .ok_or(Error::NotInitialised)
    }

    /// Return the arbitrator address.
    pub fn get_arbitrator(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Arbitrator)
            .ok_or(Error::NotInitialised)
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    fn depositor(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Depositor)
            .ok_or(Error::NotInitialised)
    }

    fn amount(env: &Env) -> Result<i128, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)
    }

    fn require_state(env: &Env, expected: State) -> Result<(), Error> {
        let current: State = env
            .storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;
        if current != expected {
            return Err(Error::InvalidState);
        }
        Ok(())
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    struct Actors {
        depositor: Address,
        recipient: Address,
        arbitrator: Address,
    }

    fn setup() -> (Env, Actors, EscrowMultipartyClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(EscrowMultiparty, ());
        let client = EscrowMultipartyClient::new(&env, &contract_id);
        let actors = Actors {
            depositor: Address::generate(&env),
            recipient: Address::generate(&env),
            arbitrator: Address::generate(&env),
        };
        (env, actors, client)
    }

    fn funded(amount: i128) -> (Env, Actors, EscrowMultipartyClient<'static>) {
        let (env, actors, client) = setup();
        client
            .deposit(&actors.depositor, &actors.recipient, &actors.arbitrator, &amount)
            .expect("deposit failed");
        (env, actors, client)
    }

    // ── deposit ───────────────────────────────────────────────────────────────

    #[test]
    fn test_deposit_stores_state() {
        let (_, actors, client) = funded(1_000);
        assert_eq!(client.state(), State::Pending);
        assert_eq!(client.get_amount(), 1_000);
        assert_eq!(client.get_depositor(), actors.depositor);
        assert_eq!(client.get_recipient(), actors.recipient);
        assert_eq!(client.get_arbitrator(), actors.arbitrator);
    }

    #[test]
    fn test_deposit_rejects_zero_amount() {
        let (_, actors, client) = setup();
        let err = client
            .try_deposit(&actors.depositor, &actors.recipient, &actors.arbitrator, &0)
            .unwrap_err();
        assert_eq!(err, Ok(Error::InvalidAmount));
    }

    #[test]
    fn test_deposit_rejects_negative_amount() {
        let (_, actors, client) = setup();
        let err = client
            .try_deposit(&actors.depositor, &actors.recipient, &actors.arbitrator, &-1)
            .unwrap_err();
        assert_eq!(err, Ok(Error::InvalidAmount));
    }

    #[test]
    fn test_deposit_rejects_double_init() {
        let (_, actors, client) = funded(500);
        let err = client
            .try_deposit(&actors.depositor, &actors.recipient, &actors.arbitrator, &500)
            .unwrap_err();
        assert_eq!(err, Ok(Error::AlreadyInitialised));
    }

    // ── release ───────────────────────────────────────────────────────────────

    #[test]
    fn test_release_by_depositor_succeeds() {
        let (_, _, client) = funded(1_000);
        assert_eq!(client.release(), 1_000);
        assert_eq!(client.state(), State::Released);
    }

    #[test]
    fn test_release_fails_after_cancel() {
        let (_, _, client) = funded(1_000);
        client.cancel();
        let err = client.try_release().unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    #[test]
    fn test_release_fails_when_disputed() {
        let (_, actors, client) = funded(1_000);
        client.dispute(&actors.depositor);
        let err = client.try_release().unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    #[test]
    fn test_cancel_by_depositor_succeeds() {
        let (_, _, client) = funded(750);
        assert_eq!(client.cancel(), 750);
        assert_eq!(client.state(), State::Cancelled);
    }

    #[test]
    fn test_cancel_fails_after_release() {
        let (_, _, client) = funded(750);
        client.release();
        let err = client.try_cancel().unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    #[test]
    fn test_cancel_fails_when_disputed() {
        let (_, actors, client) = funded(750);
        client.dispute(&actors.depositor);
        let err = client.try_cancel().unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    // ── dispute ───────────────────────────────────────────────────────────────

    #[test]
    fn test_depositor_can_open_dispute() {
        let (_, actors, client) = funded(500);
        client.dispute(&actors.depositor);
        assert_eq!(client.state(), State::Disputed);
    }

    #[test]
    fn test_recipient_can_open_dispute() {
        let (_, actors, client) = funded(500);
        client.dispute(&actors.recipient);
        assert_eq!(client.state(), State::Disputed);
    }

    #[test]
    fn test_third_party_cannot_open_dispute() {
        let (env, _, client) = funded(500);
        let stranger = Address::generate(&env);
        let err = client.try_dispute(&stranger).unwrap_err();
        assert_eq!(err, Ok(Error::Unauthorised));
    }

    #[test]
    fn test_dispute_fails_after_release() {
        let (_, actors, client) = funded(500);
        client.release();
        let err = client.try_dispute(&actors.depositor).unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    #[test]
    fn test_dispute_fails_after_cancel() {
        let (_, actors, client) = funded(500);
        client.cancel();
        let err = client.try_dispute(&actors.depositor).unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    // ── resolve ───────────────────────────────────────────────────────────────

    #[test]
    fn test_resolve_in_favour_of_recipient() {
        let (_, actors, client) = funded(1_000);
        client.dispute(&actors.recipient);
        assert_eq!(client.resolve(&true), 1_000);
        assert_eq!(client.state(), State::Released);
    }

    #[test]
    fn test_resolve_in_favour_of_depositor() {
        let (_, actors, client) = funded(1_000);
        client.dispute(&actors.depositor);
        assert_eq!(client.resolve(&false), 1_000);
        assert_eq!(client.state(), State::Cancelled);
    }

    #[test]
    fn test_resolve_fails_when_not_disputed() {
        let (_, _, client) = funded(1_000);
        // Still Pending — not yet disputed.
        let err = client.try_resolve(&true).unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    #[test]
    fn test_resolve_cannot_be_called_twice() {
        let (_, actors, client) = funded(1_000);
        client.dispute(&actors.depositor);
        client.resolve(&true);
        // Already Released — resolve again must fail.
        let err = client.try_resolve(&false).unwrap_err();
        assert_eq!(err, Ok(Error::InvalidState));
    }

    // ── view helpers on uninitialised contract ─────────────────────────────────

    #[test]
    fn test_view_helpers_fail_before_init() {
        let (_, _, client) = setup();
        assert_eq!(client.try_state(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_get_amount(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_get_depositor(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_get_recipient(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_get_arbitrator(), Err(Ok(Error::NotInitialised)));
    }
}
