//! Contract registry / name service.
//!
//! A minimal registry that maps stable byte names to contract addresses.
//! Only an authorized administrator can update entries. Clients can resolve
//! a name to a contract address using `get`.
//!
//! This pattern is useful alongside a contract factory: the factory
//! deploys new contract instances, and the registry provides a stable
//! name-to-address mapping so clients do not need to track raw contract
//! addresses.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Bytes, Env};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Entry(Bytes),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    NameTooLong = 4,
}

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    /// Initialize the registry with an administrator.
    ///
    /// The administrator is the only address authorized to update entries.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Map a name to a contract address.
    ///
    /// Only the administrator may call this function. The name must be 1–32
    /// bytes. Updating an existing name overwrites the previous address.
    pub fn set(env: Env, name: Bytes, address: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();

        if name.len() == 0 || name.len() > 32 {
            return Err(Error::NameTooLong);
        }

        env.storage()
            .instance()
            .set(&DataKey::Entry(name), &address);
        Ok(())
    }

    /// Resolve a name to its stored contract address.
    ///
    /// Returns `None` if the name has not been registered.
    pub fn get(env: Env, name: Bytes) -> Option<Address> {
        env.storage().instance().get(&DataKey::Entry(name))
    }

    /// Return the current administrator address.
    pub fn admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    struct Fixture {
        env: Env,
        admin: Address,
        user: Address,
        client: RegistryClient<'static>,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let contract_id = env.register(Registry, ());
        let client = RegistryClient::new(&env, &contract_id);

        Fixture {
            env,
            admin,
            user,
            client,
        }
    }

    fn name(env: &Env, s: &str) -> Bytes {
        Bytes::from_array(env, s.as_bytes())
    }

    fn initialize(fixture: &Fixture) {
        fixture.client.initialize(&fixture.admin);
    }

    #[test]
    fn initialize_sets_admin() {
        let fixture = setup();
        initialize(&fixture);
        assert_eq!(fixture.client.admin(), Some(fixture.admin.clone()));
    }

    #[test]
    fn initialize_rejects_reinitialization() {
        let fixture = setup();
        initialize(&fixture);
        assert_eq!(
            fixture.client.try_initialize(&fixture.admin),
            Err(Ok(Error::AlreadyInitialized))
        );
    }

    #[test]
    fn set_and_get_registered_name() {
        let fixture = setup();
        initialize(&fixture);

        let n = name(&fixture.env, "my-contract");
        let addr = Address::generate(&fixture.env);
        fixture.client.set(&n, &addr);

        assert_eq!(fixture.client.get(&n), Some(addr));
    }

    #[test]
    fn update_existing_name() {
        let fixture = setup();
        initialize(&fixture);

        let n = name(&fixture.env, "my-contract");
        let addr1 = Address::generate(&fixture.env);
        let addr2 = Address::generate(&fixture.env);

        fixture.client.set(&n, &addr1);
        assert_eq!(fixture.client.get(&n), Some(addr1.clone()));

        fixture.client.set(&n, &addr2);
        assert_eq!(fixture.client.get(&n), Some(addr2));
    }

    #[test]
    #[should_panic]
    fn unauthorized_set_fails() {
        let fixture = setup();
        initialize(&fixture);

        let n = name(&fixture.env, "my-contract");
        let addr = Address::generate(&fixture.env);

        // Without mock_all_auths, an unauthorized caller must fail.
        // The require_auth() call in set() will panic.
        fixture.client.set(&n, &addr);
    }

    #[test]
    fn multiple_names_map_to_different_contracts() {
        let fixture = setup();
        initialize(&fixture);

        let n1 = name(&fixture.env, "token");
        let n2 = name(&fixture.env, "vault");
        let n3 = name(&fixture.env, "oracle");

        let addr1 = Address::generate(&fixture.env);
        let addr2 = Address::generate(&fixture.env);
        let addr3 = Address::generate(&fixture.env);

        fixture.client.set(&n1, &addr1);
        fixture.client.set(&n2, &addr2);
        fixture.client.set(&n3, &addr3);

        assert_eq!(fixture.client.get(&n1), Some(addr1));
        assert_eq!(fixture.client.get(&n2), Some(addr2));
        assert_eq!(fixture.client.get(&n3), Some(addr3));
    }

    #[test]
    fn missing_name_returns_none() {
        let fixture = setup();
        initialize(&fixture);

        let n = name(&fixture.env, "nonexistent");
        assert_eq!(fixture.client.get(&n), None);
    }

    #[test]
    fn set_rejects_empty_name() {
        let fixture = setup();
        initialize(&fixture);

        let n = name(&fixture.env, "");
        let addr = Address::generate(&fixture.env);
        assert_eq!(fixture.client.try_set(&n, &addr), Err(Ok(Error::NameTooLong)));
    }

    #[test]
    fn set_rejects_name_over_32_bytes() {
        let fixture = setup();
        initialize(&fixture);

        let long_name = name(&fixture.env, "a]bcdefghijklmnopqrstuvwxyz1234567890");
        let addr = Address::generate(&fixture.env);
        assert_eq!(
            fixture.client.try_set(&long_name, &addr),
            Err(Ok(Error::NameTooLong))
        );
    }
}
