#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidSharesSum = 3,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Payees,
}

#[contract]
pub struct PaymentSplitter;

#[contractimpl]
impl PaymentSplitter {
    /// Initialize the payment splitter contract.
    /// `admin`: Can withdraw funds in case of emergency.
    /// `token`: The token to be split.
    /// `payees`: A vector of tuples containing the payee address and their share in BPS (Basis Points).
    /// The sum of all shares must equal 10000 (100%).
    pub fn init(
        env: Env,
        admin: Address,
        token: Address,
        payees: Vec<(Address, i128)>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Token) {
            return Err(Error::AlreadyInitialized);
        }

        let mut total_shares: i128 = 0;
        for payee in payees.iter() {
            total_shares += payee.1;
        }

        if total_shares != 10000 {
            return Err(Error::InvalidSharesSum);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Payees, &payees);

        Ok(())
    }

    /// Split the current token balance of this contract among the payees according to their shares.
    /// 
    /// Dust Policy: Due to integer division (balance * share / 10000), a small amount of "dust"
    /// may remain in the contract. This dust is left in the contract and will be included in the
    /// balance during the next split.
    pub fn split(env: Env) -> Result<(), Error> {
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;

        let payees: Vec<(Address, i128)> = env
            .storage()
            .instance()
            .get(&DataKey::Payees)
            .unwrap();

        let client = token::Client::new(&env, &token_addr);
        let balance = client.balance(&env.current_contract_address());

        if balance > 0 {
            for payee in payees.iter() {
                let share_amount = (balance * payee.1) / 10000;
                if share_amount > 0 {
                    client.transfer(&env.current_contract_address(), &payee.0, &share_amount);
                }
            }
        }

        Ok(())
    }

    /// Admin can withdraw tokens (e.g. for unauthorized withdraw tests or emergency).
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        
        admin.require_auth();

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap();

        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &to, &amount);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup_token(env: &Env) -> (Address, token::Client<'static>) {
        let token_admin = Address::generate(env);
        let contract_id = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_client = token::Client::new(env, &contract_id.address());
        (contract_id.address(), token_client)
    }

    #[test]
    fn test_initialization() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let payee1 = Address::generate(&env);
        let payee2 = Address::generate(&env);

        let mut payees = Vec::new(&env);
        payees.push_back((payee1.clone(), 6000));
        payees.push_back((payee2.clone(), 4000));

        assert_eq!(client.init(&admin, &token, &payees), ());
    }

    #[test]
    fn test_initialization_invalid_shares() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let payee1 = Address::generate(&env);

        let mut payees = Vec::new(&env);
        payees.push_back((payee1.clone(), 5000));

        let res = client.try_init(&admin, &token, &payees);
        assert_eq!(res, Err(Ok(Error::InvalidSharesSum)));
    }

    #[test]
    fn test_split_and_dust_handling() {
        let env = Env::default();
        env.mock_all_auths();
        
        let (token_addr, token_client) = setup_token(&env);
        
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let payee1 = Address::generate(&env);
        let payee2 = Address::generate(&env);
        let payee3 = Address::generate(&env);

        let mut payees = Vec::new(&env);
        payees.push_back((payee1.clone(), 5000)); // 50%
        payees.push_back((payee2.clone(), 3000)); // 30%
        payees.push_back((payee3.clone(), 2000)); // 20%

        client.init(&admin, &token_addr, &payees);

        // Mint tokens to the contract
        let token_admin_client = token::StellarAssetClient::new(&env, &token_addr);
        token_admin_client.mint(&contract_id, &10005); // 10005 to test dust

        // Perform split
        client.split();

        // 5000 bps of 10005 = 5002
        assert_eq!(token_client.balance(&payee1), 5002);
        // 3000 bps of 10005 = 3001
        assert_eq!(token_client.balance(&payee2), 3001);
        // 2000 bps of 10005 = 2001
        assert_eq!(token_client.balance(&payee3), 2001);

        // Remaining dust in contract: 10005 - (5002 + 3001 + 2001) = 1
        assert_eq!(token_client.balance(&contract_id), 1);
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_withdraw() {
        let env = Env::default();
        // Do not mock auths so require_auth will panic if not provided
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let payee = Address::generate(&env);

        let mut payees = Vec::new(&env);
        payees.push_back((payee.clone(), 10000));

        client.init(&admin, &token, &payees);

        let random_user = Address::generate(&env);
        // This should panic because auth from admin is not mocked and random_user is not admin
        client.withdraw(&random_user, &100);
    }
}
