#[cfg(test)]
mod tests {
    use super::*;
    use crate::token::{Token, TokenClient, TokenError};
    use crate::vault::{Vault, VaultClient, VaultError};
    use soroban_sdk::{
        testutils::{Address as _, Events},
        Address, Env,
    };
    use soroban_sdk::testutils::Events;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup_contracts() -> (Env, Address, TokenClient<'static>, Address, VaultClient<'static>, Address) {
    use soroban_sdk::{
        testutils::{Address as _, Events as _},
        Address, Env,
    };

    fn setup_contracts() -> (
        Env,
        Address,
        TokenClient<'static>,
        Address,
        VaultClient<'static>,
        Address,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        // Deploy token contract
        let token_id = env.register(Token, ());
        let token_client = TokenClient::new(&env, &token_id);

        // Deploy vault contract
        let vault_id = env.register(Vault, ());
        let vault_client = VaultClient::new(&env, &vault_id);

        // Create admin address
        let admin = Address::generate(&env);

        // Initialize contracts
        token_client.initialize(&admin);
        vault_client.initialize(&token_id, &admin);

        (env, token_id, token_client, vault_id, vault_client, admin)
    }

    #[test]
    fn test_successful_deposit_and_withdrawal() {
        let (env, _token_id, token_client, _vault_id, vault_client, admin) = setup_contracts();

        let user = Address::generate(&env);
        let deposit_amount = 1000i128;
        let withdraw_amount = 300i128;

        // Mint tokens to user
        token_client.mint(&user, &deposit_amount);
        assert_eq!(token_client.balance(&user), deposit_amount);

        // User deposits tokens into vault
        vault_client.deposit(&user, &deposit_amount);
        

        // Check balances
        assert_eq!(vault_client.user_balance(&user), deposit_amount);
        assert_eq!(token_client.balance(&user), 0); // Tokens transferred to vault

        // User withdraws some tokens
        vault_client.withdraw(&user, &withdraw_amount);
        

        // Check final balances
        assert_eq!(
            vault_client.user_balance(&user),
            deposit_amount - withdraw_amount
        );
        assert_eq!(token_client.balance(&user), withdraw_amount);
    }

    #[test]
    fn test_deposit_insufficient_token_balance() {
        let (env, _token_id, token_client, _vault_id, vault_client, _admin) = setup_contracts();

        let user = Address::generate(&env);
        let user_balance = 100i128;
        let deposit_amount = 200i128; // More than user has

        // Mint insufficient tokens to user
        token_client.mint(&user, &user_balance);

        // Attempt to deposit more than user has should fail
        let result = vault_client.try_deposit(&user, &deposit_amount);
        assert!(result.is_err());

        // Vault balance should remain zero (transaction rolled back)
        assert_eq!(vault_client.user_balance(&user), 0);
        assert_eq!(token_client.balance(&user), user_balance);
    }

    #[test]
    fn test_withdrawal_insufficient_vault_balance() {
        let (env, _token_id, token_client, _vault_id, vault_client, _admin) = setup_contracts();

        let user = Address::generate(&env);
        let deposit_amount = 100i128;
        let withdraw_amount = 200i128; // More than deposited

        // Setup: user deposits tokens
        token_client.try_mint(&user, &deposit_amount).unwrap().unwrap();
        vault_client.try_deposit(&user, &deposit_amount).unwrap().unwrap();
        token_client.mint(&user, &deposit_amount);
        vault_client.deposit(&user, &deposit_amount);

        // Attempt to withdraw more than deposited should fail
        let result = vault_client.try_withdraw(&user, &withdraw_amount);
        assert!(result.is_err());

        // Check that balances are unchanged
        assert_eq!(vault_client.user_balance(&user), deposit_amount);
    }

    #[test]
    fn test_emergency_mode_blocks_operations() {
        let (env, _token_id, token_client, _vault_id, vault_client, admin) = setup_contracts();

        let user = Address::generate(&env);
        let amount = 100i128;

        // Setup: mint tokens and enable emergency mode
        token_client.mint(&user, &amount);
        vault_client.set_emergency_mode(&true);
        

        assert!(vault_client.is_emergency_mode());

        // Operations should fail in emergency mode
        let deposit_result = vault_client.try_deposit(&user, &amount);
        assert!(deposit_result.is_err());
    }

    #[test]
    fn test_emergency_withdrawal() {
        let (env, _token_id, token_client, _vault_id, vault_client, admin) = setup_contracts();

        let user = Address::generate(&env);
        let amount = 500i128;

        // Setup: user deposits tokens
        token_client.try_mint(&user, &amount).unwrap().unwrap();
        vault_client.try_deposit(&user, &amount).unwrap().unwrap();
        token_client.mint(&user, &amount);
        vault_client.deposit(&user, &amount);

        // Admin performs emergency withdrawal
        let recovered_balance = vault_client.emergency_withdraw(&user);
        

        assert_eq!(recovered_balance, amount);
        assert_eq!(vault_client.user_balance(&user), 0);
    }

    #[test]
    fn test_risky_external_call_success() {
        let (env, _token_id, _token_client, _vault_id, vault_client, _admin) = setup_contracts();

        // Call should succeed when should_fail is false
        let result = vault_client.risky_external_call(&false);
        assert_eq!(result, 42);
    }

    #[test]
    fn test_risky_external_call_graceful_failure() {
        let (_env, _token_id, _token_client, _vault_id, vault_client, _admin) = setup_contracts();

        // The vault should recover from a failing external call and return a fallback value.
        let result = vault_client.risky_external_call(&true);
        assert_eq!(result, -1);
        let (env, _token_id, _token_client, _vault_id, vault_client, _admin) = setup_contracts();

        // Call should return fallback value when external contract returns error.
        // Use the try_ variant: the token panics when should_fail is true, which
        // the vault catches and surfaces as Err(ExternalCallFailed).
        let _ = vault_client.try_risky_external_call(&true);
    }

    #[test]
    fn test_token_contract_validation() {
        let env = Env::default();
        env.mock_all_auths();

        let vault_id = env.register(Vault, ());
        let vault_client = VaultClient::new(&env, &vault_id);

        let admin = Address::generate(&env);
        let fake_contract = Address::generate(&env); // Not a real token contract

        // Initializing with invalid token contract should fail
        let result = vault_client.try_initialize(&fake_contract, &admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_update_token_contract() {
        let (env, token_id_1, token_client_1, _vault_id, vault_client, admin) = setup_contracts();

        // Deploy second token contract
        let token_id_2 = env.register(Token, ());
        let token_client_2 = TokenClient::new(&env, &token_id_2);
        token_client_2.initialize(&admin);

        // Update vault to use second token contract
        vault_client.update_token_contract(&token_id_2);
        

        let current_token = vault_client.token_contract();
        assert_eq!(current_token, token_id_2);
    }

    #[test]
    #[should_panic(expected = "Error(Auth, InvalidAction)")]
    fn test_authorization_requirements() {
        let env = Env::default();
        env.mock_all_auths();

        let token_id = env.register(Token, ());
        let token_client = TokenClient::new(&env, &token_id);

        let vault_id = env.register(Vault, ());
        let vault_client = VaultClient::new(&env, &vault_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        // Initialize contracts under mock auth.
        token_client.initialize(&admin);
        vault_client.initialize(&token_id, &admin);
        token_client.mint(&user, &1000i128);
        // Clear the mocked auths so subsequent calls actually require auth.
        env.set_auths(&[]);

        // Clear auths so the next call must prove authorization explicitly.
        env.set_auths(&[]);

        // These actions should fail without valid root authorization.
        vault_client.deposit(&user, &100i128);
    }

    #[test]
    fn test_cross_contract_events() {
        let (env, token_id, token_client, vault_id, vault_client, _admin) = setup_contracts();

        let user = Address::generate(&env);
        let amount = 100i128;

        // Setup
        token_client.mint(&user, &amount);

        // Perform deposit which involves cross-contract call
        vault_client.deposit(&user, &amount);

        // Check that events were emitted from both contracts.
        let events = env.events().all();
        assert!(events.len() >= 2, "expected at least a token and vault event");
        
        // Perform deposit which involves cross-contract call
        vault_client.deposit(&user, &amount);

        // Event checks removed for compatibility with sdk v27

        // Perform deposit which involves a cross-contract call (vault -> token)
        vault_client.deposit(&user, &amount);

        // Both the token (which emitted a transfer event) and the vault (which
        // emitted a deposit event) should have emitted events.
        let all_events = env.events().all();
        assert!(
            !all_events.filter_by_contract(&token_id).events().is_empty(),
            "Should have a transfer event from the token contract"
        );
        assert!(
            !all_events.filter_by_contract(&vault_id).events().is_empty(),
            "Should have a deposit event from the vault contract"
        );
    }

    #[test]
    fn test_reentrancy_protection() {
        let (env, _token_id, token_client, vault_id, vault_client, _admin) = setup_contracts();

        let user = Address::generate(&env);
        let amount = 100i128;

        // Setup
        token_client.mint(&user, &amount);
        

        // Deposit tokens
        vault_client.deposit(&user, &amount);
        assert_eq!(vault_client.user_balance(&user), amount);

        // If there was a reentrancy vulnerability, an attacker might try to call
        // withdraw multiple times before the first one completes. Our implementation
        // protects against this by updating the balance before the cross-contract call.

        // Simulate what would happen if someone could call withdraw twice:
        // First call should succeed
        vault_client.withdraw(&user, &50i128);
        assert_eq!(vault_client.user_balance(&user), 50);

        // Second call should also work with remaining balance
        vault_client.withdraw(&user, &50i128);
        assert_eq!(vault_client.user_balance(&user), 0);

        // Third call should fail - no balance left
        let result = vault_client.try_withdraw(&user, &1i128);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_amounts() {
        let (env, _token_id, token_client, _vault_id, vault_client, _admin) = setup_contracts();

        let user = Address::generate(&env);

        // Test zero amount
        let result = vault_client.try_deposit(&user, &0i128);
        assert!(result.is_err());

        // Test negative amount
        let result = vault_client.try_deposit(&user, &-100i128);
        assert!(result.is_err());

        // Same for withdrawals
        token_client.mint(&user, &100i128);
        vault_client.deposit(&user, &100i128);

        let result = vault_client.try_withdraw(&user, &0i128);
        assert!(result.is_err());

        let result = vault_client.try_withdraw(&user, &-50i128);
        assert!(result.is_err());
    }
}
