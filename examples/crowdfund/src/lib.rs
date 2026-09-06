//! # Crowdfund
//!
//! A time-bounded crowdfund contract. A creator opens a campaign with a
//! funding `goal` and a Unix-timestamp `deadline`. Contributors fund the
//! campaign while it is active. After the deadline:
//!
//! - If the goal was reached, only the creator may withdraw the raised funds
//!   (state `Succeeded`).
//! - If the goal was not reached, each contributor may refund their own
//!   contribution (state `Failed`).
//!
//! ## Storage layout
//!
//! All entries use `instance` storage so they persist for the lifetime of the
//! contract.
//!
//! | Key             | Type            | Description                                   |
//! |-----------------|-----------------|-----------------------------------------------|
//! | `Creator`       | `Address`       | Account that opened the campaign               |
//! | `Token`         | `Address`       | Token used for funding                         |
//! | `Goal`          | `i128`          | Funding target (must be > 0)                   |
//! | `Deadline`      | `u64`           | Unix timestamp after which the campaign closes |
//! | `TotalRaised`   | `i128`          | Sum of all contributions                       |
//! | `State`         | `CrowdfundState`| `Active`, `Succeeded` or `Failed`              |
//! | `Contributions` | `Map`           | Contributor `Address` → amount contributed     |

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Map,
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Creator,
    Token,
    Goal,
    Deadline,
    TotalRaised,
    State,
    Contributions,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CrowdfundState {
    Active,
    Succeeded,
    Failed,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The campaign has already been created.
    AlreadyInitialised = 1,
    /// The campaign has not been created yet.
    NotInitialised = 2,
    /// Contribution amount must be greater than zero.
    InvalidAmount = 3,
    /// Funding goal must be greater than zero.
    InvalidGoal = 4,
    /// Deadline must be strictly in the future.
    InvalidDeadline = 5,
    /// The campaign is no longer accepting contributions.
    NotActive = 6,
    /// Only the campaign creator may withdraw.
    Unauthorised = 7,
    /// Withdrawal is not allowed until after the deadline.
    WithdrawTooEarly = 8,
    /// The funding goal was not reached, so the creator cannot withdraw.
    GoalNotReached = 9,
    /// The campaign has not failed yet, so refunds are not allowed.
    CampaignNotFailed = 10,
    /// The caller has nothing to refund.
    NoContribution = 11,
    /// The campaign has already been settled.
    AlreadySettled = 12,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct Crowdfund;

#[contractimpl]
impl Crowdfund {
    /// Create a new crowdfund campaign.
    ///
    /// # Arguments
    /// * `creator`  – Address that opens the campaign; must authorise this call
    ///                and is the only account allowed to withdraw on success.
    /// * `token`    – Address of the token used to fund the campaign.
    /// * `goal`     – Funding target in token units (must be > 0).
    /// * `deadline` – Unix timestamp (seconds) after which the campaign closes.
    ///                Must be strictly after the current ledger timestamp.
    pub fn create(
        env: Env,
        creator: Address,
        token: Address,
        goal: i128,
        deadline: u64,
    ) -> Result<(), Error> {
        creator.require_auth();

        if env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::AlreadyInitialised);
        }
        if goal <= 0 {
            return Err(Error::InvalidGoal);
        }
        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(Error::InvalidDeadline);
        }

        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Goal, &goal);
        env.storage().instance().set(&DataKey::Deadline, &deadline);
        env.storage().instance().set(&DataKey::TotalRaised, &0_i128);
        env.storage()
            .instance()
            .set(&DataKey::State, &CrowdfundState::Active);
        env.storage()
            .instance()
            .set(&DataKey::Contributions, &Map::<Address, i128>::new(&env));

        env.events().publish(
            (symbol_short!("create"),),
            (creator.clone(), token, goal, deadline),
        );

        Ok(())
    }

    /// Contribute `amount` of the campaign token to an active campaign.
    pub fn fund(env: Env, contributor: Address, amount: i128) -> Result<(), Error> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::NotInitialised);
        }
        Self::assert_active(&env)?;

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        token::Client::new(&env, &token).transfer(
            &contributor,
            &env.current_contract_address(),
            &amount,
        );

        let mut contributions: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Contributions)
            .ok_or(Error::NotInitialised)?;
        let previous = contributions.get(contributor.clone()).unwrap_or(0);
        contributions.set(contributor.clone(), previous + amount);
        env.storage()
            .instance()
            .set(&DataKey::Contributions, &contributions);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .ok_or(Error::NotInitialised)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalRaised, &(total + amount));

        env.events()
            .publish((symbol_short!("fund"),), (contributor.clone(), amount));

        Ok(())
    }

    /// Withdraw the raised funds to the creator.
    ///
    /// Allowed only after the deadline and only if the funding goal was
    /// reached. Reverts with `WithdrawTooEarly` before the deadline even if
    /// the goal was already met, and with `GoalNotReached` after the deadline
    /// when the target was missed.
    pub fn withdraw(env: Env, creator: Address) -> Result<i128, Error> {
        creator.require_auth();

        if !env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::NotInitialised);
        }
        let stored_creator: Address = env
            .storage()
            .instance()
            .get(&DataKey::Creator)
            .ok_or(Error::NotInitialised)?;
        if creator != stored_creator {
            return Err(Error::Unauthorised);
        }

        let state: CrowdfundState = env
            .storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;
        if state != CrowdfundState::Active {
            return Err(Error::AlreadySettled);
        }

        let now = env.ledger().timestamp();
        let deadline: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Deadline)
            .ok_or(Error::NotInitialised)?;
        if now < deadline {
            return Err(Error::WithdrawTooEarly);
        }

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .ok_or(Error::NotInitialised)?;
        let goal: i128 = env
            .storage()
            .instance()
            .get(&DataKey::Goal)
            .ok_or(Error::NotInitialised)?;
        if total < goal {
            return Err(Error::GoalNotReached);
        }

        // Checks-effects-interactions: settle before transferring.
        env.storage()
            .instance()
            .set(&DataKey::State, &CrowdfundState::Succeeded);

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &creator,
            &total,
        );

        env.events()
            .publish((symbol_short!("withdraw"),), (creator, total));

        Ok(total)
    }

    /// Refund the caller's own contribution.
    ///
    /// Allowed only after the campaign has failed, i.e. after the deadline
    /// when the goal was not reached. Before the deadline, or while the goal
    /// has been met, refunds revert with `CampaignNotFailed`.
    pub fn refund(env: Env, contributor: Address) -> Result<i128, Error> {
        contributor.require_auth();

        if !env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::NotInitialised);
        }

        let state: CrowdfundState = env
            .storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;
        if state == CrowdfundState::Succeeded {
            return Err(Error::AlreadySettled);
        }
        if state == CrowdfundState::Active {
            let now = env.ledger().timestamp();
            let deadline: u64 = env
                .storage()
                .instance()
                .get(&DataKey::Deadline)
                .ok_or(Error::NotInitialised)?;
            let total: i128 = env
                .storage()
                .instance()
                .get(&DataKey::TotalRaised)
                .ok_or(Error::NotInitialised)?;
            let goal: i128 = env
                .storage()
                .instance()
                .get(&DataKey::Goal)
                .ok_or(Error::NotInitialised)?;
            if now < deadline || total >= goal {
                // Still running, or the goal was met — nothing to fail back.
                return Err(Error::CampaignNotFailed);
            }
            // First refund after a failed campaign flips the state to Failed.
            env.storage()
                .instance()
                .set(&DataKey::State, &CrowdfundState::Failed);
        }

        let mut contributions: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Contributions)
            .ok_or(Error::NotInitialised)?;
        let amount = contributions.get(contributor.clone()).unwrap_or(0);
        if amount <= 0 {
            return Err(Error::NoContribution);
        }

        contributions.remove(contributor.clone());
        env.storage()
            .instance()
            .set(&DataKey::Contributions, &contributions);
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .ok_or(Error::NotInitialised)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalRaised, &(total - amount));

        let token: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)?;
        token::Client::new(&env, &token).transfer(
            &env.current_contract_address(),
            &contributor,
            &amount,
        );

        env.events()
            .publish((symbol_short!("refund"),), (contributor, amount));

        Ok(amount)
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// Return the campaign creator.
    pub fn creator(env: Env) -> Result<Address, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::Creator)
            .ok_or(Error::NotInitialised)
    }

    /// Return the funding token address.
    pub fn token(env: Env) -> Result<Address, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialised)
    }

    /// Return the funding goal.
    pub fn goal(env: Env) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::Goal)
            .ok_or(Error::NotInitialised)
    }

    /// Return the campaign deadline.
    pub fn deadline(env: Env) -> Result<u64, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::Deadline)
            .ok_or(Error::NotInitialised)
    }

    /// Return the total amount raised.
    pub fn total_raised(env: Env) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .ok_or(Error::NotInitialised)
    }

    /// Return the campaign state.
    pub fn state(env: Env) -> Result<CrowdfundState, Error> {
        Self::assert_initialised(&env)?;
        env.storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)
    }

    /// Return how much a given contributor has funded.
    pub fn contribution(env: Env, contributor: Address) -> Result<i128, Error> {
        Self::assert_initialised(&env)?;
        let contributions: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Contributions)
            .ok_or(Error::NotInitialised)?;
        Ok(contributions.get(contributor).unwrap_or(0))
    }

    /// Return how many seconds remain until the deadline, or 0 once past it.
    pub fn time_remaining(env: Env) -> Result<u64, Error> {
        Self::assert_initialised(&env)?;
        let deadline: u64 = env
            .storage()
            .instance()
            .get(&DataKey::Deadline)
            .ok_or(Error::NotInitialised)?;
        let now = env.ledger().timestamp();
        Ok(if now >= deadline { 0 } else { deadline - now })
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    fn assert_initialised(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Creator) {
            return Err(Error::NotInitialised);
        }
        Ok(())
    }

    fn assert_active(env: &Env) -> Result<(), Error> {
        let state: CrowdfundState = env
            .storage()
            .instance()
            .get(&DataKey::State)
            .ok_or(Error::NotInitialised)?;
        if state != CrowdfundState::Active {
            return Err(Error::NotActive);
        }
        Ok(())
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token, Address, Env,
    };

    /// Default ledger timestamp used as "now" in tests.
    const BASE_TIME: u64 = 1_000_000;
    /// 24 hours in seconds.
    const ONE_DAY: u64 = 86_400;
    /// Default funding goal used by most tests.
    const GOAL: i128 = 1_000;

    struct Setup {
        env: Env,
        creator: Address,
        token_addr: Address,
        client: CrowdfundClient<'static>,
    }

    /// Create a funded token plus a campaign opened by `creator`.
    fn setup() -> Setup {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| {
            li.timestamp = BASE_TIME;
            li.sequence_number = 1;
        });

        let creator = Address::generate(&env);
        let token_addr = create_token(&env, &creator, 10_000);

        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);
        client.create(&creator, &token_addr, &GOAL, &(BASE_TIME + ONE_DAY));

        Setup {
            env,
            creator,
            token_addr,
            client,
        }
    }

    /// Register a stellar asset contract, with `amount` minted to `to`.
    fn create_token<'a>(env: &Env, to: &Address, amount: i128) -> Address {
        let contract_address = env.register_stellar_asset_contract_v2(to.clone()).address();
        token::StellarAssetClient::new(env, &contract_address).mint(to, &amount);
        contract_address
    }

    /// Mint `amount` of the campaign token to an address (token admin is the
    /// creator, so any address can be funded for a test).
    fn mint_to(env: &Env, token_addr: &Address, to: &Address, amount: i128) {
        token::StellarAssetClient::new(env, token_addr).mint(to, &amount);
    }

    /// Mint tokens to `contributor` and then fund the campaign. Mirrors a real
    /// contributor that holds the campaign token before contributing.
    fn contribute(
        env: &Env,
        token_addr: &Address,
        client: &CrowdfundClient<'static>,
        contributor: &Address,
        amount: i128,
    ) {
        mint_to(env, token_addr, contributor, amount);
        client.fund(contributor, &amount);
    }

    fn advance_time(env: &Env, seconds: u64) {
        env.ledger().with_mut(|li| {
            li.timestamp += seconds;
            li.sequence_number += 1;
        });
    }

    // ── create ────────────────────────────────────────────────────────────────

    #[test]
    fn test_create_stores_campaign_data() {
        let Setup {
            env,
            creator,
            token_addr,
            client,
        } = setup();

        assert_eq!(client.creator(), creator);
        assert_eq!(client.token(), token_addr);
        assert_eq!(client.goal(), GOAL);
        assert_eq!(client.deadline(), BASE_TIME + ONE_DAY);
        assert_eq!(client.total_raised(), 0);
        assert_eq!(client.state(), CrowdfundState::Active);
        assert_eq!(client.time_remaining(), ONE_DAY);
        let _ = env;
    }

    #[test]
    fn test_create_rejects_zero_goal() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| li.timestamp = BASE_TIME);
        let creator = Address::generate(&env);
        let token_addr = create_token(&env, &creator, 10_000);
        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);

        let result = client.try_create(&creator, &token_addr, &0, &(BASE_TIME + ONE_DAY));
        assert_eq!(result, Err(Ok(Error::InvalidGoal)));
    }

    #[test]
    fn test_create_rejects_past_deadline() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| li.timestamp = BASE_TIME);
        let creator = Address::generate(&env);
        let token_addr = create_token(&env, &creator, 10_000);
        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);

        // deadline == now is not strictly in the future.
        let result = client.try_create(&creator, &token_addr, &GOAL, &BASE_TIME);
        assert_eq!(result, Err(Ok(Error::InvalidDeadline)));
    }

    #[test]
    fn test_create_rejects_double_init() {
        let Setup {
            creator,
            token_addr,
            client,
            ..
        } = setup();

        let result = client.try_create(&creator, &token_addr, &GOAL, &(BASE_TIME + ONE_DAY));
        assert_eq!(result, Err(Ok(Error::AlreadyInitialised)));
    }

    // ── fund ──────────────────────────────────────────────────────────────────

    #[test]
    fn test_fund_transfers_tokens_and_updates_total() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);

        contribute(&env, &token_addr, &client, &contributor, 400);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(client.total_raised(), 400);
        assert_eq!(client.contribution(&contributor), 400);
        assert_eq!(token_client.balance(&contributor), 0);
        assert_eq!(token_client.balance(&client.address), 400);
    }

    #[test]
    fn test_fund_accumulates_multiple_contributions() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);

        contribute(&env, &token_addr, &client, &contributor, 200);
        contribute(&env, &token_addr, &client, &contributor, 300);

        assert_eq!(client.contribution(&contributor), 500);
        assert_eq!(client.total_raised(), 500);
    }

    #[test]
    fn test_fund_rejects_zero_amount() {
        let Setup { env, client, .. } = setup();
        let contributor = Address::generate(&env);

        let result = client.try_fund(&contributor, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_fund_rejects_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| li.timestamp = BASE_TIME);
        let contributor = Address::generate(&env);
        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);

        let result = client.try_fund(&contributor, &100);
        assert_eq!(result, Err(Ok(Error::NotInitialised)));
    }

    // ── withdraw ──────────────────────────────────────────────────────────────

    #[test]
    fn test_withdraw_succeeds_after_deadline_with_goal_met() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL);

        advance_time(&env, ONE_DAY); // now at the deadline; goal is met

        let released = client.withdraw(&creator);
        assert_eq!(released, GOAL);
        assert_eq!(client.state(), CrowdfundState::Succeeded);
        assert_eq!(client.total_raised(), GOAL);
    }

    #[test]
    fn test_withdraw_succeeds_at_exact_goal_edge() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL); // total == goal

        advance_time(&env, ONE_DAY);

        assert_eq!(client.withdraw(&creator), GOAL);
    }

    #[test]
    fn test_withdraw_fails_just_below_goal_edge() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL - 1);

        advance_time(&env, ONE_DAY);

        let result = client.try_withdraw(&creator);
        assert_eq!(result, Err(Ok(Error::GoalNotReached)));
    }

    #[test]
    fn test_withdraw_panics_when_goal_met_but_before_deadline() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL); // goal met early

        // Withdraw before the deadline must fail even though the goal is met.
        let result = client.try_withdraw(&creator);
        assert_eq!(result, Err(Ok(Error::WithdrawTooEarly)));
        // The campaign is still active and accepting funds.
        assert_eq!(client.state(), CrowdfundState::Active);
    }

    #[test]
    fn test_withdraw_fails_for_non_creator() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL);
        advance_time(&env, ONE_DAY);

        let result = client.try_withdraw(&contributor);
        assert_eq!(result, Err(Ok(Error::Unauthorised)));
    }

    #[test]
    fn test_withdraw_fails_if_already_succeeded() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL);
        advance_time(&env, ONE_DAY);
        client.withdraw(&creator);

        let result = client.try_withdraw(&creator);
        assert_eq!(result, Err(Ok(Error::AlreadySettled)));
    }

    #[test]
    fn test_withdraw_fails_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| li.timestamp = BASE_TIME);
        let creator = Address::generate(&env);
        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);

        let result = client.try_withdraw(&creator);
        assert_eq!(result, Err(Ok(Error::NotInitialised)));
    }

    // ── refund ────────────────────────────────────────────────────────────────

    #[test]
    fn test_refund_after_failure_returns_contribution() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, 300);

        advance_time(&env, ONE_DAY); // deadline reached, goal unmet

        let refunded = client.refund(&contributor);
        assert_eq!(refunded, 300);
        assert_eq!(client.state(), CrowdfundState::Failed);
        assert_eq!(client.total_raised(), 0);
        assert_eq!(client.contribution(&contributor), 0);
    }

    #[test]
    fn test_refund_fails_when_goal_met_but_not_withdrawn() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL);

        advance_time(&env, ONE_DAY); // deadline reached and goal met

        let result = client.try_refund(&contributor);
        assert_eq!(result, Err(Ok(Error::CampaignNotFailed)));
    }

    #[test]
    fn test_refund_fails_before_deadline() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, 300);

        let result = client.try_refund(&contributor);
        assert_eq!(result, Err(Ok(Error::CampaignNotFailed)));
    }

    #[test]
    fn test_refund_fails_with_no_contribution() {
        let Setup { env, client, .. } = setup();
        let contributor = Address::generate(&env);
        advance_time(&env, ONE_DAY);

        let result = client.try_refund(&contributor);
        assert_eq!(result, Err(Ok(Error::NoContribution)));
    }

    #[test]
    fn test_refund_fails_in_harmless_event_before_deadline_is_not_no_contribution() {
        // Guards the precedence order: a campaign that is still running must
        // report CampaignNotFailed (not NoContribution) to a random caller.
        let Setup { env, client, .. } = setup();
        let random = Address::generate(&env);
        let result = client.try_refund(&random);
        assert_eq!(result, Err(Ok(Error::CampaignNotFailed)));
    }

    #[test]
    fn test_refund_each_contributor_once_after_failure() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        let other = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, 200);
        contribute(&env, &token_addr, &client, &other, 300);

        advance_time(&env, ONE_DAY);

        assert_eq!(client.refund(&contributor), 200);
        assert_eq!(client.refund(&other), 300);
        assert_eq!(client.total_raised(), 0);

        // A second refund attempt finds nothing to return.
        let result = client.try_refund(&contributor);
        assert_eq!(result, Err(Ok(Error::NoContribution)));
    }

    #[test]
    fn test_refund_fails_after_success() {
        let Setup {
            env,
            creator,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, GOAL);
        advance_time(&env, ONE_DAY);
        client.withdraw(&creator);

        let result = client.try_refund(&contributor);
        assert_eq!(result, Err(Ok(Error::AlreadySettled)));
    }

    #[test]
    fn test_fund_rejected_after_failure() {
        let Setup {
            env,
            client,
            token_addr,
            ..
        } = setup();
        let contributor = Address::generate(&env);
        contribute(&env, &token_addr, &client, &contributor, 300);

        advance_time(&env, ONE_DAY);
        client.refund(&contributor);

        // A late contributor cannot fund a failed campaign.
        let late = Address::generate(&env);
        let result = client.try_fund(&late, &100);
        assert_eq!(result, Err(Ok(Error::NotActive)));
    }

    // ── view helpers ──────────────────────────────────────────────────────────

    #[test]
    fn test_views_fail_before_init() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().with_mut(|li| li.timestamp = BASE_TIME);
        let contributor = Address::generate(&env);
        let contract_id = env.register(Crowdfund, ());
        let client = CrowdfundClient::new(&env, &contract_id);

        assert_eq!(client.try_creator(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_token(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_goal(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_deadline(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_total_raised(), Err(Ok(Error::NotInitialised)));
        assert_eq!(client.try_state(), Err(Ok(Error::NotInitialised)));
        assert_eq!(
            client.try_contribution(&contributor),
            Err(Ok(Error::NotInitialised))
        );
        assert_eq!(client.try_time_remaining(), Err(Ok(Error::NotInitialised)));
    }
}
