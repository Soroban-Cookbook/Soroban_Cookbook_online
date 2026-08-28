#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl, contracttype, testutils::Address as _,
    token::TokenClient, Address, Env, Vec,
};

use crate::{MultisigWallet, MultisigWalletClient, WalletError, TransferProposal};

#[contracttype]
#[derive(Clone)]
enum TestTokenDataKey {
    Balance(Address),
}

#[contract]
struct TestToken;

#[contractimpl]
impl TestToken {
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&TestTokenDataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> i128 {
        from.require_auth();
        let from_key = TestTokenDataKey::Balance(from.clone());
        let from_bal: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        let to_key = TestTokenDataKey::Balance(to.clone());
        let to_bal: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage().persistent().set(&from_key, &(from_bal - amount));
        env.storage().persistent().set(&to_key, &(to_bal + amount));
        from_bal - amount
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let key = TestTokenDataKey::Balance(to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(bal + amount));
    }
}

struct Fixture {
    _env: Env,
    wallet_id: Address,
    wallet: MultisigWalletClient<'static>,
    token: TokenClient<'static>,
    alice: Address,
    bob: Address,
    charlie: Address,
    recipient: Address,
}

fn setup_2of3() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = env.register(TestToken, ());
    let token = TokenClient::new(&env, &token_id);

    let wallet_id = env.register(MultisigWallet, ());
    let wallet = MultisigWalletClient::new(&env, &wallet_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);
    let recipient = Address::generate(&env);

    let signers = Vec::from_array(&env, [
        alice.clone(),
        bob.clone(),
        charlie.clone(),
    ]);
    wallet.initialize(&signers, &2u32);

    TestTokenClient::new(&env, &token_id).mint(&alice, &10_000);
    TestTokenClient::new(&env, &token_id).mint(&bob, &10_000);
    TestTokenClient::new(&env, &token_id).mint(&charlie, &10_000);

    Fixture {
        _env: env,
        wallet_id,
        wallet,
        token,
        alice,
        bob,
        charlie,
        recipient,
    }
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let signer1 = Address::generate(&env);
    let signer2 = Address::generate(&env);
    let signers = Vec::from_array(&env, [signer1, signer2]);

    client.initialize(&signers, &1u32);

    assert_eq!(client.get_threshold(), Some(1));
    assert_eq!(client.get_proposal_count(), 0);

    let result = client.try_initialize(&signers, &1u32);
    assert_eq!(result, Err(Ok(WalletError::AlreadyInitialized)));
}

#[test]
fn test_initialize_invalid_threshold() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MultisigWallet, ());
    let client = MultisigWalletClient::new(&env, &contract_id);

    let signer = Address::generate(&env);
    let signers = Vec::from_array(&env, [signer]);

    let result = client.try_initialize(&signers, &0u32);
    assert_eq!(result, Err(Ok(WalletError::InvalidThreshold)));

    let result = client.try_initialize(&signers, &2u32);
    assert_eq!(result, Err(Ok(WalletError::InvalidThreshold)));
}

#[test]
fn test_deposit() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &1_000);

    let balance = f.wallet.get_balance(&f.token.address);
    assert_eq!(balance, 1_000);

    let alice_balance = f.token.balance(&f.alice);
    assert_eq!(alice_balance, 9_000);
}

#[test]
fn test_deposit_invalid_amount() {
    let f = setup_2of3();

    let result = f.wallet.try_deposit(&f.alice, &f.token.address, &0);
    assert_eq!(result, Err(Ok(WalletError::InvalidAmount)));

    let result = f.wallet.try_deposit(&f.alice, &f.token.address, &-1);
    assert_eq!(result, Err(Ok(WalletError::InvalidAmount)));
}

#[test]
fn test_submit_transfer() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);

    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);
    assert_eq!(proposal_id, 0u32);

    let proposal = f.wallet.get_proposal(&proposal_id).unwrap();
    assert_eq!(proposal.token, f.token.address);
    assert_eq!(proposal.to, f.recipient);
    assert_eq!(proposal.amount, 1_000);
    assert_eq!(proposal.approvals.len(), 0);
    assert!(!proposal.executed);
}

#[test]
fn test_unauthorized_submit() {
    let f = setup_2of3();
    let outsider = Address::generate(&f._env);

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);

    let result = f.wallet.try_submit_transfer(
        &outsider,
        &f.token.address,
        &f.recipient,
        &1_000,
    );
    assert_eq!(result, Err(Ok(WalletError::NotAuthorized)));
}

#[test]
fn test_approve() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    f.wallet.approve(&proposal_id, &f.alice);

    let proposal = f.wallet.get_proposal(&proposal_id).unwrap();
    assert_eq!(proposal.approvals.len(), 1);
    assert!(proposal.approvals.contains(&f.alice));
}

#[test]
fn test_double_approve() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    f.wallet.approve(&proposal_id, &f.alice);
    let result = f.wallet.try_approve(&proposal_id, &f.alice);
    assert_eq!(result, Err(Ok(WalletError::AlreadyApproved)));
}

#[test]
fn test_unauthorized_approve() {
    let f = setup_2of3();
    let outsider = Address::generate(&f._env);

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    let result = f.wallet.try_approve(&proposal_id, &outsider);
    assert_eq!(result, Err(Ok(WalletError::NotAuthorized)));
}

#[test]
fn test_execute() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &2_000);

    f.wallet.approve(&proposal_id, &f.alice);
    f.wallet.approve(&proposal_id, &f.bob);

    f.wallet.execute(&proposal_id);

    let proposal = f.wallet.get_proposal(&proposal_id).unwrap();
    assert!(proposal.executed);

    let recipient_balance = f.token.balance(&f.recipient);
    assert_eq!(recipient_balance, 2_000);

    let wallet_balance = f.token.balance(&f.wallet_id);
    assert_eq!(wallet_balance, 3_000);
}

#[test]
fn test_execute_threshold_not_met() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    f.wallet.approve(&proposal_id, &f.alice);

    let result = f.wallet.try_execute(&proposal_id);
    assert_eq!(result, Err(Ok(WalletError::ThresholdNotMet)));
}

#[test]
fn test_execute_already_executed() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    f.wallet.approve(&proposal_id, &f.alice);
    f.wallet.approve(&proposal_id, &f.bob);
    f.wallet.execute(&proposal_id);

    let result = f.wallet.try_execute(&proposal_id);
    assert_eq!(result, Err(Ok(WalletError::AlreadyExecuted)));
}

#[test]
fn test_proposal_not_found() {
    let f = setup_2of3();

    let result = f.wallet.try_approve(&999, &f.alice);
    assert_eq!(result, Err(Ok(WalletError::ProposalNotFound)));

    let result = f.wallet.try_execute(&999);
    assert_eq!(result, Err(Ok(WalletError::ProposalNotFound)));
}

#[test]
fn test_full_workflow() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    assert_eq!(f.wallet.get_balance(&f.token.address), 5_000);

    let pid = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &3_000);
    assert_eq!(pid, 0);

    let pid2 = f
        .wallet
        .submit_transfer(&f.bob, &f.token.address, &f.recipient, &1_000);
    assert_eq!(pid2, 1);

    assert_eq!(f.wallet.get_proposal_count(), 2);

    f.wallet.approve(&pid, &f.alice);
    f.wallet.approve(&pid, &f.bob);
    f.wallet.execute(&pid);

    assert_eq!(f.token.balance(&f.recipient), 3_000);
    assert_eq!(f.token.balance(&f.wallet_id), 2_000);

    f.wallet.approve(&pid2, &f.bob);
    f.wallet.approve(&pid2, &f.charlie);
    f.wallet.execute(&pid2);

    assert_eq!(f.token.balance(&f.recipient), 4_000);
    assert_eq!(f.token.balance(&f.wallet_id), 1_000);
}

#[test]
fn test_getters() {
    let f = setup_2of3();

    let signers = f.wallet.get_signers().unwrap();
    assert_eq!(signers.len(), 3);
    assert!(signers.contains(&f.alice));
    assert!(signers.contains(&f.bob));
    assert!(signers.contains(&f.charlie));

    assert_eq!(f.wallet.get_threshold(), Some(2));
    assert_eq!(f.wallet.get_proposal_count(), 0);
}

#[test]
fn test_submit_invalid_amount() {
    let f = setup_2of3();

    let result = f
        .wallet
        .try_submit_transfer(&f.alice, &f.token.address, &f.recipient, &0);
    assert_eq!(result, Err(Ok(WalletError::InvalidAmount)));

    let result = f
        .wallet
        .try_submit_transfer(&f.alice, &f.token.address, &f.recipient, &-100);
    assert_eq!(result, Err(Ok(WalletError::InvalidAmount)));
}

#[test]
#[should_panic(expected = "HostError: Error(Auth, InvalidAction)")]
fn test_deposit_unauthorized() {
    let f = setup_2of3();
    f._env.set_auths(&[]);
    f.wallet.deposit(&f.alice, &f.token.address, &100);
}

#[test]
fn test_approve_after_execution() {
    let f = setup_2of3();

    f.wallet.deposit(&f.alice, &f.token.address, &5_000);
    let proposal_id = f
        .wallet
        .submit_transfer(&f.alice, &f.token.address, &f.recipient, &1_000);

    f.wallet.approve(&proposal_id, &f.alice);
    f.wallet.approve(&proposal_id, &f.bob);
    f.wallet.execute(&proposal_id);

    let result = f.wallet.try_approve(&proposal_id, &f.charlie);
    assert_eq!(result, Err(Ok(WalletError::AlreadyExecuted)));
}
