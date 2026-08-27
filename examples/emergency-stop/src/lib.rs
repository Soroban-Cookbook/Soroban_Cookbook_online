#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Paused,
    OpCount,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ContractPaused = 1,
}

/// Guard to drop at the top of any operational function. Returns
/// `Err(Error::ContractPaused)` instead of panicking while the circuit
/// breaker is tripped, so callers get a structured, catchable denial.
pub fn fail_if_paused(env: &Env) -> Result<(), Error> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if paused {
        Err(Error::ContractPaused)
    } else {
        Ok(())
    }
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EmergencyStop;

#[contractimpl]
impl EmergencyStop {
    /// Deploy-time setup: store the admin and start in the unpaused state.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::OpCount, &0u32);
    }

    /// Trip the circuit breaker, halting all guarded operations.
    /// Only the admin may call this.
    pub fn pause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
    }

    /// Reset the circuit breaker, restoring normal operation.
    /// Only the admin may call this.
    pub fn unpause(env: Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Whether the circuit breaker is currently tripped.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Dummy operational function guarded by the circuit breaker.
    pub fn do_work(env: Env) -> Result<u32, Error> {
        fail_if_paused(&env)?;
        let count: u32 = env.storage().instance().get(&DataKey::OpCount).unwrap_or(0);
        let next = count + 1;
        env.storage().instance().set(&DataKey::OpCount, &next);
        Ok(next)
    }

    /// Return how many times `do_work` has successfully executed.
    pub fn get_op_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::OpCount).unwrap_or(0)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation};
    use soroban_sdk::IntoVal;

    fn setup() -> (Env, Address, EmergencyStopClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(EmergencyStop, (&admin,));
        let client = EmergencyStopClient::new(&env, &contract_id);
        (env, admin, client)
    }

    #[test]
    fn test_unpaused_by_default() {
        let (_, _, client) = setup();
        assert!(!client.is_paused());
    }

    #[test]
    fn test_operations_succeed_when_unpaused() {
        let (_, _, client) = setup();
        assert_eq!(client.do_work(), 1);
        assert_eq!(client.do_work(), 2);
        assert_eq!(client.get_op_count(), 2);
    }

    #[test]
    fn test_pause_blocks_operations() {
        let (_, _, client) = setup();
        client.pause();
        assert!(client.is_paused());

        let result = client.try_do_work();
        assert_eq!(result, Err(Ok(Error::ContractPaused)));
        // No state should have been mutated by the rejected call.
        assert_eq!(client.get_op_count(), 0);
    }

    #[test]
    fn test_unpause_restores_operations() {
        let (_, _, client) = setup();
        client.pause();
        assert_eq!(client.try_do_work(), Err(Ok(Error::ContractPaused)));

        client.unpause();
        assert!(!client.is_paused());

        assert_eq!(client.do_work(), 1);
    }

    #[test]
    fn test_pause_requires_admin_auth() {
        let (env, admin, client) = setup();
        client.pause();

        assert_eq!(
            env.auths(),
            std::vec![(
                admin.clone(),
                AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        client.address.clone(),
                        soroban_sdk::symbol_short!("pause"),
                        ().into_val(&env),
                    )),
                    sub_invocations: std::vec![],
                }
            )]
        );
    }

    #[test]
    fn test_unpause_requires_admin_auth() {
        let (env, admin, client) = setup();
        client.pause();
        client.unpause();

        assert_eq!(
            env.auths(),
            std::vec![(
                admin.clone(),
                AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        client.address.clone(),
                        soroban_sdk::symbol_short!("unpause"),
                        ().into_val(&env),
                    )),
                    sub_invocations: std::vec![],
                }
            )]
        );
    }
}
