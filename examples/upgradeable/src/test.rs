#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, BytesN, Env, IntoVal,
};

use crate::{Upgradeable, UpgradeableClient, DataKey};

#[test]
fn test_double_migrate_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    // Set version to 1 manually to simulate v1 state
    env.as_contract(&contract_id, || {
        env.storage().instance().set(&DataKey::Version, &1u32);
    });

    // First migrate should succeed (sets version to 2)
    client.migrate();

    // Second migrate should panic with "Migration already applied"
    // Call from contract context since migrate accesses storage
    env.as_contract(&contract_id, || {
        // This should panic
        let result = std::panic::catch_unwind(|| client.migrate());
        assert!(result.is_err(), "Expected migrate to panic on second call");
    });
}

#[test]
fn test_value_survives_upgrade() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    client.set_value(&42);
    assert_eq!(client.get_value(), 42);

    // Use fixed wasm hash
    let new_wasm_hash = BytesN::<32>::from_array(&env, &[0u8; 32]);

    // Upgrade to v2
    client.upgrade(&new_wasm_hash);

    // After upgrade, value should survive (migrated by migrate())
    env.as_contract(&contract_id, || {
        assert_eq!(client.version(), 2);
        assert_eq!(client.get_value(), 42);
    });
}

#[test]
fn test_upgrade_requires_admin_auth() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    let new_wasm_hash = BytesN::<32>::from_array(&env, &[0u8; 32]);

    env.mock_all_auths();
    client.upgrade(&new_wasm_hash);

    assert_eq!(
        env.auths(),
        std::vec![(
            admin.clone(),
            AuthorizedInvocation {
                function: AuthorizedFunction::Contract((
                    contract_id.clone(),
                    soroban_sdk::symbol_short!("upgrade"),
                    (new_wasm_hash.clone(),).into_val(&env),
                )),
                sub_invocations: std::vec![],
            }
        )]
    );
}

#[test]
fn test_set_and_get_value_before_upgrade() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    assert_eq!(client.get_value(), 0);
    client.set_value(&100);
    assert_eq!(client.get_value(), 100);
}