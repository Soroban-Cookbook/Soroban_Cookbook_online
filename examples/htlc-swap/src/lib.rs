#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Bytes, Env,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Swap {
    pub sender: Address,
    pub receiver: Address,
    pub token_a: Address,
    pub token_b: Address,
    pub amount_a: i128,
    pub amount_b: i128,
    pub hashlock: Bytes,
    pub timelock: u64,
    pub claimed: bool,
    pub refunded: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Swap(Bytes),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyClaimed = 1,
    AlreadyRefunded = 2,
    InvalidPreimage = 3,
    TimelockNotExpired = 4,
    TimelockExpired = 5,
    SwapNotFound = 6,
    SwapExists = 7,
    InsufficientBalance = 8,
}

#[contract]
pub struct HtlcSwap;

#[contractimpl]
impl HtlcSwap {
    pub fn create(
        env: Env,
        sender: Address,
        receiver: Address,
        token_a: Address,
        token_b: Address,
        amount_a: i128,
        amount_b: i128,
        hashlock: Bytes,
        timelock: u64,
    ) -> Result<Bytes, Error> {
        sender.require_auth();

        if amount_a <= 0 || amount_b <= 0 {
            return Err(Error::InsufficientBalance);
        }

        let swap_id: Bytes = env.crypto().sha256(&hashlock).into();
        let key = DataKey::Swap(swap_id.clone());

        if env.storage().persistent().has(&key) {
            return Err(Error::SwapExists);
        }

        let swap = Swap {
            sender: sender.clone(),
            receiver,
            token_a,
            token_b,
            amount_a,
            amount_b,
            hashlock,
            timelock,
            claimed: false,
            refunded: false,
        };

        env.storage().persistent().set(&key, &swap);

        let token_a_client = token::Client::new(&env, &swap.token_a);
        token_a_client.transfer(&sender, &env.current_contract_address(), &amount_a);

        Ok(swap_id)
    }

    pub fn claim(env: Env, caller: Address, swap_id: Bytes, preimage: Bytes) -> Result<(), Error> {
        caller.require_auth();

        let key = DataKey::Swap(swap_id.clone());
        let mut swap: Swap = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SwapNotFound)?;

        if swap.claimed {
            return Err(Error::AlreadyClaimed);
        }
        if swap.refunded {
            return Err(Error::AlreadyRefunded);
        }

        let preimage_hash: Bytes = env.crypto().sha256(&preimage).into();
        if preimage_hash != swap.hashlock {
            return Err(Error::InvalidPreimage);
        }

        if swap.receiver != caller {
            return Err(Error::InvalidPreimage);
        }

        swap.claimed = true;
        env.storage().persistent().set(&key, &swap);

        let token_b_client = token::Client::new(&env, &swap.token_b);
        token_b_client.transfer(&caller, &env.current_contract_address(), &swap.amount_b);

        let token_a_client = token::Client::new(&env, &swap.token_a);
        token_a_client.transfer(&env.current_contract_address(), &caller, &swap.amount_a);

        env.storage().persistent().remove(&key);

        Ok(())
    }

    pub fn refund(env: Env, caller: Address, swap_id: Bytes) -> Result<(), Error> {
        caller.require_auth();

        let key = DataKey::Swap(swap_id.clone());
        let mut swap: Swap = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SwapNotFound)?;

        if swap.claimed {
            return Err(Error::AlreadyClaimed);
        }
        if swap.refunded {
            return Err(Error::AlreadyRefunded);
        }

        if swap.sender != caller {
            return Err(Error::TimelockNotExpired);
        }

        let current_time = env.ledger().timestamp();
        if current_time < swap.timelock {
            return Err(Error::TimelockNotExpired);
        }

        swap.refunded = true;
        env.storage().persistent().set(&key, &swap);

        let token_a_client = token::Client::new(&env, &swap.token_a);
        token_a_client.transfer(&env.current_contract_address(), &caller, &swap.amount_a);

        env.storage().persistent().remove(&key);

        Ok(())
    }

    pub fn get_swap(env: Env, swap_id: Bytes) -> Option<Swap> {
        let key = DataKey::Swap(swap_id);
        env.storage().persistent().get(&key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        Bytes, Env,
    };

    fn create_token(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'static>) {
        let asset = env.register_stellar_asset_contract(admin.clone());
        let sac = token::StellarAssetClient::new(env, &asset);
        (asset, sac)
    }

    fn advance_time(env: &Env, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            timestamp,
            protocol_version: 27,
            sequence_number: env.ledger().sequence(),
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });
    }

    fn setup() -> (
        Env,
        Address,
        Address,
        Address,
        Address,
        HtlcSwapClient<'static>,
    ) {
        let env = Env::default();
        env.mock_all_auths();
        advance_time(&env, 1000);

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let (token_a, sac_a) = create_token(&env, &admin);
        let (token_b, sac_b) = create_token(&env, &admin);

        sac_a.mint(&alice, &1000);
        sac_b.mint(&bob, &1000);

        let contract_id = env.register(HtlcSwap, ());
        let client = HtlcSwapClient::new(&env, &contract_id);

        (env, alice, bob, token_a, token_b, client)
    }

    #[test]
    fn test_create_and_claim() {
        let (env, alice, bob, token_a, token_b, client) = setup();

        let secret = Bytes::from_array(&env, &[0x01, 0x02, 0x03, 0x04]);
        let hashlock: Bytes = env.crypto().sha256(&secret).into();

        let swap_id = client.create(
            &alice, &bob, &token_a, &token_b, &100, &50, &hashlock, &2000,
        );

        client.claim(&bob, &swap_id, &secret);

        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        assert_eq!(token_a_client.balance(&alice), 900);
        assert_eq!(token_a_client.balance(&bob), 100);
        assert_eq!(token_b_client.balance(&alice), 0);
        assert_eq!(token_b_client.balance(&bob), 950);
    }

    #[test]
    fn test_create_and_refund() {
        let (env, alice, bob, token_a, token_b, client) = setup();

        let secret = Bytes::from_array(&env, &[0x01, 0x02, 0x03, 0x04]);
        let hashlock: Bytes = env.crypto().sha256(&secret).into();

        let swap_id = client.create(
            &alice, &bob, &token_a, &token_b, &100, &50, &hashlock, &2000,
        );

        let result = client.try_refund(&alice, &swap_id);
        assert_eq!(result, Err(Ok(Error::TimelockNotExpired)));

        advance_time(&env, 2000);

        client.refund(&alice, &swap_id);

        let token_a_client = token::Client::new(&env, &token_a);
        assert_eq!(token_a_client.balance(&alice), 1000);
    }

    #[test]
    fn test_claim_with_wrong_preimage_fails() {
        let (env, alice, bob, token_a, token_b, client) = setup();

        let secret = Bytes::from_array(&env, &[0x01, 0x02, 0x03, 0x04]);
        let hashlock: Bytes = env.crypto().sha256(&secret).into();

        let swap_id = client.create(
            &alice, &bob, &token_a, &token_b, &100, &50, &hashlock, &2000,
        );

        let wrong_secret = Bytes::from_array(&env, &[0x05, 0x06, 0x07, 0x08]);
        let result = client.try_claim(&bob, &swap_id, &wrong_secret);
        assert_eq!(result, Err(Ok(Error::InvalidPreimage)));
    }

    #[test]
    fn test_double_claim_fails() {
        let (env, alice, bob, token_a, token_b, client) = setup();

        let secret = Bytes::from_array(&env, &[0x01, 0x02, 0x03, 0x04]);
        let hashlock: Bytes = env.crypto().sha256(&secret).into();

        let swap_id = client.create(
            &alice, &bob, &token_a, &token_b, &100, &50, &hashlock, &2000,
        );

        client.claim(&bob, &swap_id, &secret);

        let result = client.try_claim(&bob, &swap_id, &secret);
        assert_eq!(result, Err(Ok(Error::SwapNotFound)));
    }

    #[test]
    fn test_refund_after_claim_fails() {
        let (env, alice, bob, token_a, token_b, client) = setup();

        let secret = Bytes::from_array(&env, &[0x01, 0x02, 0x03, 0x04]);
        let hashlock: Bytes = env.crypto().sha256(&secret).into();

        let swap_id = client.create(
            &alice, &bob, &token_a, &token_b, &100, &50, &hashlock, &2000,
        );

        client.claim(&bob, &swap_id, &secret);

        advance_time(&env, 2000);

        let result = client.try_refund(&alice, &swap_id);
        assert_eq!(result, Err(Ok(Error::SwapNotFound)));
    }

    #[test]
    fn test_get_swap_returns_none_for_invalid_id() {
        let (env, _, _, _, _, client) = setup();
        let invalid_id = Bytes::from_array(&env, &[0x00; 32]);
        let result = client.get_swap(&invalid_id);
        assert_eq!(result, None);
    }
}
