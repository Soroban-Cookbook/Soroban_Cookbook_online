#![cfg(test)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

use crate::{ConstructorRegistry, ConstructorRegistryClient, Error, InitializeRegistry, InitializeRegistryClient};

// ─────────────────────────────────────────────
// Modern path: `__constructor`
// ─────────────────────────────────────────────

/// The constructor runs once, at deployment, and leaves the instance fully
/// initialized — no separate setup call is ever required.
mod constructed {
    use super::*;

    fn setup(value: u32) -> (Env, Address, ConstructorRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(ConstructorRegistry, (&admin, value));
        let client = ConstructorRegistryClient::new(&env, &contract_id);
        (env, admin, client)
    }

    /// A second deployment is a fully independent instance: the constructor
    /// runs once per deployment and never re-runs on an existing one. Each
    /// instance carries its own constructor-supplied value with no cross-talk.
    #[test]
    fn test_each_deployment_is_initialized_independently() {
        let (_, admin_a, client_a) = setup(10);
        let (_, admin_b, client_b) = setup(99);

        assert_eq!(client_a.admin(), admin_a);
        assert_eq!(client_b.admin(), admin_b);
        assert_eq!(client_a.value(), 10);
        assert_eq!(client_b.value(), 99);
    }

    #[test]
    fn test_constructor_registry_reports_admin_and_value() {
        let (_, admin, client) = setup(42);
        assert_eq!(client.admin(), admin);
        assert_eq!(client.value(), 42);
    }

    #[test]
    fn test_constructor_registry_set_value_requires_admin_auth() {
        let (_, _, client) = setup(7);
        client.set_value(&8);
        assert_eq!(client.value(), 8);
    }

    #[test]
    #[should_panic]
    fn test_constructor_registry_set_value_rejects_unauthorized_caller() {
        // No mock_all_auths here: a random caller must be rejected.
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(ConstructorRegistry, (&admin, 7_u32));
        let client = ConstructorRegistryClient::new(&env, &contract_id);
        client.set_value(&8);
    }

    // Note: there is intentionally no `initialize` on ConstructorRegistry.
    // `__constructor` is stripped from the callable interface after deployment,
    // so a second initialization has no entry point and a `try_initialize`
    // would not even compile here.
}

// ─────────────────────────────────────────────
// Legacy path: delayed `initialize`
// ─────────────────────────────────────────────

#[cfg(test)]
mod initialized {
    use super::*;

    fn setup(value: u32) -> (Env, Address, InitializeRegistryClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(InitializeRegistry, ());
        let client = InitializeRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &value);
        (env, admin, client)
    }

    #[test]
    fn test_initialize_sets_state() {
        let (_, admin, client) = setup(5);
        assert_eq!(client.admin(), admin);
        assert_eq!(client.value(), 5);
    }

    /// The delayed path must guard against being initialized twice.
    #[test]
    fn test_double_initialize_is_rejected() {
        let (_, admin, client) = setup(5);

        let result = client.try_initialize(&admin, &99);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));

        // The first initialization's state is untouched.
        assert_eq!(client.value(), 5);
    }

    #[test]
    #[should_panic]
    fn test_initialize_requires_caller_auth() {
        // No mock_all_auths: initialization from an unauthenticated caller must fail.
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(InitializeRegistry, ());
        let client = InitializeRegistryClient::new(&env, &contract_id);
        client.initialize(&admin, &1);
    }

    #[test]
    fn test_value_defaults_before_initialize() {
        let env = Env::default();
        let contract_id = env.register(InitializeRegistry, ());
        let client = InitializeRegistryClient::new(&env, &contract_id);

        assert_eq!(client.value(), 0);
        assert_eq!(client.try_admin(), Err(Ok(Error::NotInitialized)));
    }

    #[test]
    fn test_set_value_requires_initialization_then_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(InitializeRegistry, ());
        let client = InitializeRegistryClient::new(&env, &contract_id);

        // Before initialize: state-dependent calls are rejected cleanly.
        assert_eq!(client.try_set_value(&10), Err(Ok(Error::NotInitialized)));

        client.initialize(&admin, &1);
        client.set_value(&10);
        assert_eq!(client.value(), 10);
    }
}