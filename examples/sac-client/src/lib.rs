#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct SacClient;

#[contractimpl]
impl SacClient {
    /// Transfer tokens using the SAC client.
    /// Note: The caller must have authorized the `transfer` via `require_auth`
    pub fn transfer_token(
        env: Env,
        token: Address,
        from: Address,
        to: Address,
        amount: i128,
    ) {
        from.require_auth();
        
        let client = token::Client::new(&env, &token);
        client.transfer(&from, &to, &amount);
    }
    
    /// Get the balance of an address for a given token.
    pub fn get_balance(env: Env, token: Address, user: Address) -> i128 {
        let client = token::Client::new(&env, &token);
        client.balance(&user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{token::{self, StellarAssetClient}, Address, Env};

    #[test]
    fn test_sac_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let sac_client_id = env.register(SacClient, ());
        let client = SacClientClient::new(&env, &sac_client_id);

        let admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
        
        let sac = StellarAssetClient::new(&env, &token_address);
        
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        // Mint to user1
        sac.mint(&user1, &1000);
        
        assert_eq!(client.get_balance(&token_address, &user1), 1000);
        
        // Transfer using our wrapper
        client.transfer_token(&token_address, &user1, &user2, &400);
        
        assert_eq!(client.get_balance(&token_address, &user1), 600);
        assert_eq!(client.get_balance(&token_address, &user2), 400);
    }
}
