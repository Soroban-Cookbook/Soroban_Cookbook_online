// SPDX-License-Identifier: MIT

#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {
    pub fn initialize(env: Env, owner: Address) {
        env.storage().persistent().set(&"owner", &owner);
    }

    fn owner_of(env: &Env) -> Address {
        env.storage().persistent().get(&"owner").unwrap()
    }

    pub fn set_admin(env: Env, admin: Address) {
        let owner = Self::owner_of(&env);
        owner.require_auth();
        env.storage().persistent().set(&"admin", &admin);
    }

    pub fn privileged_action(env: Env) {
        let admin: Address = env.storage().persistent().get(&"admin").unwrap();
        admin.require_auth();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, MockAuth, MockAuthInvoke},
        Env, IntoVal,
    };

    #[test]
    fn test_initialize_and_set_admin() {
        let env = Env::default();
        let contract_id = env.register(AccessControl, ());
        let client = AccessControlClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let alice = Address::generate(&env);
        env.mock_all_auths();

        client.initialize(&owner);
        client.set_admin(&alice);
    }

    #[test]
    fn test_privileged_action() {
        let env = Env::default();
        let contract_id = env.register(AccessControl, ());
        let client = AccessControlClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let admin = Address::generate(&env);
        let stranger = Address::generate(&env);

        client.initialize(&owner);

        env.mock_auths(&[MockAuth {
            address: &owner,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_admin",
                args: (admin.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.set_admin(&admin);

        env.mock_auths(&[MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "privileged_action",
                args: ().into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.privileged_action();

        env.mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "privileged_action",
                args: ().into_val(&env),
                sub_invokes: &[],
            },
        }]);
        assert!(client.try_privileged_action().is_err());

        env.mock_auths(&[MockAuth {
            address: &stranger,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_admin",
                args: (stranger.clone(),).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        assert!(client.try_set_admin(&stranger).is_err());
    }
}
