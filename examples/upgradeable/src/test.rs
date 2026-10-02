// SPDX-License-Identifier: MIT

#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, BytesN, Env, IntoVal,
};

use crate::{DataKey, Upgradeable, UpgradeableClient};

/// The v2 Wasm built by `scripts/test-examples.sh` from `examples/upgradeable/v2`.
/// It is copied to this path for both `wasm32v1-none` and `wasm32-unknown-unknown`
/// builds so the import works regardless of which target produced it.
mod v2_wasm {
    soroban_sdk::contractimport!(
        file = "v2/target/wasm32-unknown-unknown/release/upgradeable_v2.wasm"
    );
}

/// Register a v1 contract with a generated admin and a mocked auth context.
fn setup() -> (Env, Address, UpgradeableClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);
    (env, contract_id, client)
}

/// Upload the real v2 Wasm and upgrade the contract to it.
fn upgrade_to_v2(env: &Env, client: &UpgradeableClient) -> v2_wasm::Client<'static> {
    let v2_wasm_hash = env.deployer().upload_contract_wasm(v2_wasm::WASM);
    client.upgrade(&v2_wasm_hash);
    v2_wasm::Client::new(env, &client.address)
}

#[test]
fn test_set_and_get_value_before_upgrade() {
    let (_, _, client) = setup();

    client.set_value(&100);
    assert_eq!(client.get_value(), 100);
    assert_eq!(client.version(), 1);
}

#[test]
fn test_migrate_bumps_version_once() {
    let (env, contract_id, client) = setup();

    client.set_value(&5);
    client.migrate();

    env.as_contract(&contract_id, || {
        let version: u32 = env.storage().instance().get(&DataKey::Version).unwrap();
        assert_eq!(version, 2);
    });
    assert_eq!(client.get_value(), 5);
}

#[test]
#[should_panic(expected = "Error(WasmVm, InvalidAction)")]
fn test_double_migrate_panics() {
    let (_, _, client) = setup();

    // First migrate succeeds, the idempotency guard rejects the second call.
    client.migrate();
    client.migrate();
}

#[test]
fn test_value_survives_upgrade() {
    let (env, _, client) = setup();

    client.set_value(&42);
    assert_eq!(client.get_value(), 42);
    assert_eq!(client.version(), 1);

    let v2_client = upgrade_to_v2(&env, &client);

    // The v2 code is now live and the stored state was preserved.
    assert_eq!(v2_client.version(), 2);
    assert_eq!(v2_client.get_value(), 42);

    // A v2-only feature reads the preserved state.
    assert_eq!(v2_client.get_value_doubled(), 84);
}

#[test]
fn test_value_survives_upgrade_v2() {
    let (env, contract_id, client) = setup();

    client.set_value(&77);
    assert_eq!(client.get_value(), 77);

    let v2_client = upgrade_to_v2(&env, &client);

    // Post-upgrade migration writes the v2 layout without losing the value.
    v2_client.migrate();

    env.as_contract(&contract_id, || {
        let version: u32 = env.storage().instance().get(&DataKey::Version).unwrap();
        assert_eq!(version, 2);
    });
    assert_eq!(v2_client.get_value(), 77);
    assert_eq!(v2_client.get_value_doubled(), 154);
}

#[test]
#[should_panic(expected = "Error(Auth, InvalidAction)")]
fn test_upgrade_requires_admin_auth() {
    let env = Env::default();

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let contract_id = env.register(Upgradeable, (&admin,));
    let client = UpgradeableClient::new(&env, &contract_id);

    let new_wasm_hash = BytesN::<32>::from_array(&env, &[0u8; 32]);

    // Authenticate as the wrong address: the contract's `admin.require_auth()`
    // must reject the upgrade before any Wasm is swapped.
    env.mock_auths(&[MockAuth {
        address: &non_admin,
        invoke: &MockAuthInvoke {
            contract: &contract_id,
            fn_name: "upgrade",
            args: (new_wasm_hash.clone(),).into_val(&env),
            sub_invokes: &[],
        },
    }]);

    client.upgrade(&new_wasm_hash);
}
