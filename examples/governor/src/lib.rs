#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Bytes, Env, String,
    Symbol, Vec,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASIS_POINTS: u128 = 10_000;

// ---------------------------------------------------------------------------
// Data Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernorConfig {
    pub admin: Address,
    pub voting_period: u64,
    pub voting_delay: u64,
    pub quorum: i128,
    pub proposal_threshold: i128,
    pub approval_threshold_bps: u32,
    pub timelock_delay: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub proposer: Address,
    pub description: String,
    pub targets: Vec<Address>,
    pub values: Vec<i128>,
    pub calldatas: Vec<Bytes>,
    pub signatures: Vec<Symbol>,
    pub start_block: u64,
    pub end_block: u64,
    pub for_votes: i128,
    pub against_votes: i128,
    pub abstain_votes: i128,
    pub canceled: bool,
    pub queued_at: u64,
    pub executed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalState {
    Pending,
    Active,
    Canceled,
    Defeated,
    Succeeded,
    Queued,
    Executable,
    Expired,
    Executed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Vote {
    For,
    Against,
    Abstain,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct VoteKey {
    pub proposal_id: u32,
    pub voter: Address,
}

#[contracttype]
pub enum DataKey {
    Config,
    ProposalCount,
    Proposal(u32),
    Vote(VoteKey),
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const TOPIC_PROPOSAL_CREATED: Symbol = symbol_short!("PropNew");
const TOPIC_VOTE_CAST: Symbol = symbol_short!("VoteCast");
const TOPIC_PROPOSAL_CANCELED: Symbol = symbol_short!("PropCanc");
const TOPIC_PROPOSAL_QUEUED: Symbol = symbol_short!("PropQue");
const TOPIC_PROPOSAL_EXECUTED: Symbol = symbol_short!("PropExec");

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GovernorError {
    AlreadyInitialized = 1,
    InvalidVotingPeriod = 2,
    InvalidQuorum = 3,
    InvalidThreshold = 4,
    InvalidApprovalThreshold = 5,
    ProposalNotFound = 6,
    VotingNotStarted = 7,
    VotingEnded = 8,
    AlreadyVoted = 9,
    ProposalNotSucceeded = 10,
    ProposalNotQueued = 11,
    ProposalAlreadyExecuted = 12,
    CannotCancel = 13,
    ProposalAlreadyCanceled = 14,
    ArrayLengthMismatch = 15,
    TimelockNotElapsed = 16,
}

// ---------------------------------------------------------------------------
// Governor Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct Governor;

#[contractimpl]
impl Governor {
    /// Initialize the Governor with governance parameters.
    pub fn initialize(
        env: Env,
        admin: Address,
        voting_period: u64,
        voting_delay: u64,
        quorum: i128,
        proposal_threshold: i128,
        approval_threshold_bps: u32,
        timelock_delay: u64,
    ) -> Result<(), GovernorError> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(GovernorError::AlreadyInitialized);
        }

        admin.require_auth();

        if voting_period == 0 {
            return Err(GovernorError::InvalidVotingPeriod);
        }
        if quorum < 0 {
            return Err(GovernorError::InvalidQuorum);
        }
        if proposal_threshold < 0 {
            return Err(GovernorError::InvalidThreshold);
        }
        if approval_threshold_bps > BASIS_POINTS as u32 {
            return Err(GovernorError::InvalidApprovalThreshold);
        }

        env.storage().instance().set(
            &DataKey::Config,
            &GovernorConfig {
                admin,
                voting_period,
                voting_delay,
                quorum,
                proposal_threshold,
                approval_threshold_bps,
                timelock_delay,
            },
        );

        env.storage().instance().set(&DataKey::ProposalCount, &0u32);

        Ok(())
    }

    /// Propose a set of actions. Returns the proposal ID.
    pub fn propose(
        env: Env,
        proposer: Address,
        description: String,
        targets: Vec<Address>,
        values: Vec<i128>,
        calldatas: Vec<Bytes>,
        signatures: Vec<Symbol>,
    ) -> Result<u32, GovernorError> {
        proposer.require_auth();

        let config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        if targets.len() == 0 {
            return Err(GovernorError::ArrayLengthMismatch);
        }
        if targets.len() != values.len()
            || targets.len() != calldatas.len()
            || targets.len() != signatures.len()
        {
            return Err(GovernorError::ArrayLengthMismatch);
        }

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let id = count + 1;
        let current_block = env.ledger().sequence() as u64;

        let proposal = Proposal {
            id,
            proposer,
            description,
            targets,
            values,
            calldatas,
            signatures,
            start_block: current_block + config.voting_delay,
            end_block: current_block + config.voting_delay + config.voting_period,
            for_votes: 0,
            against_votes: 0,
            abstain_votes: 0,
            canceled: false,
            queued_at: 0,
            executed: false,
        };

        env.storage().instance().set(&DataKey::ProposalCount, &id);
        env.storage()
            .instance()
            .set(&DataKey::Proposal(id), &proposal);

        env.events()
            .publish((TOPIC_PROPOSAL_CREATED,), (id, &proposal.proposer));

        Ok(id)
    }

    /// Cast a vote on a proposal. Each address can vote once per proposal.
    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u32,
        support: Vote,
    ) -> Result<(), GovernorError> {
        voter.require_auth();

        let _config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)?;

        if proposal.canceled {
            return Err(GovernorError::ProposalAlreadyCanceled);
        }

        let current_block = env.ledger().sequence() as u64;

        if current_block < proposal.start_block {
            return Err(GovernorError::VotingNotStarted);
        }
        if current_block > proposal.end_block {
            return Err(GovernorError::VotingEnded);
        }

        let vote_key = VoteKey {
            proposal_id,
            voter: voter.clone(),
        };
        if env.storage().instance().has(&DataKey::Vote(vote_key.clone())) {
            return Err(GovernorError::AlreadyVoted);
        }

        env.storage().instance().set(&DataKey::Vote(vote_key), &support);

        match support {
            Vote::For => proposal.for_votes += 1,
            Vote::Against => proposal.against_votes += 1,
            Vote::Abstain => proposal.abstain_votes += 1,
        }

        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((TOPIC_VOTE_CAST,), (proposal_id, &voter, support));

        Ok(())
    }

    /// Cancel a proposal. Only the proposer or admin can cancel.
    pub fn cancel(env: Env, caller: Address, proposal_id: u32) -> Result<(), GovernorError> {
        caller.require_auth();

        let config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)?;

        if proposal.executed {
            return Err(GovernorError::ProposalAlreadyExecuted);
        }
        if proposal.canceled {
            return Err(GovernorError::ProposalAlreadyCanceled);
        }

        if caller != proposal.proposer && caller != config.admin {
            return Err(GovernorError::CannotCancel);
        }

        proposal.canceled = true;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((TOPIC_PROPOSAL_CANCELED,), proposal_id);

        Ok(())
    }

    /// Queue a succeeded proposal for timelocked execution.
    pub fn queue(env: Env, proposal_id: u32) -> Result<(), GovernorError> {
        let config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)?;

        let state = Self::state(env.clone(), proposal_id)?;
        if state != ProposalState::Succeeded {
            return Err(GovernorError::ProposalNotSucceeded);
        }

        proposal.queued_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((TOPIC_PROPOSAL_QUEUED,), proposal_id);

        Ok(())
    }

    /// Execute a queued proposal after the timelock delay.
    pub fn execute(env: Env, proposal_id: u32) -> Result<(), GovernorError> {
        let _config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)?;

        if proposal.executed {
            return Err(GovernorError::ProposalAlreadyExecuted);
        }

        let state = Self::state(env.clone(), proposal_id)?;
        if state != ProposalState::Executable {
            return Err(GovernorError::TimelockNotElapsed);
        }

        // Execute each action
        for i in 0..proposal.targets.len() {
            let _target = proposal.targets.get(i).unwrap();
            let _value = proposal.values.get(i).unwrap();
            let _calldata = proposal.calldatas.get(i).unwrap();
            let _signature = proposal.signatures.get(i).unwrap();

            // Record execution (in a real implementation, this would invoke the target)
            env.storage()
                .instance()
                .set(&("executed", proposal_id, i), &true);
        }

        proposal.executed = true;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((TOPIC_PROPOSAL_EXECUTED,), proposal_id);

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Read-Only Queries
    // -----------------------------------------------------------------------

    /// Get the current state of a proposal.
    pub fn state(env: Env, proposal_id: u32) -> Result<ProposalState, GovernorError> {
        let proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)?;

        let config: GovernorConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)?;

        if proposal.canceled {
            return Ok(ProposalState::Canceled);
        }

        if proposal.executed {
            return Ok(ProposalState::Executed);
        }

        let current_block = env.ledger().sequence() as u64;

        if current_block < proposal.start_block {
            return Ok(ProposalState::Pending);
        }

        if current_block <= proposal.end_block {
            return Ok(ProposalState::Active);
        }

        // Voting ended - check results
        let total_votes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;

        if total_votes < config.quorum {
            return Ok(ProposalState::Defeated);
        }

        let for_bps = (proposal.for_votes as u128)
            .saturating_mul(BASIS_POINTS)
            / total_votes as u128;

        if for_bps < config.approval_threshold_bps as u128 {
            return Ok(ProposalState::Defeated);
        }

        // Proposal succeeded - check timelock
        if proposal.queued_at > 0 {
            let now = env.ledger().timestamp();
            if now >= proposal.queued_at + config.timelock_delay {
                return Ok(ProposalState::Executable);
            }
            return Ok(ProposalState::Queued);
        }

        Ok(ProposalState::Succeeded)
    }

    /// Get proposal details.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, GovernorError> {
        env.storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(GovernorError::ProposalNotFound)
    }

    /// Get governance configuration.
    pub fn get_config(env: Env) -> Result<GovernorConfig, GovernorError> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(GovernorError::ProposalNotFound)
    }

    /// Check if an address has voted on a proposal.
    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        let key = VoteKey { proposal_id, voter };
        env.storage().instance().has(&DataKey::Vote(key))
    }

    /// Get how an address voted.
    pub fn get_vote(env: Env, proposal_id: u32, voter: Address) -> Option<Vote> {
        let key = VoteKey { proposal_id, voter };
        env.storage().instance().get(&DataKey::Vote(key))
    }

    /// Return the earliest timestamp at which a queued proposal can be executed.
    pub fn executable_at(env: Env, proposal_id: u32) -> u64 {
        let config: GovernorConfig = match env.storage().instance().get(&DataKey::Config) {
            Some(c) => c,
            None => return 0,
        };
        let proposal: Proposal = match env.storage().instance().get(&DataKey::Proposal(proposal_id))
        {
            Some(p) => p,
            None => return 0,
        };

        if proposal.executed || proposal.canceled || proposal.queued_at == 0 {
            return 0;
        }
        proposal.queued_at.saturating_add(config.timelock_delay)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as AddressTestUtils, Ledger};
    use soroban_sdk::{vec, Env, String};

    fn setup_governance(env: &Env) -> (Address, GovernorClient<'static>) {
        env.mock_all_auths();

        let admin = Address::generate(env);

        let governor_id = env.register(Governor, ());
        let governor = GovernorClient::new(env, &governor_id);

        governor.initialize(
            &admin,
            &7200,  // voting_period: 2 hours
            &100,   // voting_delay: 100 blocks
            &3,     // quorum: 3 votes
            &1,     // proposal_threshold: 1 token
            &5000,  // approval_threshold_bps: 50%
            &3600,  // timelock_delay: 1 hour
        );

        (admin, governor)
    }

    fn create_proposal(env: &Env, governor: &GovernorClient<'static>, proposer: &Address) -> u32 {
        let target = Address::generate(env);
        let targets = vec![env, target.clone()];
        let values = vec![env, 0i128];
        let calldatas = vec![env, Bytes::from_array(env, &[1, 2, 3])];
        let signatures = vec![env, symbol_short!("execute")];

        governor.propose(
            proposer,
            &String::from_str(env, "Test proposal"),
            &targets,
            &values,
            &calldatas,
            &signatures,
        )
    }

    // -----------------------------------------------------------------------
    // Initialization Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);
        let config = governor.get_config();

        assert_eq!(config.voting_period, 7200);
        assert_eq!(config.voting_delay, 100);
        assert_eq!(config.quorum, 3);
        assert_eq!(config.proposal_threshold, 1);
        assert_eq!(config.approval_threshold_bps, 5000);
        assert_eq!(config.timelock_delay, 3600);
    }

    #[test]
    fn test_double_initialize_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let governor_id = env.register(Governor, ());
        let governor = GovernorClient::new(&env, &governor_id);

        governor.initialize(&admin, &7200, &100, &3, &1, &5000, &3600);

        let result = governor.try_initialize(&admin, &7200, &100, &3, &1, &5000, &3600);

        assert_eq!(result, Err(Ok(GovernorError::AlreadyInitialized)));
    }

    #[test]
    fn test_initialize_zero_voting_period_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let governor_id = env.register(Governor, ());
        let governor = GovernorClient::new(&env, &governor_id);

        let result = governor.try_initialize(&admin, &0, &100, &3, &1, &5000, &3600);

        assert_eq!(result, Err(Ok(GovernorError::InvalidVotingPeriod)));
    }

    // -----------------------------------------------------------------------
    // Proposal Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_create_proposal() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        assert_eq!(id, 1);

        let proposal = governor.get_proposal(&id);
        assert_eq!(proposal.proposer, proposer);
        assert_eq!(proposal.description, String::from_str(&env, "Test proposal"));
        assert_eq!(proposal.for_votes, 0);
        assert_eq!(proposal.against_votes, 0);
        assert_eq!(proposal.abstain_votes, 0);
        assert!(!proposal.canceled);
        assert_eq!(proposal.queued_at, 0);
        assert!(!proposal.executed);
    }

    #[test]
    fn test_proposal_ids_increment() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id1 = create_proposal(&env, &governor, &proposer);
        let id2 = create_proposal(&env, &governor, &proposer);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
    }

    #[test]
    fn test_proposal_initial_state_is_pending() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Pending);
    }

    // -----------------------------------------------------------------------
    // Voting Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_cast_vote() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        // Advance to voting period
        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::For);

        let proposal = governor.get_proposal(&id);
        assert_eq!(proposal.for_votes, 1);
        assert_eq!(proposal.against_votes, 0);
    }

    #[test]
    fn test_vote_against() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::Against);

        let proposal = governor.get_proposal(&id);
        assert_eq!(proposal.for_votes, 0);
        assert_eq!(proposal.against_votes, 1);
    }

    #[test]
    fn test_vote_abstain() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::Abstain);

        let proposal = governor.get_proposal(&id);
        assert_eq!(proposal.abstain_votes, 1);
    }

    #[test]
    fn test_double_vote_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::For);

        let result = governor.try_cast_vote(&voter, &id, &Vote::Against);
        assert_eq!(result, Err(Ok(GovernorError::AlreadyVoted)));
    }

    #[test]
    fn test_vote_before_start_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let voter = Address::generate(&env);
        let result = governor.try_cast_vote(&voter, &id, &Vote::For);

        assert_eq!(result, Err(Ok(GovernorError::VotingNotStarted)));
    }

    #[test]
    fn test_vote_after_end_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
        });

        let voter = Address::generate(&env);
        let result = governor.try_cast_vote(&voter, &id, &Vote::For);

        assert_eq!(result, Err(Ok(GovernorError::VotingEnded)));
    }

    #[test]
    fn test_has_voted() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let voter = Address::generate(&env);
        assert!(!governor.has_voted(&id, &voter));

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        governor.cast_vote(&voter, &id, &Vote::For);
        assert!(governor.has_voted(&id, &voter));
    }

    #[test]
    fn test_get_vote() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let voter = Address::generate(&env);
        assert_eq!(governor.get_vote(&id, &voter), None);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        governor.cast_vote(&voter, &id, &Vote::For);
        assert_eq!(governor.get_vote(&id, &voter), Some(Vote::For));
    }

    // -----------------------------------------------------------------------
    // Proposal State Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_state_active_during_voting() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Active);
    }

    #[test]
    fn test_state_defeated_no_quorum() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let voter = Address::generate(&env);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        governor.cast_vote(&voter, &id, &Vote::For);

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
        });

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Defeated);
    }

    #[test]
    fn test_state_defeated_insufficient_approval() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        for _ in 0..2 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }
        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::Against);
        }

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
        });

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Defeated);
    }

    #[test]
    fn test_state_succeeded() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }
        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::Against);

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
        });

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Succeeded);
    }

    // -----------------------------------------------------------------------
    // Cancel Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_cancel_by_proposer() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        governor.cancel(&proposer, &id);

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Canceled);
    }

    #[test]
    fn test_cancel_unauthorized_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        let random = Address::generate(&env);
        let result = governor.try_cancel(&random, &id);

        assert_eq!(result, Err(Ok(GovernorError::CannotCancel)));
    }

    #[test]
    fn test_vote_on_canceled_proposal_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        governor.cancel(&proposer, &id);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        let result = governor.try_cast_vote(&voter, &id, &Vote::For);

        assert_eq!(result, Err(Ok(GovernorError::ProposalAlreadyCanceled)));
    }

    // -----------------------------------------------------------------------
    // Queue and Execute Tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_queue_succeeded_proposal() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
            li.timestamp = 50000;
        });

        assert_eq!(governor.state(&id), ProposalState::Succeeded);

        governor.queue(&id);

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Queued);
    }

    #[test]
    fn test_queue_defeated_proposal_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        let voter = Address::generate(&env);
        governor.cast_vote(&voter, &id, &Vote::Against);

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
        });

        assert_eq!(governor.state(&id), ProposalState::Defeated);

        let result = governor.try_queue(&id);
        assert_eq!(result, Err(Ok(GovernorError::ProposalNotSucceeded)));
    }

    #[test]
    fn test_execute_queued_proposal() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
            li.timestamp = 50000;
        });

        governor.queue(&id);

        // Advance past timelock delay
        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        governor.execute(&id);

        let state = governor.state(&id);
        assert_eq!(state, ProposalState::Executed);
    }

    #[test]
    fn test_execute_before_timelock_fails() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);
        let id = create_proposal(&env, &governor, &proposer);

        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });

        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }

        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
            li.timestamp = 50000;
        });

        governor.queue(&id);

        // Don't advance time - timelock hasn't elapsed
        let result = governor.try_execute(&id);
        assert_eq!(result, Err(Ok(GovernorError::TimelockNotElapsed)));
    }

    // -----------------------------------------------------------------------
    // Full Governance Flow
    // -----------------------------------------------------------------------

    #[test]
    fn test_full_governance_flow() {
        let env = Env::default();
        let (_admin, governor) = setup_governance(&env);

        let proposer = Address::generate(&env);

        // 1. Create proposal
        let id = create_proposal(&env, &governor, &proposer);
        assert_eq!(governor.state(&id), ProposalState::Pending);

        // 2. Advance to voting period
        env.ledger().with_mut(|li| {
            li.sequence_number = 150;
        });
        assert_eq!(governor.state(&id), ProposalState::Active);

        // 3. Vote
        for _ in 0..3 {
            let voter = Address::generate(&env);
            governor.cast_vote(&voter, &id, &Vote::For);
        }

        // 4. Advance past voting period
        env.ledger().with_mut(|li| {
            li.sequence_number = 10000;
            li.timestamp = 50000;
        });
        assert_eq!(governor.state(&id), ProposalState::Succeeded);

        // 5. Queue
        governor.queue(&id);
        assert_eq!(governor.state(&id), ProposalState::Queued);

        // 6. Advance past timelock
        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        assert_eq!(governor.state(&id), ProposalState::Executable);

        // 7. Execute
        governor.execute(&id);
        assert_eq!(governor.state(&id), ProposalState::Executed);
    }
}
