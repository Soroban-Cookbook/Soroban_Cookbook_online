//! # Rate Limit
//!
//! A per-address action rate limiter enforced inside the contract.
//!
//! Faucets, mints and other permissioned entry points often need to throttle
//! how often a single address may trigger an action. This example enforces a
//! sliding **window** based on ledger time: an address may perform at most
//! `max_actions` within every `window_seconds` period. Once the window elapses
//! the counter resets, so the limit is a *rate*, not a hard lifetime cap.
//!
//! ## Storage layout
//!
//! All per-address state lives in a single `Map<Address, Window>` held in
//! **instance** storage under one key:
//!
//! | Key       | Type                  | Description                              |
//! |-----------|-----------------------|------------------------------------------|
//! | `Admin`   | `Address`             | The only address allowed to configure.   |
//! | `Config`  | `Config`              | `(window_seconds, max_actions)` policy.  |
//! | `Windows` | `Map<Address, Window>`| Per-address window bookkeeping.          |
//!
//! A `Window` records when the current window started (`start`, a ledger
//! timestamp) and how many actions have been performed in it (`count`).
//!
//! ## Storage cost
//!
//! * Instance storage is **budgeted** and cheap to read, but it is wiped on
//!   contract upgrade and has a TTL that must be extended periodically.
//! * Keeping every address in one `Map` means the map grows by one entry per
//!   unique caller. A faucet hammered by many distinct addresses will see its
//!   instance storage — and therefore its rent — grow unbounded. If you need
//!   persistence across upgrades or bounded growth, prefer **persistent**
//!   storage keyed per address (e.g. `Window(Address)`), at the cost of paying
//!   rent for each entry and managing TTLs individually.
//! * The rate check happens **before** any side effect. When an address is over
//!   its limit we return `RateLimitExceeded` early and never touch storage or
//!   do work — only a caller who is *allowed* to act pays the write cost.
//!
//! ## Verification
//!
//! * **Window test** — an address succeeds up to `max_actions`, then is blocked
//!   until the window rolls over.
//! * **Different addresses independent** — address A hitting its limit does not
//!   affect address B's remaining quota.

#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Map};

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Window {
    /// Ledger timestamp at which the current window began.
    pub start: u64,
    /// Number of actions performed within the current window.
    pub count: u32,
}

#[contracttype]
#[derive(Clone, Copy)]
pub struct Config {
    /// Length of a rate-limit window, in ledger seconds.
    pub window_seconds: u64,
    /// Maximum number of actions allowed per address per window.
    pub max_actions: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Config,
    Windows,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The contract has not been configured yet.
    NotInitialised = 1,
    /// Only the admin may change the configuration.
    Unauthorised = 2,
    /// The caller has exhausted its actions for the current window.
    RateLimitExceeded = 3,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct RateLimit;

#[contractimpl]
impl RateLimit {
    /// Initialise the contract and record the configuring admin.
    ///
    /// # Arguments
    /// * `admin` – The only address permitted to call `configure`.
    pub fn initialise(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::Unauthorised);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        extend_instance(&env);
        Ok(())
    }

    /// Set the rate-limit policy. Admin only.
    ///
    /// # Arguments
    /// * `window_seconds` – Length of each window in ledger seconds.
    /// * `max_actions` – Actions permitted per address per window.
    pub fn configure(
        env: Env,
        caller: Address,
        window_seconds: u64,
        max_actions: u32,
    ) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;
        if caller != admin {
            return Err(Error::Unauthorised);
        }
        env.storage().instance().set(
            &DataKey::Config,
            &Config {
                window_seconds,
                max_actions,
            },
        );
        extend_instance(&env);
        Ok(())
    }

    /// Perform a rate-limited action on behalf of `caller`.
    ///
    /// Succeeds (returning the remaining actions in the window) when the caller
    /// is under its limit, and fails with `RateLimitExceeded` once the limit is
    /// reached. The window rolls over automatically based on ledger time, so a
    /// caller blocked now may act again after `window_seconds` elapse.
    ///
    /// The limit check happens *before* any storage write, so an over-limit
    /// caller pays nothing but the failed invocation.
    pub fn try_act(env: Env, caller: Address) -> Result<u32, Error> {
        caller.require_auth();

        let config: Config = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialised)?;

        let now = env.ledger().timestamp();
        let mut windows: Map<Address, Window> = env
            .storage()
            .instance()
            .get(&DataKey::Windows)
            .unwrap_or_else(|| Map::new(&env));

        let mut window = windows.get(caller.clone()).unwrap_or(Window {
            start: now,
            count: 0,
        });

        // Roll the window over if enough ledger time has elapsed.
        if now.saturating_sub(window.start) >= config.window_seconds {
            window.start = now;
            window.count = 0;
        }

        if window.count >= config.max_actions {
            return Err(Error::RateLimitExceeded);
        }

        window.count += 1;
        windows.set(caller.clone(), window.clone());
        env.storage().instance().set(&DataKey::Windows, &windows);
        extend_instance(&env);

        Ok(config.max_actions - window.count)
    }

    /// View the number of actions `caller` may still perform this window.
    pub fn remaining(env: Env, caller: Address) -> u32 {
        let config: Config = match env.storage().instance().get(&DataKey::Config) {
            Some(c) => c,
            None => return 0,
        };
        let windows: Map<Address, Window> = env
            .storage()
            .instance()
            .get(&DataKey::Windows)
            .unwrap_or_else(|| Map::new(&env));

        let window = match windows.get(caller) {
            Some(w) => w,
            None => return config.max_actions,
        };

        let now = env.ledger().timestamp();
        if now.saturating_sub(window.start) >= config.window_seconds {
            return config.max_actions;
        }
        config.max_actions.saturating_sub(window.count)
    }

    /// View the current rate-limit policy.
    pub fn get_config(env: Env) -> Option<Config> {
        env.storage().instance().get(&DataKey::Config)
    }
}

/// Keep the instance storage alive long enough to be useful between calls.
fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(50 * 24 * 60 * 60, 90 * 24 * 60 * 60);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger as _};
    use soroban_sdk::{Address, Env};

    // The generated client unpacks `Result` returns, so `initialise`/`configure`
    // (which return `Result<(), Error>`) yield `()` and `try_act` (which returns
    // `Result<u32, Error>`) yields `u32`. The `try_*` client methods return the
    // double-wrapped `Result<Result<T, E>, Result<E, InvokeError>>`.
    fn setup() -> (Env, Address, RateLimitClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(RateLimit, ());
        let client = RateLimitClient::new(&env, &contract_id);

        client.initialise(&admin);
        // 3 actions per 10-second window.
        client.configure(&admin, &10, &3);

        (env, admin, client)
    }

    #[test]
    fn test_first_act_succeeds() {
        let (_env, _admin, client) = setup();
        let caller = Address::generate(&_env);
        assert_eq!(client.try_act(&caller), 2);
    }

    // ── Window test ────────────────────────────────────────────────────────────

    #[test]
    fn test_window_blocks_after_limit() {
        let (env, _admin, client) = setup();
        let caller = Address::generate(&env);

        // max_actions is 3, so the first three succeed (remaining 2,1,0).
        assert_eq!(client.try_act(&caller), 2);
        assert_eq!(client.try_act(&caller), 1);
        assert_eq!(client.try_act(&caller), 0);

        // The fourth, still inside the window, is blocked.
        let result = client.try_try_act(&caller);
        assert_eq!(result, Err(Ok(Error::RateLimitExceeded)));
    }

    #[test]
    fn test_window_rolls_over() {
        let (env, _admin, client) = setup();
        let caller = Address::generate(&env);

        // Exhaust the window.
        client.try_act(&caller);
        client.try_act(&caller);
        client.try_act(&caller);
        assert_eq!(
            client.try_try_act(&caller),
            Err(Ok(Error::RateLimitExceeded))
        );

        // Advance ledger time past the 10-second window.
        env.ledger().set_timestamp(env.ledger().timestamp() + 11);

        // The counter has reset, so another action succeeds.
        assert_eq!(client.try_act(&caller), 2);
    }

    // ── Different addresses independent ───────────────────────────────────────

    #[test]
    fn test_different_addresses_independent() {
        let (env, _admin, client) = setup();
        let a = Address::generate(&env);
        let b = Address::generate(&env);

        // A exhausts its quota.
        client.try_act(&a);
        client.try_act(&a);
        client.try_act(&a);
        assert_eq!(client.try_try_act(&a), Err(Ok(Error::RateLimitExceeded)));

        // B has its own independent window and is unaffected.
        assert_eq!(client.try_act(&b), 2);
        assert_eq!(client.remaining(&a), 0);
        assert_eq!(client.remaining(&b), 2);
    }

    #[test]
    fn test_remaining_reflects_state() {
        let (env, _admin, client) = setup();
        let caller = Address::generate(&env);
        assert_eq!(client.remaining(&caller), 3);
        client.try_act(&caller);
        assert_eq!(client.remaining(&caller), 2);
    }

    #[test]
    fn test_configure_requires_admin() {
        let (env, _admin, client) = setup();
        let intruder = Address::generate(&env);
        let result = client.try_configure(&intruder, &100, &1);
        assert_eq!(result, Err(Ok(Error::Unauthorised)));
    }

    #[test]
    fn test_try_act_before_configure_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(RateLimit, ());
        let client = RateLimitClient::new(&env, &contract_id);
        client.initialise(&admin);

        let caller = Address::generate(&env);
        assert_eq!(
            client.try_try_act(&caller),
            Err(Ok(Error::NotInitialised))
        );
    }
}
