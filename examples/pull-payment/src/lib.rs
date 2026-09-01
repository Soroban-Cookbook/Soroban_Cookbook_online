#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Symbol,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Payout authority that can credit beneficiaries.
    Owner,
    /// Credited but not yet withdrawn balance per beneficiary.
    Credit(Address),
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    InvalidAmount = 2,
    InsufficientCredit = 3,
    TransferFailed = 4,
}

// ─── Pull Payment Contract ────────────────────────────────────────────────────

/// A payout contract that credits beneficiaries in storage rather than
/// pushing transfers to them on release. Each beneficiary pulls their own
/// payment later with a single, authorised [`Self::withdraw`] call.
///
/// The withdraw flow follows **Checks-Effects-Interactions** ordering so that
/// a token transfer (the only interaction) can never fail a beneficiary who
/// was already credited, and so no reentrancy can double-spend a credit.
#[contract]
pub struct PullPayment;

#[contractimpl]
impl PullPayment {
    /// Initialise the contract with a payout `owner` and the `token` used for payouts.
    pub fn init(env: Env, owner: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "Token"), &token);
    }

    fn require_owner(env: &Env) -> Result<(), Error> {
        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .ok_or(Error::Unauthorized)?;
        owner.require_auth();
        Ok(())
    }

    /// The token used for payouts.
    pub fn token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "Token"))
            .expect("uninitialized")
    }

    /// The payout owner.
    pub fn owner(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .expect("uninitialized")
    }

    /// Current credited (not yet withdrawn) balance for `beneficiary`.
    pub fn credit(env: Env, beneficiary: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Credit(beneficiary))
            .unwrap_or(0)
    }

    /// Owner credits `beneficiary` with `amount` of the payout token. This
    /// only updates contract storage — no token transfer occurs here, which is
    /// what makes a failed downstream payout impossible to lose funds to.
    ///
    /// The owner is expected to have funded the contract's token balance
    /// first (e.g. via `token.transfer(owner, contract, total)`).
    pub fn credit_payment(env: Env, beneficiary: Address, amount: i128) -> Result<(), Error> {
        Self::require_owner(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let current = Self::credit(env.clone(), beneficiary.clone());
        let new = current.checked_add(amount).expect("credit overflow");
        env.storage()
            .persistent()
            .set(&DataKey::Credit(beneficiary), &new);
        Ok(())
    }

    /// Beneficiary pulls their credited payment out as a token transfer.
    ///
    /// Ordering (Checks-Effects-Interactions):
    /// 1. **Checks** — authenticate the beneficiary and validate the amount.
    /// 2. **Effects** — zero the credit in storage *before* transferring.
    /// 3. **Interactions** — perform the token transfer last.
    ///
    /// Zeroing the credit before the transfer means a failed or reverting
    /// transfer cannot be retried to double-spend, and reentrancy back into
    /// `withdraw` sees a credit of zero.
    pub fn withdraw(env: Env, beneficiary: Address, amount: i128) -> Result<(), Error> {
        beneficiary.require_auth();

        // ── Checks ────────────────────────────────────────────────────────
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let credited = Self::credit(env.clone(), beneficiary.clone());
        if credited < amount {
            return Err(Error::InsufficientCredit);
        }

        // ── Effects ───────────────────────────────────────────────────────
        // Zero the credit before any interaction (checks-effects-interactions).
        let remaining = credited - amount;
        if remaining > 0 {
            env.storage()
                .persistent()
                .set(&DataKey::Credit(beneficiary.clone()), &remaining);
        } else {
            env.storage()
                .persistent()
                .remove(&DataKey::Credit(beneficiary.clone()));
        }

        // ── Interactions ──────────────────────────────────────────────────
        let token_address = Self::token(env.clone());
        token::Client::new(&env, &token_address).transfer(
            &env.current_contract_address(),
            &beneficiary,
            &amount,
        );

        Ok(())
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token,
    };

    fn setup<'a>() -> (Env, Address, Address, Address, PullPaymentClient<'a>) {
        let env = Env::default();
        env.mock_all_auths();

        let owner = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        let token_id = env.register_stellar_asset_contract_v2(owner.clone()).address();

        let contract_id = env.register(PullPayment, ());
        let contract = PullPaymentClient::new(&env, &contract_id);

        contract.init(&owner, &token_id);

        // Fund the contract to guarantee payouts can be pulled.
        token::StellarAssetClient::new(&env, &token_id).mint(&contract_id, &1_000_000);

        (env, owner, beneficiary, token_id, contract)
    }

    #[test]
    fn test_credit_and_withdraw_round_trip() {
        let (_env, owner, beneficiary, token_id, contract) = setup();

        assert_eq!(contract.credit(&beneficiary), 0);

        contract.credit_payment(&beneficiary, &1_000);
        assert_eq!(contract.credit(&beneficiary), 1_000);

        contract.withdraw(&beneficiary, &1_000);
        // Credit is zeroed once payment is pulled.
        assert_eq!(contract.credit(&beneficiary), 0);
        assert_eq!(contract.owner(), owner);
        assert_eq!(contract.token(), token_id);
    }

    #[test]
    fn test_credit_is_zeroed_before_transfer() {
        let (env, _owner, beneficiary, token_id, contract) = setup();

        contract.credit_payment(&beneficiary, &500);
        contract.withdraw(&beneficiary, &500);

        // Credited amount is zeroed once the payment is pulled.
        assert_eq!(contract.credit(&beneficiary), 0);
        // And the beneficiary actually received the token.
        let token_client = token::Client::new(&env, &token_id);
        let ben_bal = token_client.balance(&beneficiary);
        assert_eq!(ben_bal, 500);
    }

    #[test]
    fn test_partial_withdraw_keeps_remaining_credit() {
        let (_env, _owner, beneficiary, _token_id, contract) = setup();

        contract.credit_payment(&beneficiary, &1_000);
        contract.withdraw(&beneficiary, &400);

        assert_eq!(contract.credit(&beneficiary), 600);
    }

    #[test]
    fn test_withdraw_more_than_credit_fails() {
        let (_env, _owner, beneficiary, _token_id, contract) = setup();

        contract.credit_payment(&beneficiary, &100);

        let res = contract.try_withdraw(&beneficiary, &200);
        assert_eq!(
            res.unwrap_err().unwrap(),
            Error::InsufficientCredit
        );
        // Credit unchanged because the check failed before any effects.
        assert_eq!(contract.credit(&beneficiary), 100);
    }

    #[test]
    fn test_withdraw_zero_fails() {
        let (_env, _owner, beneficiary, _token_id, contract) = setup();
        contract.credit_payment(&beneficiary, &100);

        let res = contract.try_withdraw(&beneficiary, &0);
        assert_eq!(res.unwrap_err().unwrap(), Error::InvalidAmount);
    }

    #[test]
    fn test_only_owner_can_credit() {
        let (_env, owner, beneficiary, _token_id, contract) = setup();

        // Owner can credit.
        contract.credit_payment(&beneficiary, &100);
        assert_eq!(contract.credit(&beneficiary), 100);
        assert_eq!(contract.owner(), owner);
    }
}
