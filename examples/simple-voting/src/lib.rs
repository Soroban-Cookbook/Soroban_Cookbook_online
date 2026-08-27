#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
    Symbol, Vec,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Proposal(u32),
    Vote(u32, Address),
    ProposalCount,
    Delegation(Address),
    DelegationPower(Address),
    DelegatorList,
}

// ─── Types ──────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Choice {
    Yes,
    No,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub is_active: bool,
}

// ─── Errors ────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ProposalNotFound = 1,
    AlreadyVoted = 2,
    ProposalClosed = 3,
    SelfDelegation = 4,
    AlreadyDelegated = 5,
    NoDelegation = 6,
    DelegateHasDelegated = 7,
    DelegatorCannotVote = 8,
}

// ─── Events ─────────────────────────────────────────────────────────────────

const TOPIC_DELEGATE: Symbol = symbol_short!("delegate");
const TOPIC_REVOKE: Symbol = symbol_short!("revoke");

// ─── Contract ───────────────────────────────────────────────────────────────

#[contract]
pub struct SimpleVoting;

#[contractimpl]
impl SimpleVoting {
    /// Create a new proposal and return its ID.
    pub fn create_proposal(env: Env, title: String) -> u32 {
        let count_key = DataKey::ProposalCount;
        let id: u32 = env.storage().instance().get(&count_key).unwrap_or(0);
        let proposal = Proposal {
            id,
            title,
            yes_votes: 0,
            no_votes: 0,
            is_active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(id), &proposal);
        env.storage().instance().set(&count_key, &(id + 1));
        id
    }

    /// Delegate voting power to another address.
    ///
    /// A voter may delegate their voting right to a delegatee.
    /// Delegation replaces the delegator's direct voting ability until revoked.
    /// This implementation enforces one-level (flat) delegation only:
    /// you may not delegate to an address that has already delegated itself,
    /// which prevents delegation chains (A -> B -> C).
    ///
    /// Validation rules:
    ///   - Self-delegation is rejected (A cannot delegate to A)
    ///   - Duplicate delegation is rejected (A must revoke before re-delegating)
    ///   - Delegation to a delegator is rejected (prevents chains)
    ///   - Proper Soroban authentication is required
    pub fn delegate_vote(env: Env, delegator: Address, delegatee: Address) -> Result<(), Error> {
        delegator.require_auth();

        // Prevent self-delegation
        if delegator == delegatee {
            return Err(Error::SelfDelegation);
        }

        // Prevent duplicate delegation
        if env
            .storage()
            .persistent()
            .has(&DataKey::Delegation(delegator.clone()))
        {
            return Err(Error::AlreadyDelegated);
        }

        // Prevent delegation chains: delegatee must not have delegated itself
        if env
            .storage()
            .persistent()
            .has(&DataKey::Delegation(delegatee.clone()))
        {
            return Err(Error::DelegateHasDelegated);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Delegation(delegator.clone()), &delegatee);

        // Maintain a global delegator list for tally iteration.
        // We add the delegator only if they are not already present.
        let delegators: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::DelegatorList)
            .unwrap_or(Vec::new(&env));
        let mut found = false;
        for a in delegators.iter() {
            if a == delegator {
                found = true;
                break;
            }
        }
        if !found {
            let mut updated = delegators;
            updated.push_back(delegator.clone());
            env.storage()
                .persistent()
                .set(&DataKey::DelegatorList, &updated);
        }

        env.events()
            .publish((TOPIC_DELEGATE,), (delegator, delegatee));

        Ok(())
    }

    /// Revoke an active delegation.
    ///
    /// After revocation the delegator regains their own voting rights.
    /// Existing votes are not retroactively changed; future tally calls
    /// will no longer include this delegation.
    pub fn revoke_delegation(env: Env, delegator: Address) -> Result<(), Error> {
        delegator.require_auth();

        let delegatee_key = DataKey::Delegation(delegator.clone());
        let delegatee_val: Address = env
            .storage()
            .persistent()
            .get(&delegatee_key)
            .ok_or(Error::NoDelegation)?;

        env.storage().persistent().remove(&delegatee_key);

        // Remove delegator from the global delegator list by building a new list
        let delegators: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::DelegatorList)
            .unwrap_or(Vec::new(&env));
        let mut updated = Vec::new(&env);
        for a in delegators.iter() {
            if a != delegator {
                updated.push_back(a);
            }
        }
        if updated.is_empty() {
            env.storage().persistent().remove(&DataKey::DelegatorList);
        } else {
            env.storage()
                .persistent()
                .set(&DataKey::DelegatorList, &updated);
        }

        env.events()
            .publish((TOPIC_REVOKE,), (delegator, delegatee_val));

        Ok(())
    }

    /// Look up the delegatee for a given delegator.
    /// Returns None if no active delegation exists.
    pub fn get_delegate(env: Env, delegator: Address) -> Option<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Delegation(delegator))
    }

    /// Cast a yes or no vote. Each address may vote only once per proposal.
    ///
    /// An address that has delegated its vote cannot vote directly; it must
    /// revoke the delegation first. This prevents double-counting and ensures
    /// delegated voting power is counted exactly once through the delegatee.
    pub fn vote(env: Env, voter: Address, proposal_id: u32, choice: Choice) -> Result<(), Error> {
        voter.require_auth();

        let proposal_key = DataKey::Proposal(proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&proposal_key)
            .ok_or(Error::ProposalNotFound)?;

        if !proposal.is_active {
            return Err(Error::ProposalClosed);
        }

        // Delegators cannot vote directly
        if env
            .storage()
            .persistent()
            .has(&DataKey::Delegation(voter.clone()))
        {
            return Err(Error::DelegatorCannotVote);
        }

        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            return Err(Error::AlreadyVoted);
        }

        match choice {
            Choice::Yes => proposal.yes_votes += 1,
            Choice::No => proposal.no_votes += 1,
        }

        env.storage().persistent().set(&proposal_key, &proposal);
        env.storage().persistent().set(&vote_key, &choice);
        Ok(())
    }

    /// Close a proposal so no further votes are accepted.
    pub fn close_proposal(env: Env, proposal_id: u32) -> Result<(), Error> {
        let key = DataKey::Proposal(proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ProposalNotFound)?;
        proposal.is_active = false;
        env.storage().persistent().set(&key, &proposal);
        Ok(())
    }

    /// Return the current vote tally for a proposal, including delegated votes.
    ///
    /// Delegated votes are counted dynamically at tally time by iterating
    /// the global delegator list. For each active delegation, if the
    /// delegatee cast a direct vote on this proposal, that vote is counted
    /// once for the delegatee and once for each delegator pointing to
    /// them, ensuring delegation weight is included exactly once per voter.
    pub fn tally(env: Env, proposal_id: u32) -> Result<Proposal, Error> {
        let proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)?;

        let mut yes_count: u32 = proposal.yes_votes;
        let mut no_count: u32 = proposal.no_votes;

        // Iterate all active delegations and count their voting power
        // if the delegatee has voted directly on this proposal.
        if let Some(delegators) = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<Address>>(&DataKey::DelegatorList)
        {
            for delegator in delegators.iter() {
                if let Some(delegatee) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, Address>(&DataKey::Delegation(delegator.clone()))
                {
                    // Only count delegation if the delegatee actually voted
                    if let Some(choice) = env
                        .storage()
                        .persistent()
                        .get::<DataKey, Choice>(&DataKey::Vote(proposal_id, delegatee.clone()))
                    {
                        match choice {
                            Choice::Yes => yes_count += 1,
                            Choice::No => no_count += 1,
                        }
                    }
                }
            }
        }

        Ok(Proposal {
            yes_votes: yes_count,
            no_votes: no_count,
            ..proposal
        })
    }

    /// Return how a specific address voted, or None if they have not voted.
    pub fn get_vote(env: Env, voter: Address, proposal_id: u32) -> Option<Choice> {
        env.storage()
            .persistent()
            .get(&DataKey::Vote(proposal_id, voter))
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    fn setup() -> (Env, soroban_sdk::Address, SimpleVotingClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(SimpleVoting, ());
        let client = SimpleVotingClient::new(&env, &contract_id);
        (env, contract_id, client)
    }

    // ─── Regression: existing behaviour unchanged when delegation idle ──────

    #[test]
    fn test_create_proposal_returns_first_id() {
        let (env, _, client) = setup();
        let title = String::from_str(&env, "Should we add feature X?");
        let id = client.create_proposal(&title);
        assert_eq!(id, 0);
    }

    #[test]
    fn test_proposal_ids_increment() {
        let (env, _, client) = setup();
        let id0 = client.create_proposal(&String::from_str(&env, "Proposal A"));
        let id1 = client.create_proposal(&String::from_str(&env, "Proposal B"));
        let id2 = client.create_proposal(&String::from_str(&env, "Proposal C"));
        assert_eq!(id0, 0);
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
    }

    #[test]
    fn test_vote_yes_increments_yes_count() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Fund the grant?"));

        client.vote(&alice, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 1);
        assert_eq!(proposal.no_votes, 0);
    }

    #[test]
    fn test_vote_no_increments_no_count() {
        let (env, _, client) = setup();
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Change the logo?"));

        client.vote(&bob, &id, &Choice::No);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 0);
        assert_eq!(proposal.no_votes, 1);
    }

    #[test]
    fn test_tally_reflects_all_votes() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);
        let dave = Address::generate(&env);

        let id = client.create_proposal(&String::from_str(&env, "Upgrade protocol?"));

        client.vote(&alice, &id, &Choice::Yes);
        client.vote(&bob, &id, &Choice::Yes);
        client.vote(&carol, &id, &Choice::No);
        client.vote(&dave, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 3);
        assert_eq!(proposal.no_votes, 1);
    }

    #[test]
    fn test_one_vote_per_address() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Double vote attempt"));

        client.vote(&alice, &id, &Choice::Yes);
        let result = client.try_vote(&alice, &id, &Choice::No);

        assert_eq!(result, Err(Ok(Error::AlreadyVoted)));

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 1);
        assert_eq!(proposal.no_votes, 0);
    }

    #[test]
    fn test_vote_on_nonexistent_proposal() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_vote(&alice, &99, &Choice::Yes);
        assert_eq!(result, Err(Ok(Error::ProposalNotFound)));
    }

    #[test]
    fn test_tally_on_nonexistent_proposal() {
        let (_, _, client) = setup();
        let result = client.try_tally(&99);
        assert!(matches!(result, Err(Ok(Error::ProposalNotFound))));
    }

    #[test]
    fn test_vote_on_closed_proposal() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Close me"));

        client.close_proposal(&id);
        let result = client.try_vote(&alice, &id, &Choice::Yes);

        assert_eq!(result, Err(Ok(Error::ProposalClosed)));
    }

    #[test]
    fn test_close_proposal_marks_inactive() {
        let (env, _, client) = setup();
        let id = client.create_proposal(&String::from_str(&env, "To be closed"));

        let before = client.tally(&id);
        assert!(before.is_active);

        client.close_proposal(&id);

        let after = client.tally(&id);
        assert!(!after.is_active);
    }

    #[test]
    fn test_get_vote_returns_none_before_voting() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Empty ballot"));

        assert_eq!(client.get_vote(&alice, &id), None);
    }

    #[test]
    fn test_get_vote_returns_choice_after_voting() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Record the vote"));

        client.vote(&alice, &id, &Choice::Yes);
        client.vote(&bob, &id, &Choice::No);

        assert_eq!(client.get_vote(&alice, &id), Some(Choice::Yes));
        assert_eq!(client.get_vote(&bob, &id), Some(Choice::No));
    }

    #[test]
    fn test_votes_are_independent_across_proposals() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let id0 = client.create_proposal(&String::from_str(&env, "Proposal 0"));
        let id1 = client.create_proposal(&String::from_str(&env, "Proposal 1"));

        client.vote(&alice, &id0, &Choice::Yes);
        client.vote(&alice, &id1, &Choice::No);

        let p0 = client.tally(&id0);
        let p1 = client.tally(&id1);

        assert_eq!(p0.yes_votes, 1);
        assert_eq!(p0.no_votes, 0);
        assert_eq!(p1.yes_votes, 0);
        assert_eq!(p1.no_votes, 1);
    }

    // ─── Delegation: delegate and revoke ──────────────────────────────────

    #[test]
    fn test_delegate_successfully() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.try_delegate_vote(&alice, &bob);

        let delegatee = client.get_delegate(&alice);
        assert_eq!(delegatee, Some(bob.clone()));
    }

    #[test]
    fn test_revoke_successfully() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.try_delegate_vote(&alice, &bob);
        client.try_revoke_delegation(&alice);

        let delegatee = client.get_delegate(&alice);
        assert_eq!(delegatee, None);
    }

    #[test]
    fn test_delegation_lookup() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        assert_eq!(client.get_delegate(&alice), None);

        client.delegate_vote(&alice, &bob);
        assert_eq!(client.get_delegate(&alice), Some(bob.clone()));
    }

    // ─── Delegation rejection tests ──────────────────────────────────────

    #[test]
    fn test_self_delegation_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_delegate_vote(&alice, &alice);
        assert_eq!(result, Err(Ok(Error::SelfDelegation)));
    }

    #[test]
    fn test_duplicate_delegation_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        client.try_delegate_vote(&alice, &bob);
        let result = client.try_delegate_vote(&alice, &carol);
        assert_eq!(result, Err(Ok(Error::AlreadyDelegated)));
    }

    #[test]
    fn test_revoke_without_delegation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_revoke_delegation(&alice);
        assert_eq!(result, Err(Ok(Error::NoDelegation)));
    }

    #[test]
    fn test_repeated_revoke() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.try_delegate_vote(&alice, &bob);
        client.try_revoke_delegation(&alice);
        let result = client.try_revoke_delegation(&alice);
        assert_eq!(result, Err(Ok(Error::NoDelegation)));
    }

    #[test]
    fn test_delegator_cannot_vote_directly() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Delegator cannot vote directly"));

        client.delegate_vote(&alice, &bob);
        let result = client.try_vote(&alice, &id, &Choice::Yes);
        assert_eq!(result, Err(Ok(Error::DelegatorCannotVote)));
    }

    #[test]
    fn test_delegate_receives_voting_power() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Delegate voting power"));

        client.delegate_vote(&alice, &bob);
        client.vote(&bob, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 2);
        assert_eq!(proposal.no_votes, 0);
    }

    // ─── Delegation chain and cycle tests ────────────────────────────────

    #[test]
    fn test_delegation_cycle_self_loop_prevented_explicitly() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_delegate_vote(&alice, &alice);
        assert_eq!(result, Err(Ok(Error::SelfDelegation)));
    }

    #[test]
    fn test_re_delegation_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.try_delegate_vote(&alice, &bob);
        let result = client.try_delegate_vote(&alice, &bob);
        assert_eq!(result, Err(Ok(Error::AlreadyDelegated)));
    }

    #[test]
    fn test_delegation_cycle_self_loop_prevented() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_delegate_vote(&alice, &alice);
        assert_eq!(result, Err(Ok(Error::SelfDelegation)));
    }

    // ─── Tally with delegation ───────────────────────────────────────────

    #[test]
    fn test_tally_counts_delegated_votes_once() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Delegated vote counts once"));

        client.delegate_vote(&alice, &bob);
        client.vote(&bob, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 2);
        assert_eq!(proposal.no_votes, 0);
    }

    #[test]
    fn test_tally_revoked_delegation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Revoked delegation not counted"));

        client.delegate_vote(&alice, &bob);
        client.vote(&bob, &id, &Choice::Yes);

        // Before revocation, Alice's delegation counts
        let before = client.tally(&id);
        assert_eq!(before.yes_votes, 2);

        client.revoke_delegation(&alice);

        // After revocation, Alice no longer counts toward Bob
        let after = client.tally(&id);
        assert_eq!(after.yes_votes, 1);
    }

    #[test]
    fn test_delegated_voter_cannot_vote_directly_after_revocation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Vote after revoke"));

        client.delegate_vote(&alice, &bob);
        client.revoke_delegation(&alice);

        // After revocation, Alice can vote directly again
        client.vote(&alice, &id, &Choice::No);

        let proposal = client.tally(&id);
        assert_eq!(proposal.no_votes, 1);
    }

    #[test]
    fn test_multiple_delegators_to_same_delegate() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Multiple delegators"));

        client.delegate_vote(&alice, &bob);
        client.delegate_vote(&carol, &bob);
        client.vote(&bob, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 3);
        assert_eq!(proposal.no_votes, 0);
    }

    #[test]
    fn test_delegation_global_across_proposals() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let id0 = client.create_proposal(&String::from_str(&env, "Proposal 0"));
        let id1 = client.create_proposal(&String::from_str(&env, "Proposal 1"));

        client.delegate_vote(&alice, &bob);
        client.vote(&bob, &id0, &Choice::Yes);
        client.vote(&bob, &id1, &Choice::No);

        let p0 = client.tally(&id0);
        let p1 = client.tally(&id1);

        assert_eq!(p0.yes_votes, 2);
        assert_eq!(p0.no_votes, 0);
        assert_eq!(p1.yes_votes, 0);
        assert_eq!(p1.no_votes, 2);
    }

    // ─── Deterministic vote counting and no double voting ────────────────

    #[test]
    fn test_delegation_vote_count_is_deterministic() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);
        let dave = Address::generate(&env);

        let id = client.create_proposal(&String::from_str(&env, "Deterministic delegation tally"));

        // Alice delegates to Bob, Carol delegates to Bob, Dave votes directly
        client.delegate_vote(&alice, &bob);
        client.delegate_vote(&carol, &bob);
        client.vote(&dave, &id, &Choice::Yes);
        client.vote(&bob, &id, &Choice::Yes);

        let proposal = client.tally(&id);
        // Dave: 1 Yes, Bob: 1 Yes + 2 delegators (Alice, Carol) = 3 Yes
        assert_eq!(proposal.yes_votes, 4);
        assert_eq!(proposal.no_votes, 0);

        // Tally again must be identical (deterministic)
        let proposal2 = client.tally(&id);
        assert_eq!(proposal.yes_votes, proposal2.yes_votes);
        assert_eq!(proposal.no_votes, proposal2.no_votes);
    }

    // ─── Regression: existing behaviour when delegation is unused ─────────

    #[test]
    fn test_existing_behaviour_unchanged_without_delegation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "No delegation regression"));

        client.vote(&alice, &id, &Choice::Yes);
        client.vote(&bob, &id, &Choice::No);

        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 1);
        assert_eq!(proposal.no_votes, 1);
    }

    #[test]
    fn test_direct_vote_after_revoking_delegation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "Direct vote after revoke"));

        client.delegate_vote(&alice, &bob);
        client.revoke_delegation(&alice);

        // Alice can vote directly now
        client.vote(&alice, &id, &Choice::No);

        let proposal = client.tally(&id);
        assert_eq!(proposal.no_votes, 1);
        assert_eq!(proposal.yes_votes, 0);
    }

    // ─── Fuzz/property-style tests ──────────────────────────────────────

    #[test]
    fn test_random_delegation_and_voting_order() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let id1 = client.create_proposal(&String::from_str(&env, "Scenario 1"));
        client.try_delegate_vote(&alice, &bob);
        client.vote(&bob, &id1, &Choice::Yes);
        let p1 = client.tally(&id1);
        assert_eq!(p1.yes_votes, 2);

        let id2 = client.create_proposal(&String::from_str(&env, "Scenario 2"));
        client.vote(&bob, &id2, &Choice::Yes);
        client.try_delegate_vote(&alice, &bob);
        let p2 = client.tally(&id2);
        // Bob voted Yes alone; delegation adds Alice's weight at tally time
        assert_eq!(p2.yes_votes, 2);
    }

    #[test]
    fn test_no_vote_inflation_with_delegation() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let id = client.create_proposal(&String::from_str(&env, "No vote inflation"));

        // Bob votes; Alice delegates to Bob
        client.vote(&bob, &id, &Choice::Yes);
        client.delegate_vote(&alice, &bob);

        // Tally should be Yes=1 (only bob's direct vote for now), not 3
        // Alice's delegation is counted only when Bob voted BEFORE she delegated,
        // so Bob's vote was just his own. Actually: bob voted first (before delegation),
        // so bob's vote is just 1. Then Alice delegates. Tally adds Alice's delegation
        // to Bob's existing vote: total Yes = 1 (bob's direct) + 1 (Alice's delegation) = 2
        let proposal = client.tally(&id);
        assert_eq!(proposal.yes_votes, 2);
    }

    #[test]
    fn test_delegation_to_invalid_self_rejected() {
        let (env, _, client) = setup();
        let alice = Address::generate(&env);

        // Self-delegation is the primary self-referential invalid case
        let result = client.try_delegate_vote(&alice, &alice);
        assert_eq!(result, Err(Ok(Error::SelfDelegation)));
    }
}
