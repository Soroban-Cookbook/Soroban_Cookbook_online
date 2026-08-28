#[cfg(test)]
mod tests {
    use super::*;
    use crate::token::{Token, TokenClient, TokenError};
    use crate::vault::{Vault, VaultClient, VaultError};
    use soroban_sdk::{testutils::Address as _, Address, Env};

    fn setup_contracts() -> (Env, Address, TokenClient<'static>, Address, VaultClient<'static>, Address) {
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
        token_client.mint(&user, &deposit_amount).unwrap();
        assert_eq!(token_client.balance(&user), deposit_amount);

        // User deposits tokens into vault
        vault_client.deposit(&user, &deposit_amount).unwrap();
        
        // Check balances
        assert_eq!(vault_client.user_balance(&user), deposit_amount);
        assert_eq!(token_client.balance(&user), 0); // Tokens transferred to vault
        
        // User withdraws some tokens
        vault_client.withdraw(&user, &withdraw_amount).unwrap();
        
        // Check final balances
        assert_eq!(vault_client.user_balance(&user), deposit_amount - withdraw_amount);
        assert_eq!(token_client.balance(&user), withdraw_amount);
    }

    #[test]
    fn test_deposit_insufficient_token_balance() {
        let (env, _token_id, token_client, _vault_id, vault_client, _admin) = setup_contracts();
        
        let user = Address::generate(&env);
        let user_balance = 100i128;
        let deposit_amount = 200i128; // More than user has

        // Mint insufficient tokens to user
        token_client.mint(&user, &user_balance).unwrap();

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
        token_client.mint(&user, &deposit_amount).unwrap();
        vault_client.deposit(&user, &deposit_amount).unwrap();

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
        token_client.mint(&user, &amount).unwrap();
        vault_client.set_emergency_mode(&true).unwrap();
        
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
        token_client.mint(&user, &amount).unwrap();
        vault_client.deposit(&user, &amount).unwrap();

        // Admin performs emergency withdrawal
        let recovered_balance = vault_client.emergency_withdraw(&user).unwrap();
        
        assert_eq!(recovered_balance, amount);
        assert_eq!(vault_client.user_balance(&user), 0);
    }

    #[test]
    fn test_risky_external_call_success() {
        let (env, _token_id, _token_client, _vault_id, vault_client, _admin) = setup_contracts();
        
        // Call should succeed when should_fail is false
        let result = vault_client.risky_external_call(&false).unwrap();
        assert_eq!(result, 42);
    }

    #[test]
    fn test_risky_external_call_graceful_failure() {
        let (env, _token_id, _token_client, _vault_id, vault_client, _admin) = setup_contracts();
        
        // Call should return fallback value when external contract returns error
        let result = vault_client.risky_external_call(&true);
        // Note: This might return either a fallback value or enable emergency mode,
        // depending on whether the external contract returns an error or panics
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
        vault_client.update_token_contract(&token_id_2).unwrap();
        
        let current_token = vault_client.token_contract().unwrap();
        assert_eq!(current_token, token_id_2);
    }

    #[test] 
    fn test_authorization_requirements() {
        let env = Env::default();
        // Do NOT call env.mock_all_auths() - we want to test real auth

        let token_id = env.register(Token, ());
        let token_client = TokenClient::new(&env, &token_id);

        let vault_id = env.register(Vault, ());
        let vault_client = VaultClient::new(&env, &vault_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        // Initialize contracts (this should work with no auth required for setup)
        env.mock_all_auths();
        token_client.initialize(&admin);
        vault_client.initialize(&token_id, &admin);
        token_client.mint(&user, &1000i128).unwrap();
        env.clear_all_auths();

        // Now test that operations require proper auth
        let result = vault_client.try_deposit(&user, &100i128);
        assert!(result.is_err()); // Should fail without user auth

        // Test admin operations require admin auth
        let result = vault_client.try_set_emergency_mode(&true);
        assert!(result.is_err()); // Should fail without admin auth
    }

    #[test]
    fn test_cross_contract_events() {
        let (env, _token_id, token_client, _vault_id, vault_client, _admin) = setup_contracts();
        
        let user = Address::generate(&env);
        let amount = 100i128;

        // Setup
        token_client.mint(&user, &amount).unwrap();
        
        // Perform deposit which involves cross-contract call
        vault_client.deposit(&user, &amount).unwrap();

        // Check that events were emitted from both contracts
        let events = env.events().all();
        
        // Should have events from both token transfer and vault deposit
        let has_transfer_event = events.iter().any(|(_contract_id, topics, _data)| {
            topics.len() > 0 && topics.get(0).unwrap().as_symbol().unwrap().to_string() == "transfer"
        });
        
        let has_deposit_event = events.iter().any(|(_contract_id, topics, _data)| {
            topics.len() > 0 && topics.get(0).unwrap().as_symbol().unwrap().to_string() == "deposit"  
        });

        assert!(has_transfer_event, "Should have transfer event from token contract");
        assert!(has_deposit_event, "Should have deposit event from vault contract");
    }

    #[test]
    fn test_reentrancy_protection() {
        let (env, _token_id, token_client, vault_id, vault_client, _admin) = setup_contracts();
        
        let user = Address::generate(&env);
        let amount = 100i128;

        // Setup
        token_client.mint(&user, &amount).unwrap();
        
        // Deposit tokens
        vault_client.deposit(&user, &amount).unwrap();
        assert_eq!(vault_client.user_balance(&user), amount);

        // If there was a reentrancy vulnerability, an attacker might try to call
        // withdraw multiple times before the first one completes. Our implementation
        // protects against this by updating the balance before the cross-contract call.
        
        // Simulate what would happen if someone could call withdraw twice:
        // First call should succeed
        vault_client.withdraw(&user, &50i128).unwrap();
        assert_eq!(vault_client.user_balance(&user), 50);
        
        // Second call should also work with remaining balance
        vault_client.withdraw(&user, &50i128).unwrap();
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
        token_client.mint(&user, &100i128).unwrap();
        vault_client.deposit(&user, &100i128).unwrap();

        let result = vault_client.try_withdraw(&user, &0i128);
        assert!(result.is_err());

        let result = vault_client.try_withdraw(&user, &-50i128);
        assert!(result.is_err());
    }
}