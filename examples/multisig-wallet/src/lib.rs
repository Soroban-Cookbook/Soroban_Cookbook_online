#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short,
    token::TokenClient, Address, Env, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum WalletError {
    AlreadyInitialized = 1,
    InvalidThreshold = 2,
    NotAuthorized = 3,
    ProposalNotFound = 4,
    AlreadyApproved = 5,
    AlreadyExecuted = 6,
    ThresholdNotMet = 7,
    InvalidAmount = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferProposal {
    pub token: Address,
    pub to: Address,
    pub amount: i128,
    pub approvals: Vec<Address>,
    pub executed: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Signers,
    Threshold,
    ProposalCount,
    Proposal(u32),
}

const EVENT_DEPOSIT: Symbol = symbol_short!("deposit");
const EVENT_SUBMIT: Symbol = symbol_short!("submit");
const EVENT_APPROVE: Symbol = symbol_short!("approve");
const EVENT_EXECUTE: Symbol = symbol_short!("exec");

#[contract]
pub struct MultisigWallet;

#[contractimpl]
impl MultisigWallet {
    pub fn initialize(env: Env, signers: Vec<Address>, threshold: u32) -> Result<(), WalletError> {
        if env.storage().instance().has(&DataKey::Threshold) {
            return Err(WalletError::AlreadyInitialized);
        }
        if threshold == 0 || threshold > signers.len() {
            return Err(WalletError::InvalidThreshold);
        }
        env.storage().instance().set(&DataKey::Signers, &signers);
        env.storage().instance().set(&DataKey::Threshold, &threshold);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &0u32);
        Ok(())
    }

    pub fn deposit(env: Env, from: Address, token: Address, amount: i128) -> Result<(), WalletError> {
        if amount <= 0 {
            return Err(WalletError::InvalidAmount);
        }
        from.require_auth();
        let wallet = env.current_contract_address();
        TokenClient::new(&env, &token).transfer(&from, &wallet, &amount);
        env.events()
            .publish((EVENT_DEPOSIT, token, from), amount);
        Ok(())
    }

    pub fn submit_transfer(
        env: Env,
        proposer: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) -> Result<u32, WalletError> {
        if amount <= 0 {
            return Err(WalletError::InvalidAmount);
        }
        proposer.require_auth();
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .ok_or(WalletError::NotAuthorized)?;
        if !signers.contains(&proposer) {
            return Err(WalletError::NotAuthorized);
        }
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let proposal_id = count;
        let proposal = TransferProposal {
            token: token.clone(),
            to: to.clone(),
            amount,
            approvals: Vec::new(&env),
            executed: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &(count + 1));
        env.events().publish(
            (EVENT_SUBMIT, proposer, token, to),
            (proposal_id, amount),
        );
        Ok(proposal_id)
    }

    pub fn approve(env: Env, proposal_id: u32, signer: Address) -> Result<(), WalletError> {
        signer.require_auth();
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::Signers)
            .ok_or(WalletError::NotAuthorized)?;
        if !signers.contains(&signer) {
            return Err(WalletError::NotAuthorized);
        }
        let mut proposal: TransferProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(WalletError::ProposalNotFound)?;
        if proposal.executed {
            return Err(WalletError::AlreadyExecuted);
        }
        if proposal.approvals.contains(&signer) {
            return Err(WalletError::AlreadyApproved);
        }
        proposal.approvals.push_back(signer.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.events()
            .publish((EVENT_APPROVE, proposal_id, signer), ());
        Ok(())
    }

    pub fn execute(env: Env, proposal_id: u32) -> Result<(), WalletError> {
        let threshold: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .ok_or(WalletError::NotAuthorized)?;
        let proposal: TransferProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(WalletError::ProposalNotFound)?;
        if proposal.executed {
            return Err(WalletError::AlreadyExecuted);
        }
        if proposal.approvals.len() < threshold {
            return Err(WalletError::ThresholdNotMet);
        }
        let mut updated = proposal.clone();
        updated.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &updated);
        let wallet = env.current_contract_address();
        TokenClient::new(&env, &proposal.token)
            .transfer(&wallet, &proposal.to, &proposal.amount);
        env.events().publish(
            (EVENT_EXECUTE, proposal_id, proposal.token, proposal.to),
            proposal.amount,
        );
        Ok(())
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Option<TransferProposal> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
    }

    pub fn get_balance(env: Env, token: Address) -> i128 {
        let wallet = env.current_contract_address();
        TokenClient::new(&env, &token).balance(&wallet)
    }

    pub fn get_signers(env: Env) -> Option<Vec<Address>> {
        env.storage().instance().get(&DataKey::Signers)
    }

    pub fn get_threshold(env: Env) -> Option<u32> {
        env.storage().instance().get(&DataKey::Threshold)
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
