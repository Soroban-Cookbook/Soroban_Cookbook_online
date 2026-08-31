#![no_std]

//! A minimal Soroban **custom account** contract.
//!
//! This is not a wallet product. It exists to show the shape of the
//! `CustomAccountInterface` trait — the hook the Soroban host calls whenever
//! code invokes `require_auth()` / `require_auth_for_args()` on this
//! contract's address instead of a plain `G...` account. A production
//! account contract (session keys, multisig, recovery, spend policies per
//! asset, etc.) builds on the same two primitives demonstrated here:
//!
//! 1. **Signature verification** — proving the caller controls a key.
//! 2. **Authorization policy** — inspecting the [`Context`]s the host passes
//!    in and rejecting invocations the account doesn't want to authorize,
//!    even when the signature itself is valid.

use soroban_sdk::{
    auth::{Context, ContractContext, CustomAccountInterface},
    contract, contracterror, contractimpl,
    crypto::Hash,
    symbol_short, BytesN, Env, Symbol, TryFromVal, Vec,
};

const SIGNER: Symbol = symbol_short!("signer");
const LIMIT: Symbol = symbol_short!("limit");
/// The function name this account applies its spend-limit policy to. A real
/// account would likely key policies by target contract as well as function.
const SPEND_FN: Symbol = symbol_short!("spend");

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AccountError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    PolicyLimitExceeded = 3,
}

#[contract]
pub struct CustomAccount;

#[contractimpl]
impl CustomAccount {
    /// One-time setup: register the signer's Ed25519 public key and the
    /// largest `amount` this account will authorize for a single `spend`
    /// invocation (see [`verify_spend_limit`]).
    pub fn init(env: Env, public_key: BytesN<32>, spend_limit: i128) -> Result<(), AccountError> {
        if env.storage().instance().has(&SIGNER) {
            return Err(AccountError::AlreadyInitialized);
        }
        env.storage().instance().set(&SIGNER, &public_key);
        env.storage().instance().set(&LIMIT, &spend_limit);
        Ok(())
    }
}

#[contractimpl]
impl CustomAccountInterface for CustomAccount {
    type Error = AccountError;
    /// A single Ed25519 signature over the payload the host asks us to check.
    type Signature = BytesN<64>;

    /// The entry point the Soroban host calls to authenticate a
    /// `require_auth` / `require_auth_for_args` call made against this
    /// contract's address. Returning `Ok(())` authorizes the call;
    /// returning `Err` (or trapping) rejects it.
    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        signature_payload: Hash<32>,
        signature: BytesN<64>,
        auth_contexts: Vec<Context>,
    ) -> Result<(), AccountError> {
        let public_key: BytesN<32> = env
            .storage()
            .instance()
            .get(&SIGNER)
            .ok_or(AccountError::NotInitialized)?;

        // Traps (aborts the whole invocation) if the signature doesn't
        // verify. There is no recoverable `Err` for "bad signature" —
        // the host function itself rejects it.
        env.crypto()
            .ed25519_verify(&public_key, &signature_payload.into(), &signature);

        verify_spend_limit(&env, &auth_contexts)
    }
}

/// A minimal authorization policy layered on top of signature verification:
/// reject any `spend(.., amount)` invocation that asks for more than the
/// account's configured limit, even though the signature is valid. Real
/// custom accounts commonly stack policies like this — per-asset limits,
/// allow-lists, time locks, session-key scopes — on top of the base
/// signature check.
fn verify_spend_limit(env: &Env, auth_contexts: &Vec<Context>) -> Result<(), AccountError> {
    let limit: i128 = env
        .storage()
        .instance()
        .get(&LIMIT)
        .ok_or(AccountError::NotInitialized)?;

    for context in auth_contexts.iter() {
        if let Context::Contract(ContractContext { fn_name, args, .. }) = context {
            if fn_name == SPEND_FN {
                let amount: i128 = args
                    .get(1)
                    .and_then(|v| i128::try_from_val(env, &v).ok())
                    .unwrap_or(0);
                if amount > limit {
                    return Err(AccountError::PolicyLimitExceeded);
                }
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use ed25519_dalek::{Signer, SigningKey};
    use rand::rngs::OsRng;
    use soroban_sdk::{
        testutils::{Address as _, BytesN as _},
        vec, Address, IntoVal,
    };

    fn generate_signer() -> SigningKey {
        SigningKey::generate(&mut OsRng)
    }

    fn signer_public_key(env: &Env, signer: &SigningKey) -> BytesN<32> {
        BytesN::from_array(env, &signer.verifying_key().to_bytes())
    }

    fn sign(env: &Env, signer: &SigningKey, payload: &BytesN<32>) -> BytesN<64> {
        let sig = signer.sign(&payload.to_array());
        BytesN::from_array(env, &sig.to_bytes())
    }

    fn create_account(env: &Env, public_key: BytesN<32>, spend_limit: i128) -> CustomAccountClient<'_> {
        let client = CustomAccountClient::new(env, &env.register(CustomAccount, ()));
        client.init(&public_key, &spend_limit);
        client
    }

    fn spend_context(env: &Env, amount: i128) -> Context {
        let target = Address::generate(env);
        Context::Contract(ContractContext {
            contract: target,
            fn_name: SPEND_FN,
            args: ((), amount).into_val(env),
        })
    }

    #[test]
    fn test_init() {
        let env = Env::default();
        let signer = generate_signer();
        let public_key = signer_public_key(&env, &signer);
        let account = create_account(&env, public_key.clone(), 1_000);

        // A second `init` call is rejected.
        assert_eq!(
            account.try_init(&public_key, &1_000),
            Err(Ok(AccountError::AlreadyInitialized))
        );
    }

    #[test]
    fn test_valid_signature_within_limit_is_authorized() {
        let env = Env::default();
        let signer = generate_signer();
        let public_key = signer_public_key(&env, &signer);
        let account = create_account(&env, public_key, 1_000);

        let payload = BytesN::<32>::random(&env);
        let signature = sign(&env, &signer, &payload);

        env.try_invoke_contract_check_auth::<AccountError>(
            &account.address,
            &payload,
            signature.into_val(&env),
            &vec![&env, spend_context(&env, 500)],
        )
        .unwrap();
    }

    #[test]
    fn test_invalid_signature_is_rejected() {
        let env = Env::default();
        let signer = generate_signer();
        let public_key = signer_public_key(&env, &signer);
        let account = create_account(&env, public_key, 1_000);

        let payload = BytesN::<32>::random(&env);
        // Signed by a key that never registered with this account.
        let impostor = generate_signer();
        let bad_signature = sign(&env, &impostor, &payload);

        let result = env.try_invoke_contract_check_auth::<AccountError>(
            &account.address,
            &payload,
            bad_signature.into_val(&env),
            &vec![&env, spend_context(&env, 500)],
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_spend_over_policy_limit_is_rejected() {
        let env = Env::default();
        let signer = generate_signer();
        let public_key = signer_public_key(&env, &signer);
        let account = create_account(&env, public_key, 1_000);

        let payload = BytesN::<32>::random(&env);
        // The signature itself is perfectly valid...
        let signature = sign(&env, &signer, &payload);

        // ...but the policy still rejects a spend above the configured limit.
        assert_eq!(
            env.try_invoke_contract_check_auth::<AccountError>(
                &account.address,
                &payload,
                signature.into_val(&env),
                &vec![&env, spend_context(&env, 1_001)],
            )
            .err()
            .unwrap()
            .unwrap(),
            AccountError::PolicyLimitExceeded
        );
    }
}
