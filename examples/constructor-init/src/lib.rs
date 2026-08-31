#![no_std]

//! # Constructor args (`__constructor`) vs. delayed `initialize`
//!
//! This crate ships **two equivalent contracts** side by side so you can compare
//! the two ways to bootstrap the state of a Soroban contract:
//!
//! | Contract                | Bootstrap mechanism                        | Re-initialization      |
//! | ----------------------- | ------------------------------------------ | ---------------------- |
//! | [`ConstructorRegistry`] | `#[contractimpl] fn __constructor(...)`    | Impossible (SDK-enforced) |
//! | [`InitializeRegistry`]  | `initialize(...)`                          | Guarded, returns an error |
//!
//! Both contracts store the same state — an `Admin` address and a `Value` — and
//! expose the same read/update surface. The only difference is *when* and *how*
//! that state gets set.
//!
//! ## Which one should a new contract use?
//!
//! **Prefer `__constructor`.** It is the modern, recommended path:
//!
//! - Deploy-time arguments are passed in the same operation that creates the
//!   contract, so a fresh deployment is never left in an un-initialized state
//!   that callers can hit before setup finishes.
//! - The Soroban runtime invokes `__constructor` exactly once, at deployment,
//!   and then strips it from the callable interface. Double initialization is
//!   **not merely guarded — it is impossible**, because there is no way to
//!   invoke the constructor on a live deployment.
//! - No extra bookkeeping flag is needed.
//!
//! **Fall back to `initialize` only when a constructor cannot be used** — for
//! example, factory-deployed contracts that compile to a single known Wasm and
//! receive their per-deployment arguments over a separate call. There you must
//! guard against double initialization yourself (see
//! [`InitializeRegistry::initialize`]) and make every other function behave
//! safely *before* setup runs.
//!
//! ## Running
//!
//! ```bash
//! # From the repository root — the same command CI runs
//! ./scripts/test-examples.sh constructor-init
//!
//! # Or invoke cargo directly
//! cargo test --manifest-path examples/constructor-init/Cargo.toml
//! ```

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Value,
}

/// Failure modes shared by the two bootstrap styles.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// `initialize` was called but the contract is already set up. Only the
    /// delayed path needs this — a constructor-based contract can never hit it.
    AlreadyInitialized = 1,
    /// A state-dependent call was attempted before setup ran.
    NotInitialized = 2,
    /// Only the stored admin may perform this action.
    Unauthorized = 3,
}

// ─────────────────────────────────────────────────────────────
// Modern path: deploy-time `__constructor`
// ─────────────────────────────────────────────────────────────

/// A registry bootstrapped through a deploy-time constructor.
///
/// `__constructor(env, admin, value)` runs exactly once at deployment and is
/// removed from the contract's exposed interface, so there is no re-entry point
/// and no double-initialization to guard against.
#[contract]
pub struct ConstructorRegistry;

#[contractimpl]
impl ConstructorRegistry {
    /// Deploy-time setup. Invoked automatically by `env.register` / the deploy
    /// operation and never callable afterwards.
    pub fn __constructor(env: Env, admin: Address, value: u32) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Value, &value);
    }

    /// Return the admin stored at deployment.
    ///
    /// This returns `Err(Error::NotInitialized)` only in the (impossible-in-
    /// practice) case the deployment did not run the constructor.
    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Return the value stored at deployment (0 if unset).
    pub fn value(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Value).unwrap_or(0)
    }

    /// Overwrite the value. Only the deploy-time admin may call this.
    pub fn set_value(env: Env, new_value: u32) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Value, &new_value);
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────
// Legacy path: delayed `initialize`
// ─────────────────────────────────────────────────────────────

/// The same registry bootstrapped through a delayed `initialize` call.
///
/// This is the pattern older examples reach for when a constructor is not an
/// option (e.g. factory-deployed Wasm). It needs two extra safety measures the
/// constructor path gets for free:
///
/// 1. An `AlreadyInitialized` guard so a second `initialize` cannot clobber the
///    first and re-route the admin / value.
/// 2. Every other function must behave safely *before* `initialize` runs:
///    `value` returns a sane default and `set_value` / `admin` reject with
///    `Error::NotInitialized` rather than panicking on missing state.
#[contract]
pub struct InitializeRegistry;

#[contractimpl]
impl InitializeRegistry {
    /// Set up the registry. Returns `Error::AlreadyInitialized` if called a
    /// second time — this is the double-initialization guard.
    pub fn initialize(env: Env, admin: Address, value: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Value, &value);
        Ok(())
    }

    /// Return the admin, or `Err(Error::NotInitialized)` before setup.
    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Return the stored value, or 0 before `initialize` has run.
    pub fn value(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Value).unwrap_or(0)
    }

    /// Overwrite the value. Only the stored admin may call this, and only after
    /// `initialize` has run.
    pub fn set_value(env: Env, new_value: u32) -> Result<(), Error> {
        let admin = Self::admin(env.clone())?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Value, &new_value);
        Ok(())
    }
}

#[cfg(test)]
mod tests;