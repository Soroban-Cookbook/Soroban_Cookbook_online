#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

// ─── Types ────────────────────────────────────────────────────────────────────

/// Roles recognized by this contract, from least to most privileged.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    User,
    Manager,
    Admin,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Role(Address),
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
}

// ─── Role enforcement (reusable check / "modifier") ───────────────────────────

/// Returns `true` if `user` has been assigned exactly `role`.
///
/// Role assignments live in persistent storage and are written only by
/// `grant_role`/`revoke_role`, which are themselves gated to existing Admins.
/// Callers cannot assign themselves a role, which is what makes the mapping
/// effectively immutable from any non-privileged caller's point of view.
pub fn has_role(env: &Env, user: &Address, role: Role) -> bool {
    env.storage()
        .persistent()
        .get::<DataKey, Role>(&DataKey::Role(user.clone()))
        .map(|stored| stored == role)
        .unwrap_or(false)
}

/// Guard to drop into any contract method that should be restricted to a
/// specific role. Returns `Err(Error::Unauthorized)` instead of panicking so
/// callers receive a structured, catchable denial.
pub fn require_role(env: &Env, user: &Address, role: Role) -> Result<(), Error> {
    if has_role(env, user, role) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {
    /// Deploy-time setup: the deploying address becomes the sole Admin.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage()
            .persistent()
            .set(&DataKey::Role(admin), &Role::Admin);
    }

    /// Assign `role` to `user`. Only an existing Admin may grant roles.
    pub fn grant_role(env: Env, granter: Address, user: Address, role: Role) -> Result<(), Error> {
        granter.require_auth();
        require_role(&env, &granter, Role::Admin)?;
        env.storage().persistent().set(&DataKey::Role(user), &role);
        Ok(())
    }

    /// Remove any role held by `user`. Only an existing Admin may revoke roles.
    pub fn revoke_role(env: Env, granter: Address, user: Address) -> Result<(), Error> {
        granter.require_auth();
        require_role(&env, &granter, Role::Admin)?;
        env.storage().persistent().remove(&DataKey::Role(user));
        Ok(())
    }

    /// Return the role assigned to `user`, if any.
    pub fn get_role(env: Env, user: Address) -> Option<Role> {
        env.storage().persistent().get(&DataKey::Role(user))
    }

    /// Example operation restricted to Admins only.
    pub fn admin_only_action(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_role(&env, &caller, Role::Admin)
    }

    /// Example operation restricted to Managers only.
    pub fn manager_only_action(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_role(&env, &caller, Role::Manager)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, AccessControlClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(AccessControl, (&admin,));
        let client = AccessControlClient::new(&env, &contract_id);
        (env, admin, client)
    }

    #[test]
    fn test_constructor_grants_admin_role() {
        let (_, admin, client) = setup();
        assert_eq!(client.get_role(&admin), Some(Role::Admin));
    }

    #[test]
    fn test_admin_can_call_admin_only_action() {
        let (_, admin, client) = setup();
        // Should not panic and should not return an error.
        client.admin_only_action(&admin);
    }

    #[test]
    fn test_non_admin_is_denied_admin_only_action() {
        let (env, _, client) = setup();
        let outsider = Address::generate(&env);

        let result = client.try_admin_only_action(&outsider);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_admin_can_grant_manager_role() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);

        client.grant_role(&admin, &alice, &Role::Manager);

        assert_eq!(client.get_role(&alice), Some(Role::Manager));
        // Granted role now passes the manager-restricted check.
        client.manager_only_action(&alice);
    }

    #[test]
    fn test_non_admin_cannot_grant_roles() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let result = client.try_grant_role(&alice, &bob, &Role::Manager);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
        assert_eq!(client.get_role(&bob), None);
    }

    #[test]
    fn test_manager_is_denied_admin_only_action() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        client.grant_role(&admin, &alice, &Role::Manager);

        let result = client.try_admin_only_action(&alice);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_revoke_role_removes_access() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        client.grant_role(&admin, &alice, &Role::Manager);
        assert_eq!(client.get_role(&alice), Some(Role::Manager));

        client.revoke_role(&admin, &alice);

        assert_eq!(client.get_role(&alice), None);
        let result = client.try_manager_only_action(&alice);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_get_role_returns_none_for_unknown_address() {
        let (env, _, client) = setup();
        let stranger = Address::generate(&env);
        assert_eq!(client.get_role(&stranger), None);
    }

    #[test]
    fn test_has_role_helper_directly() {
        let (env, admin, client) = setup();
        let alice = Address::generate(&env);
        client.grant_role(&admin, &alice, &Role::User);

        let contract_id = client.address.clone();
        env.as_contract(&contract_id, || {
            assert!(has_role(&env, &admin, Role::Admin));
            assert!(has_role(&env, &alice, Role::User));
            assert!(!has_role(&env, &alice, Role::Admin));
        });
    }
}
