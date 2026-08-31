#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Profile {
    pub name: String,
    pub role: Symbol,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Profile(Address),
}

#[contract]
pub struct EventsCatalog;

#[contractimpl]
impl EventsCatalog {
    pub fn set_profile(env: Env, account: Address, name: String, role: Symbol) {
        let profile = Profile {
            name: name.clone(),
            role: role.clone(),
            active: true,
        };

        env.storage().persistent().set(&DataKey::Profile(account.clone()), &profile);

        env.events().publish(
            (Symbol::new(&env, "profile_set"), account.clone()),
            (name, role, true),
        );
    }

    pub fn set_status(env: Env, account: Address, active: bool) {
        let mut profile: Profile = env
            .storage()
            .persistent()
            .get(&DataKey::Profile(account.clone()))
            .unwrap();

        profile.active = active;
        env.storage()
            .persistent()
            .set(&DataKey::Profile(account.clone()), &profile);

        env.events()
            .publish((Symbol::new(&env, "profile_status"), account.clone()), active);
    }

    pub fn get_profile(env: Env, account: Address) -> Option<Profile> {
        env.storage()
            .persistent()
            .get(&DataKey::Profile(account))
    }
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events as _},
        xdr, Env, FromVal, IntoVal,
    };

    #[test]
    fn test_set_profile_emits_indexer_friendly_event() {
        let env = Env::default();
        let contract_id = env.register(EventsCatalog, ());
        let client = EventsCatalogClient::new(&env, &contract_id);

        let account = Address::generate(&env);
        let name = String::from_str(&env, "alice");
        let role = Symbol::new(&env, "admin");

        client.set_profile(&account, &name.clone(), &role);

        let events = env.events().all();
        let emitted = events.events();
        assert_eq!(emitted.len(), 1);

        let profile_topic: soroban_sdk::Val = Symbol::new(&env, "profile_set").into_val(&env);
        let account_val: soroban_sdk::Val = account.clone().into_val(&env);
        let profile_data: soroban_sdk::Val = (name.clone(), role.clone(), true).into_val(&env);

        let xdr_event = &emitted[0];
        let xdr_body = match &xdr_event.body {
            xdr::ContractEventBody::V0(body) => body,
        };

        assert_eq!(xdr_body.topics[0], xdr::ScVal::from_val(&env, &profile_topic));
        assert_eq!(xdr_body.topics[1], xdr::ScVal::from_val(&env, &account_val));
        assert_eq!(xdr_body.data, xdr::ScVal::from_val(&env, &profile_data));
    }

    #[test]
    fn test_status_change_emits_topic_and_data() {
        let env = Env::default();
        let contract_id = env.register(EventsCatalog, ());
        let client = EventsCatalogClient::new(&env, &contract_id);

        let account = Address::generate(&env);
        let name = String::from_str(&env, "bob");
        let role = Symbol::new(&env, "editor");

        client.set_profile(&account, &name, &role);
        client.set_status(&account, &false);

        let status_topic: soroban_sdk::Val = Symbol::new(&env, "profile_status").into_val(&env);
        let account_val: soroban_sdk::Val = account.clone().into_val(&env);
        let status_data: soroban_sdk::Val = false.into_val(&env);

        let events = env.events().all();
        let emitted = events.events();
        assert_eq!(emitted.len(), 1);

        let second = match &emitted[0].body {
            xdr::ContractEventBody::V0(body) => body,
        };

        assert_eq!(second.topics[0], xdr::ScVal::from_val(&env, &status_topic));
        assert_eq!(second.topics[1], xdr::ScVal::from_val(&env, &account_val));
        assert_eq!(second.data, xdr::ScVal::from_val(&env, &status_data));
    }
}
