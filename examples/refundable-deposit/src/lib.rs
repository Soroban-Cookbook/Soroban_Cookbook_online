#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Depositor,
    Amount,
    State,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DepositState {
    Ready,
    Deposited,
    Refunded,
    Consumed,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialised = 1,
    NotInitialised = 2,
    InvalidAmount = 3,
    NotReady = 4,
    NotDeposited = 5,
    WrongAdmin = 6,
    WrongDepositor = 7,
    AlreadySettled = 8,
}

#[contract]
pub struct RefundableDeposit;

#[contractimpl]
impl RefundableDeposit {
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialised);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Token, &token);
        env.storage()
            .persistent()
            .set(&DataKey::State, &DepositState::Ready);

        env.events()
            .publish((symbol_short!("init"),), (admin.clone(), token.clone()));

        Ok(())
    }

    pub fn deposit(env: Env, depositor: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        depositor.require_auth();

        let state: DepositState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        if state != DepositState::Ready {
            return Err(Error::AlreadySettled);
        }

        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&depositor, &env.current_contract_address(), &amount);

        env.storage().persistent().set(&DataKey::Depositor, &depositor);
        env.storage().persistent().set(&DataKey::Amount, &amount);
        env.storage()
            .persistent()
            .set(&DataKey::State, &DepositState::Deposited);

        env.events()
            .publish((symbol_short!("deposit"),), (depositor.clone(), amount));

        Ok(())
    }

    pub fn refund(env: Env, depositor: Address) -> Result<(), Error> {
        depositor.require_auth();

        let state: DepositState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        if state != DepositState::Deposited {
            return Err(Error::NotDeposited);
        }

        let stored_depositor: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Depositor)
            .ok_or(Error::NotInitialised)?;

        if depositor != stored_depositor {
            return Err(Error::WrongDepositor);
        }

        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &depositor, &amount);

        env.storage()
            .persistent()
            .set(&DataKey::State, &DepositState::Refunded);

        env.events()
            .publish((symbol_short!("refund"),), (depositor.clone(), amount));

        Ok(())
    }

    pub fn consume(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();

        let state: DepositState = env
            .storage()
            .persistent()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;

        if state != DepositState::Deposited {
            return Err(Error::NotDeposited);
        }

        let stored_admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialised)?;

        if admin != stored_admin {
            return Err(Error::WrongAdmin);
        }

        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Amount)
            .ok_or(Error::NotInitialised)?;

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &admin, &amount);

        env.storage()
            .persistent()
            .set(&DataKey::State, &DepositState::Consumed);

        env.events()
            .publish((symbol_short!("consume"),), (admin.clone(), amount));

        Ok(())
    }

    pub fn get_state(env: Env) -> Option<DepositState> {
        env.storage().persistent().get(&DataKey::State)
    }

    pub fn get_depositor(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Depositor)
    }

    pub fn get_amount(env: Env) -> Option<i128> {
        env.storage().persistent().get(&DataKey::Amount)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _, token::{self, StellarAssetClient}, Address, Env,
    };

    fn create_token<'a>(
        env: &Env,
        admin: &Address,
        to: &Address,
        amount: i128,
    ) -> (Address, token::Client<'a>) {
        let contract_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let sac = StellarAssetClient::new(env, &contract_address);
        sac.mint(to, &amount);
        let client = token::Client::new(env, &contract_address);
        (contract_address, client)
    }

    fn setup() -> (Env, Address, Address, Address, RefundableDepositClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let depositor = Address::generate(&env);
        let (token_addr, _) = create_token(&env, &admin, &depositor, 1_000);

        let contract_id = env.register(RefundableDeposit, ());
        let client = RefundableDepositClient::new(&env, &contract_id);

        client.initialize(&admin, &token_addr);

        (env, admin, depositor, token_addr, client)
    }

    #[test]
    fn test_deposit_transfers_tokens_and_sets_state() {
        let (env, _admin, depositor, token_addr, client) = setup();

        client.deposit(&depositor, &250);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(client.get_state(), Some(DepositState::Deposited));
        assert_eq!(client.get_depositor(), Some(depositor.clone()));
        assert_eq!(client.get_amount(), Some(250));
        assert_eq!(token_client.balance(&depositor), 750);
        assert_eq!(token_client.balance(&client.address), 250);
    }

    #[test]
    fn test_refund_returns_tokens_before_admin_consume() {
        let (env, _admin, depositor, token_addr, client) = setup();

        client.deposit(&depositor, &250);
        client.refund(&depositor);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(client.get_state(), Some(DepositState::Refunded));
        assert_eq!(token_client.balance(&depositor), 1_000);
        assert_eq!(token_client.balance(&client.address), 0);
    }

    #[test]
    fn test_admin_can_consume_deposit() {
        let (env, admin, depositor, token_addr, client) = setup();

        client.deposit(&depositor, &250);
        client.consume(&admin);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(client.get_state(), Some(DepositState::Consumed));
        assert_eq!(token_client.balance(&admin), 250);
        assert_eq!(token_client.balance(&client.address), 0);
    }

    #[test]
    fn test_non_admin_cannot_consume() {
        let (_env, _admin, depositor, _token_addr, client) = setup();

        client.deposit(&depositor, &250);
        let result = client.try_consume(&depositor);
        assert_eq!(result, Err(Ok(Error::WrongAdmin)));
    }

    #[test]
    fn test_refund_before_deposit_fails() {
        let (_env, _admin, depositor, _token_addr, client) = setup();

        let result = client.try_refund(&depositor);
        assert_eq!(result, Err(Ok(Error::NotDeposited)));
    }
}
