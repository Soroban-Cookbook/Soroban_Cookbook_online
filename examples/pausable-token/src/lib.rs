#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
};

// ─── Types & Roles ────────────────────────────────────────────────────────────

/// Roles recognized by the contract, demonstrating clear separation of duties.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    /// Regular user/token holder.
    User,
    /// Operational role: can mint tokens, but CANNOT pause or unpause.
    Manager,
    /// Incident-response role: can pause and unpause, but CANNOT mint tokens.
    Pauser,
    /// Super-administrator: can grant/revoke roles, pause/unpause, and mint.
    Admin,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Role(Address),
    Paused,
    Balance(Address),
    Allowance(Address, Address), // (owner, spender)
    TotalSupply,
    Name,
    Symbol,
    Decimals,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    ContractPaused = 2,
    InsufficientBalance = 3,
    InvalidAmount = 4,
    SelfTransfer = 5,
    InsufficientAllowance = 6,
}

// ─── Guard Functions & Modifiers ──────────────────────────────────────────────

/// Guard returning `Err(Error::ContractPaused)` when the circuit breaker is tripped.
/// Placed at the top of all state-mutating operational functions.
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

/// Check if `user` has been assigned the given `role`.
pub fn has_role(env: &Env, user: &Address, role: Role) -> bool {
    env.storage()
        .persistent()
        .get::<DataKey, Role>(&DataKey::Role(user.clone()))
        .map(|stored| stored == role)
        .unwrap_or(false)
}

/// Require that `user` holds `role`, or return `Err(Error::Unauthorized)`.
pub fn require_role(env: &Env, user: &Address, role: Role) -> Result<(), Error> {
    if has_role(env, user, role) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

/// Guard permitting either `Admin` or `Pauser` role to trigger emergency stops.
/// Notice that `Manager` is explicitly NOT authorized to pause/unpause.
pub fn require_admin_or_pauser(env: &Env, user: &Address) -> Result<(), Error> {
    if has_role(env, user, Role::Admin) || has_role(env, user, Role::Pauser) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

/// Guard permitting either `Admin` or `Manager` role to mint new tokens.
/// Notice that `Pauser` is explicitly NOT authorized to mint tokens.
pub fn require_admin_or_manager(env: &Env, user: &Address) -> Result<(), Error> {
    if has_role(env, user, Role::Admin) || has_role(env, user, Role::Manager) {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}

// ─── Contract Implementation ──────────────────────────────────────────────────

#[contract]
pub struct PausableToken;

#[contractimpl]
impl PausableToken {
    /// Deploy-time setup: stores token metadata, assigns initial Admin role,
    /// and initializes the emergency stop to unpaused.
    pub fn __constructor(
        env: Env,
        admin: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        env.storage()
            .persistent()
            .set(&DataKey::Role(admin), &Role::Admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().persistent().set(&DataKey::Name, &name);
        env.storage().persistent().set(&DataKey::Symbol, &symbol);
        env.storage().persistent().set(&DataKey::Decimals, &decimals);
        env.storage().persistent().set(&DataKey::TotalSupply, &0i128);
    }

    // ─── Access Control (ACL) ─────────────────────────────────────────────────

    /// Assign `role` to `user`. Only an Admin may grant roles.
    pub fn grant_role(env: Env, granter: Address, user: Address, role: Role) -> Result<(), Error> {
        granter.require_auth();
        require_role(&env, &granter, Role::Admin)?;

        env.storage().persistent().set(&DataKey::Role(user.clone()), &role);
        env.events().publish((symbol_short!("grant"), granter, user), role);
        Ok(())
    }

    /// Revoke any assigned role from `user`. Only an Admin may revoke roles.
    pub fn revoke_role(env: Env, granter: Address, user: Address) -> Result<(), Error> {
        granter.require_auth();
        require_role(&env, &granter, Role::Admin)?;

        env.storage().persistent().remove(&DataKey::Role(user.clone()));
        env.events().publish((symbol_short!("revoke"), granter, user), ());
        Ok(())
    }

    /// Return the role assigned to `user`, if any.
    pub fn get_role(env: Env, user: Address) -> Option<Role> {
        env.storage().persistent().get(&DataKey::Role(user))
    }

    // ─── Emergency Stop (Circuit Breaker) ─────────────────────────────────────

    /// Trip the circuit breaker, halting state changes.
    /// Restricted to `Admin` and `Pauser` roles.
    pub fn pause(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_admin_or_pauser(&env, &caller)?;

        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((symbol_short!("pause"), caller), ());
        Ok(())
    }

    /// Reset the circuit breaker, restoring normal operation.
    /// Restricted to `Admin` and `Pauser` roles.
    pub fn unpause(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_admin_or_pauser(&env, &caller)?;

        env.storage().instance().set(&DataKey::Paused, &false);
        env.events().publish((symbol_short!("unpause"), caller), ());
        Ok(())
    }

    /// Whether the circuit breaker is currently active.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    // ─── Token Operations (Guarded by Circuit Breaker) ─────────────────────────

    /// Mint new tokens to `to`.
    /// Restricted to `Manager` and `Admin` roles, and blocked when paused.
    pub fn mint(env: Env, minter: Address, to: Address, amount: i128) -> Result<(), Error> {
        fail_if_paused(&env)?;
        minter.require_auth();
        require_admin_or_manager(&env, &minter)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        let supply_key = DataKey::TotalSupply;
        let supply: i128 = env.storage().persistent().get(&supply_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));
        env.storage()
            .persistent()
            .set(&supply_key, &(supply + amount));

        env.events().publish((symbol_short!("mint"), minter, to), amount);
        Ok(())
    }

    /// Transfer tokens from caller to recipient. Blocked when paused.
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        fail_if_paused(&env)?;
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if from == to {
            return Err(Error::SelfTransfer);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));

        env.events().publish((symbol_short!("transfer"), from, to), amount);
        Ok(())
    }

    /// Transfer tokens on behalf of `from` using an allowance. Blocked when paused.
    pub fn transfer_from(
        env: Env,
        spender: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        fail_if_paused(&env)?;
        spender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if from == to {
            return Err(Error::SelfTransfer);
        }

        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let current_allowance: i128 = env.storage().persistent().get(&allowance_key).unwrap_or(0);

        if current_allowance < amount {
            return Err(Error::InsufficientAllowance);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_key = DataKey::Balance(to.clone());
        let to_balance: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&allowance_key, &(current_allowance - amount));
        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&to_key, &(to_balance + amount));

        env.events().publish((symbol_short!("transfer"), from, to), amount);
        Ok(())
    }

    /// Burn tokens from caller's balance. Blocked when paused.
    pub fn burn(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        fail_if_paused(&env)?;
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let from_key = DataKey::Balance(from.clone());
        let from_balance: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let supply_key = DataKey::TotalSupply;
        let supply: i128 = env.storage().persistent().get(&supply_key).unwrap_or(0);

        env.storage()
            .persistent()
            .set(&from_key, &(from_balance - amount));
        env.storage()
            .persistent()
            .set(&supply_key, &(supply - amount));

        env.events().publish((symbol_short!("burn"), from), amount);
        Ok(())
    }

    /// Approve `spender` to spend `amount` from `owner`. Blocked when paused.
    pub fn approve(
        env: Env,
        owner: Address,
        spender: Address,
        amount: i128,
    ) -> Result<(), Error> {
        fail_if_paused(&env)?;
        owner.require_auth();

        if amount < 0 {
            return Err(Error::InvalidAmount);
        }

        let allowance_key = DataKey::Allowance(owner.clone(), spender.clone());
        env.storage().persistent().set(&allowance_key, &amount);

        env.events().publish((symbol_short!("approve"), owner, spender), amount);
        Ok(())
    }

    // ─── Query Functions (Always accessible, even when paused) ────────────────

    /// Return balance of `of`.
    pub fn balance(env: Env, of: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(of))
            .unwrap_or(0)
    }

    /// Return allowance granted by `owner` to `spender`.
    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(owner, spender))
            .unwrap_or(0)
    }

    /// Return total token supply.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Return token name.
    pub fn name(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Name)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    /// Return token symbol.
    pub fn symbol(env: Env) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    /// Return token decimals.
    pub fn decimals(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Decimals)
            .unwrap_or(0)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation};
    use soroban_sdk::{IntoVal, String};

    struct TestFixture {
        env: Env,
        admin: Address,
        pauser: Address,
        manager: Address,
        user1: Address,
        user2: Address,
        client: PausableTokenClient<'static>,
    }

    fn setup() -> TestFixture {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let pauser = Address::generate(&env);
        let manager = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        let contract_id = env.register(
            PausableToken,
            (
                &admin,
                String::from_str(&env, "Pausable USD"),
                String::from_str(&env, "USD"),
                7u32,
            ),
        );
        let client = PausableTokenClient::new(&env, &contract_id);

        // Grant Pauser and Manager roles
        client.grant_role(&admin, &pauser, &Role::Pauser);
        client.grant_role(&admin, &manager, &Role::Manager);

        TestFixture {
            env,
            admin,
            pauser,
            manager,
            user1,
            user2,
            client,
        }
    }

    #[test]
    fn test_constructor_initialization() {
        let f = setup();
        assert_eq!(f.client.get_role(&f.admin), Some(Role::Admin));
        assert_eq!(f.client.get_role(&f.pauser), Some(Role::Pauser));
        assert_eq!(f.client.get_role(&f.manager), Some(Role::Manager));
        assert_eq!(f.client.get_role(&f.user1), None);
        assert!(!f.client.is_paused());
        assert_eq!(f.client.total_supply(), 0);
        assert_eq!(f.client.name(), String::from_str(&f.env, "Pausable USD"));
        assert_eq!(f.client.symbol(), String::from_str(&f.env, "USD"));
        assert_eq!(f.client.decimals(), 7);
    }

    // ─── Role Separation & ACL Tests ──────────────────────────────────────────

    #[test]
    fn test_manager_can_mint_when_unpaused() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);
        assert_eq!(f.client.balance(&f.user1), 1000);
        assert_eq!(f.client.total_supply(), 1000);
    }

    #[test]
    fn test_manager_cannot_pause_or_unpause() {
        let f = setup();
        // Manager attempting to pause must be denied with Unauthorized
        let pause_result = f.client.try_pause(&f.manager);
        assert_eq!(pause_result, Err(Ok(Error::Unauthorized)));
        assert!(!f.client.is_paused());

        // Even if paused by pauser, manager cannot unpause
        f.client.pause(&f.pauser);
        assert!(f.client.is_paused());

        let unpause_result = f.client.try_unpause(&f.manager);
        assert_eq!(unpause_result, Err(Ok(Error::Unauthorized)));
        assert!(f.client.is_paused());
    }

    #[test]
    fn test_pauser_cannot_mint_tokens() {
        let f = setup();
        // Pauser attempting to mint must be denied with Unauthorized
        let result = f.client.try_mint(&f.pauser, &f.user1, &500);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
        assert_eq!(f.client.balance(&f.user1), 0);
    }

    #[test]
    fn test_pauser_cannot_grant_or_revoke_roles() {
        let f = setup();
        let rogue = Address::generate(&f.env);

        let grant_result = f.client.try_grant_role(&f.pauser, &rogue, &Role::Admin);
        assert_eq!(grant_result, Err(Ok(Error::Unauthorized)));

        let revoke_result = f.client.try_revoke_role(&f.pauser, &f.manager);
        assert_eq!(revoke_result, Err(Ok(Error::Unauthorized)));
        assert_eq!(f.client.get_role(&f.manager), Some(Role::Manager));
    }

    #[test]
    fn test_user_cannot_pause_or_mint_or_grant_roles() {
        let f = setup();
        assert_eq!(f.client.try_pause(&f.user1), Err(Ok(Error::Unauthorized)));
        assert_eq!(
            f.client.try_mint(&f.user1, &f.user2, &100),
            Err(Ok(Error::Unauthorized))
        );
        assert_eq!(
            f.client.try_grant_role(&f.user1, &f.user2, &Role::Pauser),
            Err(Ok(Error::Unauthorized))
        );
    }

    #[test]
    fn test_admin_can_perform_all_administrative_actions() {
        let f = setup();
        // Admin can mint
        f.client.mint(&f.admin, &f.user1, &500);
        assert_eq!(f.client.balance(&f.user1), 500);

        // Admin can pause and unpause
        f.client.pause(&f.admin);
        assert!(f.client.is_paused());
        f.client.unpause(&f.admin);
        assert!(!f.client.is_paused());

        // Admin can revoke and grant roles
        f.client.revoke_role(&f.admin, &f.manager);
        assert_eq!(f.client.get_role(&f.manager), None);

        f.client.grant_role(&f.admin, &f.manager, &Role::Manager);
        assert_eq!(f.client.get_role(&f.manager), Some(Role::Manager));
    }

    // ─── Pause & Transfer Tests ───────────────────────────────────────────────

    #[test]
    fn test_pause_blocks_transfer() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);

        // Pauser trips the circuit breaker
        f.client.pause(&f.pauser);
        assert!(f.client.is_paused());

        // Transfer must fail while paused
        let result = f.client.try_transfer(&f.user1, &f.user2, &300);
        assert_eq!(result, Err(Ok(Error::ContractPaused)));

        // Balances must remain unchanged
        assert_eq!(f.client.balance(&f.user1), 1000);
        assert_eq!(f.client.balance(&f.user2), 0);
    }

    #[test]
    fn test_pause_blocks_transfer_from() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);
        f.client.approve(&f.user1, &f.user2, &500);

        // Pause contract
        f.client.pause(&f.pauser);

        // transfer_from must fail while paused
        let result = f.client.try_transfer_from(&f.user2, &f.user1, &f.admin, &200);
        assert_eq!(result, Err(Ok(Error::ContractPaused)));

        // State remains intact
        assert_eq!(f.client.balance(&f.user1), 1000);
        assert_eq!(f.client.allowance(&f.user1, &f.user2), 500);
    }

    #[test]
    fn test_pause_blocks_mint() {
        let f = setup();
        f.client.pause(&f.pauser);

        // Minting by Manager blocked while paused
        let result = f.client.try_mint(&f.manager, &f.user1, &1000);
        assert_eq!(result, Err(Ok(Error::ContractPaused)));
        assert_eq!(f.client.balance(&f.user1), 0);
        assert_eq!(f.client.total_supply(), 0);
    }

    #[test]
    fn test_pause_blocks_burn() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);

        f.client.pause(&f.pauser);

        // Burning blocked while paused
        let result = f.client.try_burn(&f.user1, &400);
        assert_eq!(result, Err(Ok(Error::ContractPaused)));
        assert_eq!(f.client.balance(&f.user1), 1000);
        assert_eq!(f.client.total_supply(), 1000);
    }

    #[test]
    fn test_pause_blocks_approve() {
        let f = setup();
        f.client.pause(&f.pauser);

        // Approve blocked while paused
        let result = f.client.try_approve(&f.user1, &f.user2, &500);
        assert_eq!(result, Err(Ok(Error::ContractPaused)));
        assert_eq!(f.client.allowance(&f.user1, &f.user2), 0);
    }

    #[test]
    fn test_queries_remain_functional_while_paused() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);
        f.client.approve(&f.user1, &f.user2, &400);

        f.client.pause(&f.pauser);

        // Read-only queries must succeed even when paused
        assert!(f.client.is_paused());
        assert_eq!(f.client.balance(&f.user1), 1000);
        assert_eq!(f.client.balance(&f.user2), 0);
        assert_eq!(f.client.allowance(&f.user1, &f.user2), 400);
        assert_eq!(f.client.total_supply(), 1000);
        assert_eq!(f.client.get_role(&f.pauser), Some(Role::Pauser));
        assert_eq!(f.client.name(), String::from_str(&f.env, "Pausable USD"));
        assert_eq!(f.client.symbol(), String::from_str(&f.env, "USD"));
        assert_eq!(f.client.decimals(), 7);
    }

    #[test]
    fn test_unpause_restores_all_operations() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &1000);

        // Pause and verify blocked
        f.client.pause(&f.pauser);
        assert_eq!(
            f.client.try_transfer(&f.user1, &f.user2, &300),
            Err(Ok(Error::ContractPaused))
        );

        // Unpause restored by pauser
        f.client.unpause(&f.pauser);
        assert!(!f.client.is_paused());

        // Operations succeed now
        f.client.transfer(&f.user1, &f.user2, &300);
        assert_eq!(f.client.balance(&f.user1), 700);
        assert_eq!(f.client.balance(&f.user2), 300);

        f.client.approve(&f.user1, &f.user2, &200);
        f.client.transfer_from(&f.user2, &f.user1, &f.admin, &150);
        assert_eq!(f.client.balance(&f.user1), 550);
        assert_eq!(f.client.balance(&f.admin), 150);
        assert_eq!(f.client.allowance(&f.user1, &f.user2), 50);

        f.client.burn(&f.user2, &100);
        assert_eq!(f.client.balance(&f.user2), 200);
        assert_eq!(f.client.total_supply(), 900);
    }

    // ─── Operational & Input Validation Tests ─────────────────────────────────

    #[test]
    fn test_transfer_validation_errors() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &100);

        // Insufficient balance
        let result = f.client.try_transfer(&f.user1, &f.user2, &200);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));

        // Invalid zero/negative amount
        assert_eq!(
            f.client.try_transfer(&f.user1, &f.user2, &0),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            f.client.try_transfer(&f.user1, &f.user2, &-50),
            Err(Ok(Error::InvalidAmount))
        );

        // Self transfer
        assert_eq!(
            f.client.try_transfer(&f.user1, &f.user1, &50),
            Err(Ok(Error::SelfTransfer))
        );
    }

    #[test]
    fn test_allowance_and_transfer_from_validation_errors() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &100);
        f.client.approve(&f.user1, &f.user2, &50);

        // Exceeds allowance
        let result = f.client.try_transfer_from(&f.user2, &f.user1, &f.admin, &80);
        assert_eq!(result, Err(Ok(Error::InsufficientAllowance)));

        // Exceeds balance with sufficient allowance
        f.client.approve(&f.user1, &f.user2, &500);
        let result = f.client.try_transfer_from(&f.user2, &f.user1, &f.admin, &200);
        assert_eq!(result, Err(Ok(Error::InsufficientBalance)));

        // Negative approval
        assert_eq!(
            f.client.try_approve(&f.user1, &f.user2, &-10),
            Err(Ok(Error::InvalidAmount))
        );
    }

    #[test]
    fn test_burn_validation_errors() {
        let f = setup();
        f.client.mint(&f.manager, &f.user1, &100);

        // Insufficient balance
        assert_eq!(
            f.client.try_burn(&f.user1, &150),
            Err(Ok(Error::InsufficientBalance))
        );

        // Invalid amount
        assert_eq!(
            f.client.try_burn(&f.user1, &0),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            f.client.try_burn(&f.user1, &-10),
            Err(Ok(Error::InvalidAmount))
        );
    }

    #[test]
    fn test_pause_auth_in_env() {
        let f = setup();
        f.client.pause(&f.pauser);

        assert_eq!(
            f.env.auths(),
            std::vec![(
                f.pauser.clone(),
                AuthorizedInvocation {
                    function: AuthorizedFunction::Contract((
                        f.client.address.clone(),
                        symbol_short!("pause"),
                        (f.pauser.clone(),).into_val(&f.env),
                    )),
                    sub_invocations: std::vec![],
                }
            )]
        );
    }
}
