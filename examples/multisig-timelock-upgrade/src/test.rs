// SPDX-License-Identifier: MIT

#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, Vec,
};

use crate::{Error, MultisigTimelockUpgrade, MultisigTimelockUpgradeClient};

struct Fixture {
    env: Env,
    client: MultisigTimelockUpgradeClient<'static>,
    owner1: Address,
    owner2: Address,
    owner3: Address,
    dummy_wasm_hash: BytesN<32>,
}

const BASE_TIME: u64 = 1_000_000;
const DELAY: u64 = 86_400; // 1 day

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| {
        li.timestamp = BASE_TIME;
        li.sequence_number = 1;
    });

    let contract_id = env.register(MultisigTimelockUpgrade, ());
    let client = MultisigTimelockUpgradeClient::new(&env, &contract_id);

    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    let owner3 = Address::generate(&env);

    let owners = Vec::from_array(&env, [owner1.clone(), owner2.clone(), owner3.clone()]);
    // 2-of-3 threshold with 1-day delay
    client.init(&owners, &2u32, &DELAY);

    let dummy_wasm_hash = BytesN::from_array(&env, &[1u8; 32]);

    Fixture {
        env,
        client,
        owner1,
        owner2,
        owner3,
        dummy_wasm_hash,
    }
}

fn advance_time(env: &Env, seconds: u64) {
    env.ledger().with_mut(|li| {
        li.timestamp += seconds;
        li.sequence_number += 1;
    });
}

#[test]
fn test_execute_fails_before_timelock() {
    let f = setup();

    // Schedule upgrade proposal by owner1 (proposer gets first approval)
    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    // Meet signer threshold (2 of 3)
    f.client.approve(&f.owner2);

    // Try executing immediately before timelock elapses
    let res = f.client.try_execute();
    assert_eq!(res, Err(Ok(Error::TooEarly)));

    // Advance time to 1 second before unlock
    advance_time(&f.env, DELAY - 1);
    let res = f.client.try_execute();
    assert_eq!(res, Err(Ok(Error::TooEarly)));
}

#[test]
fn test_execute_fails_without_signer_threshold() {
    let f = setup();

    // Schedule upgrade proposal by owner1 (only 1 approval out of 2 required)
    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    // Advance time past the timelock delay
    advance_time(&f.env, DELAY + 10);

    // Threshold is 2, but only owner1 has approved
    let res = f.client.try_execute();
    assert_eq!(res, Err(Ok(Error::BelowThreshold)));
}

#[test]
fn test_execute_fails_when_both_timelock_and_threshold_not_met() {
    let f = setup();

    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    // Neither threshold nor delay is satisfied
    let res = f.client.try_execute();
    assert_eq!(res, Err(Ok(Error::BelowThreshold)));
}

#[test]
fn test_execute_fails_with_no_pending_upgrade() {
    let f = setup();

    let res = f.client.try_execute();
    assert_eq!(res, Err(Ok(Error::NoPendingUpgrade)));
}

#[test]
fn test_schedule_requires_owner_auth() {
    let f = setup();
    let outsider = Address::generate(&f.env);

    let res = f.client.try_schedule(&outsider, &f.dummy_wasm_hash);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn test_approve_requires_owner_auth() {
    let f = setup();
    let outsider = Address::generate(&f.env);

    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    let res = f.client.try_approve(&outsider);
    assert_eq!(res, Err(Ok(Error::NotAuthorized)));
}

#[test]
fn test_double_approve_fails() {
    let f = setup();

    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    // owner1 already approved via schedule
    let res = f.client.try_approve(&f.owner1);
    assert_eq!(res, Err(Ok(Error::AlreadyApproved)));
}

#[test]
fn test_schedule_fails_when_pending_exists() {
    let f = setup();

    f.client.schedule(&f.owner1, &f.dummy_wasm_hash);

    let other_hash = BytesN::from_array(&f.env, &[2u8; 32]);
    let res = f.client.try_schedule(&f.owner2, &other_hash);
    assert_eq!(res, Err(Ok(Error::PendingUpgradeExists)));
}
