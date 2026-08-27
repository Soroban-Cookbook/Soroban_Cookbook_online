#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, BytesN, Env, IntoVal,
};

use crate::{Upgradeable, UpgradeableClient};

mod v2_contract {
    soroban_sdk::contractimport!(
        file = "v2/target/wasm32-unknown-unknown/release/upgradeable_v2.wasm"
    );
}

fn install_v2_wasm(env: &Env) -> BytesN<32> {
    env.deployer().upload_contract_wasm(v2_contract::WASM)
}

#[test]
fn test_upgrade_preserves_state_and_exposes_v2_features() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    assert_eq!(client.version(), 1);
    client.set_value(&42);
    assert_eq!(client.get_value(), 42);

    let new_wasm_hash = install_v2_wasm(&env);
    client.upgrade(&new_wasm_hash);

    assert_eq!(client.version(), 2);

    let v2_client = v2_contract::Client::new(&env, &contract_id);
    assert_eq!(v2_client.get_value(), 42);
    assert_eq!(v2_client.get_value_doubled(), 84);
}

#[test]
fn test_upgrade_requires_admin_auth() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    let new_wasm_hash = install_v2_wasm(&env);

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
