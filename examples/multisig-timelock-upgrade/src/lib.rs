// SPDX-License-Identifier: MIT

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    InvalidThreshold = 3,
    NoPendingUpgrade = 4,
    PendingUpgradeExists = 5,
    AlreadyApproved = 6,
    BelowThreshold = 7,
    TooEarly = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeProposal {
    pub new_wasm_hash: BytesN<32>,
    pub proposed_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Initialized,
    Owners,
    Threshold,
    Delay,
    Pending,
    Approvals,
}

const EVENT_UPGRADE: Symbol = symbol_short!("upgrade");

#[contract]
pub struct MultisigTimelockUpgrade;

#[contractimpl]
impl MultisigTimelockUpgrade {
    pub fn init(
        env: Env,
        owners: Vec<Address>,
        required_signatures: u32,
        delay: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }
        if required_signatures == 0 || required_signatures > owners.len() {
            return Err(Error::InvalidThreshold);
        }

        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Owners, &owners);
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &required_signatures);
        env.storage().instance().set(&DataKey::Delay, &delay);

        Ok(())
    }

    pub fn schedule(env: Env, proposer: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        proposer.require_auth();

        let owners: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Owners)
            .ok_or(Error::NotAuthorized)?;
        if !owners.contains(&proposer) {
            return Err(Error::NotAuthorized);
        }

        if env.storage().instance().has(&DataKey::Pending) {
            return Err(Error::PendingUpgradeExists);
        }

        let now = env.ledger().timestamp();
        let proposal = UpgradeProposal {
            new_wasm_hash,
            proposed_at: now,
        };

        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer);

        env.storage().instance().set(&DataKey::Pending, &proposal);
        env.storage()
            .instance()
            .set(&DataKey::Approvals, &approvals);

        Ok(())
    }

    pub fn approve(env: Env, signer: Address) -> Result<(), Error> {
        signer.require_auth();

        let owners: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Owners)
            .ok_or(Error::NotAuthorized)?;
        if !owners.contains(&signer) {
            return Err(Error::NotAuthorized);
        }

        if !env.storage().instance().has(&DataKey::Pending) {
            return Err(Error::NoPendingUpgrade);
        }

        let mut approvals: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Approvals)
            .unwrap_or_else(|| Vec::new(&env));

        if approvals.contains(&signer) {
            return Err(Error::AlreadyApproved);
        }

        approvals.push_back(signer);
        env.storage()
            .instance()
            .set(&DataKey::Approvals, &approvals);

        Ok(())
    }

    pub fn execute(env: Env) -> Result<(), Error> {
        let proposal: UpgradeProposal = env
            .storage()
            .instance()
            .get(&DataKey::Pending)
            .ok_or(Error::NoPendingUpgrade)?;

        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .ok_or(Error::NotAuthorized)?;

        let delay: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Delay)
            .ok_or(Error::NotAuthorized)?;

        let approvals: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Approvals)
            .unwrap_or_else(|| Vec::new(&env));

        if approvals.len() < threshold {
            return Err(Error::BelowThreshold);
        }

        let now = env.ledger().timestamp();
        if now < proposal.proposed_at.saturating_add(delay) {
            return Err(Error::TooEarly);
        }

        env.storage().instance().remove(&DataKey::Pending);
        env.storage().instance().remove(&DataKey::Approvals);

        env.deployer()
            .update_current_contract_wasm(proposal.new_wasm_hash.clone());

        env.events()
            .publish((EVENT_UPGRADE,), proposal.new_wasm_hash);

        Ok(())
    }

    // View helpers
    pub fn get_proposal(env: Env) -> Option<UpgradeProposal> {
        env.storage().instance().get(&DataKey::Pending)
    }

    pub fn get_approvals(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Approvals)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_owners(env: Env) -> Option<Vec<Address>> {
        env.storage().instance().get(&DataKey::Owners)
    }

    pub fn get_threshold(env: Env) -> Option<u32> {
        env.storage().instance().get(&DataKey::Threshold)
    }

    pub fn get_delay(env: Env) -> Option<u64> {
        env.storage().instance().get(&DataKey::Delay)
    }
}

#[cfg(test)]
mod test;
