#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Val, Vec,
};

const BASIS_POINTS: u128 = 10_000;

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DaoConfig {
    pub admin: Address,
    pub voting_period: u64,
    pub quorum: i128,
    pub approval_threshold_bps: u32,
    pub timelock_delay: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Action {
    pub target: Address,
    pub function: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub creator: Address,
    pub description: String,
    pub actions: Vec<Action>,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub executed: bool,
    pub cancelled: bool,
    pub queued_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalState {
    Active,
    Passed,
    Queued,
    Executable,
    Executed,
    Rejected,
    Cancelled,
}

// ---------------------------------------------------------------------------
// Storage keys
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
// Event topics
// ---------------------------------------------------------------------------

const TOPIC_PROPOSAL_CREATED: Symbol = symbol_short!("new_prop");
const TOPIC_VOTE_CAST: Symbol = symbol_short!("vote");
const TOPIC_PROPOSAL_QUEUED: Symbol = symbol_short!("queue");
const TOPIC_PROPOSAL_EXECUTED: Symbol = symbol_short!("execute");
const TOPIC_PROPOSAL_CANCELLED: Symbol = symbol_short!("cancel");

// ---------------------------------------------------------------------------
// DAO contract
// ---------------------------------------------------------------------------

#[contract]
pub struct SimpleDao;

#[contractimpl]
impl SimpleDao {
    /// Initialise the DAO with governance parameters.
    /// Can only be called once by the admin.
    pub fn initialize(
        env: Env,
        admin: Address,
        voting_period: u64,
        quorum: i128,
        approval_threshold_bps: u32,
        timelock_delay: u64,
    ) {
        assert!(
            !env.storage().instance().has(&DataKey::Config),
            "already initialized"
        );

        admin.require_auth();
        assert!(voting_period > 0, "voting_period must be > 0");
        assert!(quorum >= 0, "quorum must be >= 0");
        assert!(
            approval_threshold_bps <= BASIS_POINTS as u32,
            "approval_threshold_bps must be <= 10000"
        );

        env.storage().instance().set(
            &DataKey::Config,
            &DaoConfig {
                admin,
                voting_period,
                quorum,
                approval_threshold_bps,
                timelock_delay,
            },
        );
    }

    /// Submit a new proposal. The `proposer` must authorise the submission.
    /// Returns the unique proposal ID.
    pub fn submit_proposal(
        env: Env,
        proposer: Address,
        description: String,
        actions: Vec<Action>,
    ) -> u32 {
        proposer.require_auth();
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");

        assert!(actions.len() > 0, "must include at least one action");

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let id = count + 1;
        let now = env.ledger().timestamp();

        let proposal = Proposal {
            id,
            creator: proposer,
            description,
            actions,
            yes_votes: 0,
            no_votes: 0,
            start_time: now,
            end_time: now + config.voting_period,
            executed: false,
            cancelled: false,
            queued_at: 0,
        };

        env.storage().instance().set(&DataKey::ProposalCount, &id);
        env.storage()
            .instance()
            .set(&DataKey::Proposal(id), &proposal);
        env.events().publish((TOPIC_PROPOSAL_CREATED,), id);

        id
    }

    /// Cast a vote on an active proposal. Each address may vote once per
    /// proposal. The `voter` must authorise the call.
    pub fn vote(env: Env, voter: Address, proposal_id: u32, approve: bool) {
        voter.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        assert!(!proposal.cancelled, "proposal already cancelled");
        assert!(!proposal.executed, "proposal already executed");

        let now = env.ledger().timestamp();
        assert!(now <= proposal.end_time, "voting period has ended");

        let vote_key = VoteKey {
            proposal_id,
            voter: voter.clone(),
        };
        assert!(
            !env.storage()
                .instance()
                .has(&DataKey::Vote(vote_key.clone())),
            "already voted"
        );

        env.storage()
            .instance()
            .set(&DataKey::Vote(vote_key), &approve);

        if approve {
            proposal.yes_votes += 1;
        } else {
            proposal.no_votes += 1;
        }

        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.events()
            .publish((TOPIC_VOTE_CAST, proposal_id, approve), ());
    }

    /// Queue a proposal that has passed voting for timelocked execution.
    /// Records the current timestamp so the timelock delay can be enforced
    /// before execution.  May be called by anyone.
    pub fn queue_proposal(env: Env, proposal_id: u32) {
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        config.admin.require_auth();
        assert!(!proposal.cancelled, "proposal already cancelled");
        assert!(
            proposal.queued_at == 0,
            "proposal already queued"
        );

        let state = proposal.current_state(&config, env.ledger().timestamp());
        assert_eq!(
            state,
            ProposalState::Passed,
            "proposal is not in Passed state"
        );

        proposal.queued_at = env.ledger().timestamp();
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.events()
            .publish((TOPIC_PROPOSAL_QUEUED,), proposal_id);
    }

    /// Execute a proposal whose timelock has elapsed.  Iterates through
    /// the proposal's actions and invokes each target contract.  May be
    /// called by anyone once the delay has passed.
    pub fn execute_proposal(env: Env, proposal_id: u32) {
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        config.admin.require_auth();
        assert!(!proposal.executed, "already executed");
        assert!(!proposal.cancelled, "proposal already cancelled");

        let state = proposal.current_state(&config, env.ledger().timestamp());
        assert_eq!(
            state,
            ProposalState::Executable,
            "proposal is not executable — must be queued and timelock must have elapsed"
        );

        for action in proposal.actions.iter() {
            let _: Val = env.invoke_contract(&action.target, &action.function, Vec::new(&env));
        }

        proposal.executed = true;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.events()
            .publish((TOPIC_PROPOSAL_EXECUTED,), proposal_id);
    }

    /// Cancel a proposal before it is executed.  Only the DAO admin or
    /// the original proposal creator may cancel.  This acts as a safety
    /// valve: if a malicious proposal passes voting, the admin can
    /// cancel it during the timelock period before execution.
    pub fn cancel_proposal(env: Env, caller: Address, proposal_id: u32) {
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        assert!(!proposal.executed, "proposal already executed");
        assert!(!proposal.cancelled, "proposal already cancelled");

        // Only the admin or the original creator may cancel.
        if caller != config.admin && caller != proposal.creator {
            panic!("only admin or creator can cancel");
        }
        caller.require_auth();

        proposal.cancelled = true;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.events()
            .publish((TOPIC_PROPOSAL_CANCELLED,), proposal_id);
    }

    // -----------------------------------------------------------------------
    // Read-only queries
    // -----------------------------------------------------------------------

    /// Return the DAO governance configuration.
    pub fn get_config(env: Env) -> DaoConfig {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized")
    }

    /// Return the full proposal record.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found")
    }

    /// Compute the current lifecycle state of a proposal.
    pub fn proposal_state(env: Env, proposal_id: u32) -> ProposalState {
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");
        let proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");
        proposal.current_state(&config, env.ledger().timestamp())
    }

    /// Return true if `voter` has already cast a vote on the given proposal.
    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        let key = VoteKey { proposal_id, voter };
        env.storage().instance().has(&DataKey::Vote(key))
    }

    /// Return the earliest timestamp at which a queued proposal can be
    /// executed, or 0 if the proposal has not been queued, has been
    /// cancelled, or has already been executed.
    pub fn executable_at(env: Env, proposal_id: u32) -> u64 {
        let config: DaoConfig = env
            .storage()
            .instance()
            .get(&DataKey::Config)
            .expect("not initialized");
        let proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        if proposal.executed || proposal.cancelled || proposal.queued_at == 0 {
            return 0;
        }
        proposal.queued_at.saturating_add(config.timelock_delay)
    }
}

// ---------------------------------------------------------------------------
// Proposal state machine
// ---------------------------------------------------------------------------

impl Proposal {
    fn current_state(&self, config: &DaoConfig, now: u64) -> ProposalState {
        if self.cancelled {
            return ProposalState::Cancelled;
        }
        if self.executed {
            return ProposalState::Executed;
        }
        if self.queued_at > 0 {
            if now >= self.queued_at + config.timelock_delay {
                return ProposalState::Executable;
            }
            return ProposalState::Queued;
        }
        if now <= self.end_time {
            return ProposalState::Active;
        }
        let total = self.yes_votes + self.no_votes;
        if total == 0 {
            return ProposalState::Rejected;
        }
        if total < config.quorum {
            return ProposalState::Rejected;
        }
        let yes_bps = (self.yes_votes as u128).saturating_mul(BASIS_POINTS) / total as u128;
        if yes_bps >= config.approval_threshold_bps as u128 {
            ProposalState::Passed
        } else {
            ProposalState::Rejected
        }
    }
}

// ---------------------------------------------------------------------------
// Mock target contract (used by integration tests)
// ---------------------------------------------------------------------------

#[doc(hidden)]
#[contract]
pub struct MockTarget;

#[doc(hidden)]
#[contractimpl]
impl MockTarget {
    pub fn action(env: Env) {
        env.storage().instance().set(&"executed", &true);
    }

    pub fn set_val(env: Env, val: i128) {
        env.storage().instance().set(&"executed", &val);
    }

    pub fn was_executed(env: Env) -> bool {
        env.storage().instance().get(&"executed").unwrap_or(false)
    }

    pub fn get_executed_val(env: Env) -> i128 {
        env.storage().instance().get(&"executed").unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as AddressTestUtils, Ledger};
    use soroban_sdk::{symbol_short, vec, Address, Env, String, Vec};

    struct DaoTest {
        admin: Address,
        dao: SimpleDaoClient<'static>,
    }

    fn setup_dao(env: &Env) -> DaoTest {
        let admin = Address::generate(env);
        let voting_period: u64 = 3600;
        let quorum: i128 = 3;
        let approval_threshold_bps: u32 = 5000;
        let timelock_delay: u64 = 3600;

        env.mock_all_auths();
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(env, &dao_id);

        dao.initialize(
            &admin,
            &voting_period,
            &quorum,
            &approval_threshold_bps,
            &timelock_delay,
        );

        DaoTest { admin, dao }
    }

    fn register_mock(env: &Env) -> Address {
        env.register(MockTarget, ())
    }

    fn make_action(env: &Env, target: &Address) -> Action {
        Action {
            target: target.clone(),
            function: symbol_short!("action"),
        }
    }

    fn one_action_vec(env: &Env, target: &Address) -> Vec<Action> {
        vec![env, make_action(env, target)]
    }

    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    #[test]
    fn test_initialize() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);

        dao.initialize(&admin, &3600, &3, &5000, &3600);

        let config = dao.get_config();
        assert_eq!(config.admin, admin);
        assert_eq!(config.voting_period, 3600);
        assert_eq!(config.quorum, 3);
        assert_eq!(config.approval_threshold_bps, 5000);
        assert_eq!(config.timelock_delay, 3600);
    }

    #[test]
    fn test_initialize_zero_timelock_delay() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);

        // Zero timelock is valid — it means immediate execution after queuing.
        dao.initialize(&admin, &3600, &3, &5000, &0);

        let config = dao.get_config();
        assert_eq!(config.timelock_delay, 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);

        dao.initialize(&admin, &3600, &3, &5000, &3600);
        dao.initialize(&admin, &3600, &3, &5000, &3600);
    }

    #[test]
    #[should_panic(expected = "voting_period must be > 0")]
    fn test_initialize_zero_voting_period_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);

        dao.initialize(&admin, &0, &3, &5000, &3600);
    }

    // -----------------------------------------------------------------------
    // Proposal submission
    // -----------------------------------------------------------------------

    #[test]
    fn test_submit_proposal() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let desc = String::from_str(&env, "Test proposal");
        let id = t
            .dao
            .submit_proposal(&proposer, &desc, &one_action_vec(&env, &mock_id));
        assert_eq!(id, 1);

        let proposal = t.dao.get_proposal(&id);
        assert_eq!(proposal.creator, proposer);
        assert_eq!(proposal.description, desc);
        assert_eq!(proposal.yes_votes, 0);
        assert_eq!(proposal.no_votes, 0);
        assert!(!proposal.executed);
        assert!(!proposal.cancelled);
        assert_eq!(proposal.queued_at, 0);
    }

    #[test]
    fn test_submit_proposal_increments_id() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let desc = String::from_str(&env, "P1");
        let actions = one_action_vec(&env, &mock_id);

        let id1 = t.dao.submit_proposal(&proposer, &desc, &actions);
        let id2 = t.dao.submit_proposal(&proposer, &desc, &actions);
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
    }

    #[test]
    #[should_panic(expected = "must include at least one action")]
    fn test_submit_proposal_empty_actions_panics() {
        let env = Env::default();
        let t = setup_dao(&env);

        let empty: Vec<Action> = Vec::new(&env);
        let proposer = Address::generate(&env);
        t.dao
            .submit_proposal(&proposer, &String::from_str(&env, "empty"), &empty);
    }

    // -----------------------------------------------------------------------
    // Voting
    // -----------------------------------------------------------------------

    #[test]
    fn test_vote_yes() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let proposal = t.dao.get_proposal(&id);
        assert_eq!(proposal.yes_votes, 1);
        assert_eq!(proposal.no_votes, 0);
    }

    #[test]
    fn test_vote_no() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &false);
        let proposal = t.dao.get_proposal(&id);
        assert_eq!(proposal.yes_votes, 0);
        assert_eq!(proposal.no_votes, 1);
    }

    #[test]
    #[should_panic(expected = "already voted")]
    fn test_double_vote_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        t.dao.vote(&t.admin, &id, &true);
    }

    #[test]
    fn test_vote_after_deadline_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        let result = t.dao.try_vote(&t.admin, &id, &true);
        assert!(result.is_err());
    }

    #[test]
    fn test_has_voted() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        assert!(!t.dao.has_voted(&id, &t.admin));
        t.dao.vote(&t.admin, &id, &true);
        assert!(t.dao.has_voted(&id, &t.admin));
    }

    // -----------------------------------------------------------------------
    // Proposal state machine
    // -----------------------------------------------------------------------

    #[test]
    fn test_state_active_while_voting_open() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Active);
    }

    #[test]
    fn test_state_passed_when_threshold_met() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Passed);
    }

    #[test]
    fn test_state_queued_after_queue() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Passed);

        t.dao.queue_proposal(&id);
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Queued);
    }

    #[test]
    fn test_state_rejected_when_quorum_not_met() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Rejected);
    }

    #[test]
    fn test_state_rejected_when_threshold_not_met() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &false);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &false);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Rejected);
    }

    #[test]
    fn test_state_rejected_when_no_votes() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Rejected);
    }

    // -----------------------------------------------------------------------
    // Queue
    // -----------------------------------------------------------------------

    #[test]
    fn test_queue_proposal_stores_timestamp() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        // Advance to a known timestamp
        env.ledger().with_mut(|li| {
            li.timestamp = 100_000;
        });

        t.dao.queue_proposal(&id);
        let proposal = t.dao.get_proposal(&id);
        assert_eq!(proposal.queued_at, 100_000);

        let executable = t.dao.executable_at(&id);
        assert_eq!(executable, 100_000 + 3600 /* timelock_delay */);
    }

    #[test]
    #[should_panic(expected = "proposal is not in Passed state")]
    fn test_queue_rejected_proposal_panics() {
        let env = Env::default();
        let t = setup_dao(&env);

        let mock_id = register_mock(&env);
        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "fail"),
            &one_action_vec(&env, &mock_id),
        );

        // No votes, so it'll be rejected after voting period
        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        t.dao.queue_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "proposal already queued")]
    fn test_double_queue_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        t.dao.queue_proposal(&id);
        t.dao.queue_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "proposal is not in Passed state")]
    fn test_queue_active_proposal_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        // Still active, cannot queue
        t.dao.queue_proposal(&id);
    }

    // -----------------------------------------------------------------------
    // Execution (updated for timelock flow)
    // -----------------------------------------------------------------------

    #[test]
    fn test_execute_proposal_calls_target() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "exec"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        // Advance past voting period
        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(dao.proposal_state(&id), ProposalState::Passed);
        assert!(!mock.was_executed());

        // Queue and wait for timelock
        dao.queue_proposal(&id);
        assert_eq!(dao.proposal_state(&id), ProposalState::Queued);

        env.ledger().with_mut(|li| {
            li.timestamp += 3600; // timelock_delay
        });

        dao.execute_proposal(&id);

        assert!(mock.was_executed());

        let proposal = dao.get_proposal(&id);
        assert!(proposal.executed);
        assert_eq!(dao.proposal_state(&id), ProposalState::Executed);
    }

    #[test]
    fn test_execute_proposal_multiple_actions() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        // Two actions calling the same mock with different no-arg functions
        let actions = vec![
            &env,
            Action {
                target: mock_id.clone(),
                function: symbol_short!("action"),
            },
            Action {
                target: mock_id,
                function: symbol_short!("action"),
            },
        ];

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(&proposer, &String::from_str(&env, "multi"), &actions);
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert!(!mock.was_executed());
        dao.queue_proposal(&id);

        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        dao.execute_proposal(&id);
        assert!(mock.was_executed());
    }

    #[test]
    #[should_panic(expected = "proposal is not executable")]
    fn test_execute_rejected_proposal_panics() {
        let env = Env::default();
        let t = setup_dao(&env);

        let mock_id = register_mock(&env);
        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "fail"),
            &one_action_vec(&env, &mock_id),
        );

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        t.dao.execute_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "proposal is not executable")]
    fn test_execute_passed_not_queued_panics() {
        let env = Env::default();
        let t = setup_dao(&env);

        let mock_id = register_mock(&env);
        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "exec"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        // Passed but not queued — should panic
        t.dao.execute_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "proposal is not executable")]
    fn test_execute_before_timelock_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "exec"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        t.dao.queue_proposal(&id);

        // Only advance halfway through the timelock
        env.ledger().with_mut(|li| {
            li.timestamp += 1800; // 1800 < 3600 timelock_delay
        });

        t.dao.execute_proposal(&id);
    }

    #[test]
    fn test_execute_at_timelock_boundary() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "exec"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        dao.queue_proposal(&id);

        // Advance exactly to the timelock boundary
        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        // Should succeed — boundary is inclusive
        dao.execute_proposal(&id);
        assert!(mock.was_executed());
    }

    #[test]
    fn test_execute_with_zero_timelock() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        // Zero timelock — execute immediately after queuing
        dao.initialize(&admin, &3600, &1, &5000, &0);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "exec"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        dao.queue_proposal(&id);
        // No time advance needed — timelock is 0
        dao.execute_proposal(&id);
        assert!(mock.was_executed());
    }

    #[test]
    #[should_panic(expected = "already executed")]
    fn test_double_execute_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "double"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        dao.queue_proposal(&id);

        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        dao.execute_proposal(&id);
        dao.execute_proposal(&id);
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    #[test]
    fn test_full_dao_scenario_persists_events() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "evt"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(dao.proposal_state(&id), ProposalState::Passed);
        assert!(!mock.was_executed());
        dao.queue_proposal(&id);

        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        dao.execute_proposal(&id);
        assert!(mock.was_executed());
    }

    #[test]
    fn test_full_dao_scenario() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);
        let mock = MockTargetClient::new(&env, &mock_id);

        dao.initialize(&admin, &3600, &3, &5000, &3600);

        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        let id = dao.submit_proposal(
            &alice,
            &String::from_str(&env, "Call mock contract"),
            &one_action_vec(&env, &mock_id),
        );
        assert_eq!(id, 1);

        dao.vote(&alice, &id, &true);
        dao.vote(&bob, &id, &true);
        dao.vote(&carol, &id, &true);

        assert_eq!(dao.proposal_state(&id), ProposalState::Active);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(dao.proposal_state(&id), ProposalState::Passed);

        // Queue and wait for timelock
        dao.queue_proposal(&id);
        assert_eq!(dao.proposal_state(&id), ProposalState::Queued);

        assert!(!mock.was_executed());

        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        dao.execute_proposal(&id);
        assert!(mock.was_executed());

        assert_eq!(dao.proposal_state(&id), ProposalState::Executed);
    }

    // -----------------------------------------------------------------------
    // State transitions — Executable
    // -----------------------------------------------------------------------

    #[test]
    fn test_state_executable_after_timelock() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        // Passed but not yet queued
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Passed);

        t.dao.queue_proposal(&id);
        // Queued before timelock expires
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Queued);

        // Advance past the timelock
        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        // Now it should be Executable
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Executable);
    }

    // -----------------------------------------------------------------------
    // Cancel
    // -----------------------------------------------------------------------

    #[test]
    fn test_cancel_by_admin() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.cancel_proposal(&t.admin, &id);

        let proposal = t.dao.get_proposal(&id);
        assert!(proposal.cancelled);
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Cancelled);
        assert_eq!(t.dao.executable_at(&id), 0);
    }

    #[test]
    fn test_cancel_by_creator() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        // Creator cancels their own proposal
        t.dao.cancel_proposal(&proposer, &id);

        let proposal = t.dao.get_proposal(&id);
        assert!(proposal.cancelled);
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Cancelled);
    }

    #[test]
    #[should_panic(expected = "only admin or creator can cancel")]
    fn test_cancel_unauthorized_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        let random = Address::generate(&env);
        t.dao.cancel_proposal(&random, &id);
    }

    #[test]
    #[should_panic(expected = "proposal already executed")]
    fn test_cancel_executed_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let dao_id = env.register(SimpleDao, ());
        let dao = SimpleDaoClient::new(&env, &dao_id);
        let mock_id = register_mock(&env);

        dao.initialize(&admin, &3600, &1, &5000, &3600);

        let proposer = Address::generate(&env);
        let id = dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );
        dao.vote(&admin, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        dao.queue_proposal(&id);

        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        dao.execute_proposal(&id);

        // Cannot cancel an already-executed proposal
        dao.cancel_proposal(&admin, &id);
    }

    #[test]
    #[should_panic(expected = "proposal already cancelled")]
    fn test_cancel_double_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        t.dao.cancel_proposal(&t.admin, &id);
        t.dao.cancel_proposal(&t.admin, &id);
    }

    #[test]
    #[should_panic(expected = "proposal already cancelled")]
    fn test_queue_cancelled_proposal_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        // Vote to pass
        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Passed);

        // Cancel the passed proposal
        t.dao.cancel_proposal(&t.admin, &id);

        // Cannot queue a cancelled proposal
        t.dao.queue_proposal(&id);
    }

    #[test]
    #[should_panic(expected = "proposal already cancelled")]
    fn test_execute_cancelled_proposal_panics() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        // Vote to pass and queue
        t.dao.vote(&t.admin, &id, &true);
        let voter2 = Address::generate(&env);
        t.dao.vote(&voter2, &id, &true);
        let voter3 = Address::generate(&env);
        t.dao.vote(&voter3, &id, &true);

        env.ledger().with_mut(|li| {
            li.timestamp += 7200;
        });

        t.dao.queue_proposal(&id);

        // Cancel the queued proposal
        t.dao.cancel_proposal(&t.admin, &id);

        // Wait for timelock
        env.ledger().with_mut(|li| {
            li.timestamp += 3600;
        });

        // Cannot execute a cancelled proposal
        t.dao.execute_proposal(&id);
    }

    #[test]
    fn test_cancel_during_active_state() {
        let env = Env::default();
        let t = setup_dao(&env);
        let mock_id = register_mock(&env);

        let proposer = Address::generate(&env);
        let id = t.dao.submit_proposal(
            &proposer,
            &String::from_str(&env, "p1"),
            &one_action_vec(&env, &mock_id),
        );

        assert_eq!(t.dao.proposal_state(&id), ProposalState::Active);

        // Admin can cancel even during active voting
        t.dao.cancel_proposal(&t.admin, &id);
        assert_eq!(t.dao.proposal_state(&id), ProposalState::Cancelled);

        // Verify voting is now blocked on the cancelled proposal
        let result = t.dao.try_vote(&t.admin, &id, &true);
        assert!(result.is_err());
    }
}
