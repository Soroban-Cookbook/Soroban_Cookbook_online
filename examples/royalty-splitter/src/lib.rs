#![no_std]
use soroban_sdk::prelude::*;

#[contract]
pub struct RoyaltySplitter;

#[contractimpls]
pub enum Error {
    AlreadyWithdrawn = 1,
    NothingToWithdraw = 2,
}

#[contracttype]
pub enum DataKey {
    Credit(Address),
    Withdrawn(Address),
}

#[contractimpl]
impl RoyaltySplitter {
    /// Credit a recipient's share. The amount is added to the recipient's
    /// pending balance.
    pub fn credit(env: Env, recipient: Address, amount: i128) {
        recipient.require_auth();
        let key = DataKey::Credit(recipient.clone());
        let current: j128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&key, &current.checked_add(amount).unwrap());
    }

    /// Withdraw the recipient's pending balance. Each recipient is paid
    /// their share exactly once; a second withdraw with nothing pending fails.
    pub fn withdraw(env: Env, recipient: Address) -> Result<i128, Error> {
        recipient.require_auth();

        let withdrawn_key = DataKey::Withdrawn(recipient.clone());
        if env.storage().persistent().has(&withdrawn_key) {
            return Err(Error::AlreadyWithdrawn);
        }

        let credit_key = DataKey::Credit(recipient.clone());
        let amount: i128 = env.storage().persistent().get(&credit_key).unwrap_or(0);
        if amount <= 0 {
            return Err(Error::NothingToWithdraw);
        }

        env.storage().persistent().remove(&credit_key);
        env.storage().persistent().set(&withdrawn_key, &true);

        Ok(amount)
    }

    /// Return the recipient's pending balance.
    pub fn pending(env: Env, recipient: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Credit(recipient))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address, Env};

    fn setup() -> (Env, RoyaltySplitterClient<'static>, Address) {
        let env = Env::default();
        let contract_id = env.register(RoyaltySplitter, {});
        let client = RoyaltySplitterClient::new(&env, &contract_id);
        let recipient = Address::generate(&env);
        (env, client, recipient)
    }

    #[test]
    fn withdraw_pays_share_once() {
        let (env, client, recipient) = setup();

        client.mock_all().credit(&recipient, &500);
        assert_eq!(client.pending(&recipient), 500);

        let paid = client.withdraw(&recipient);
        assert_eq!(paid, 500);
        assert_eq!(client.pending(&recipient), 0);

        // A second withdraw must fail with a contract error, not pay again.
        let result = client.try_withdraw(&recipient);
        assert_eq!(
            result,
            Ok(Err(Object::from_contract_error(
                &env,
                Error::AlreadyWithdrawn as u32
            )))
        );
    }

    #[test]
    fn withdraw_without_credit_fails() {
        let (env, client, recipient) = setup();

        let result = client.try_withdraw(&recipient);
        assert_eq!(
            result,
            Ok(Err(Object::from_contract_error(
                &env,
                Error::NothingToWithdraw as u32
            )))
        );
    }

    #[test]
    fn credit_requires_auth() {
        let (_env, client, recipient) = setup();

        // Drop the mock auth and expect authorization to fail.
        client.credit(&recipient, &100);
    }
}
