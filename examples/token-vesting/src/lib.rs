//! Linear token vesting with a cliff.
//!
//! A funder deposits the complete allocation when the contract is
//! initialized. The beneficiary can release the vested portion after the
//! cliff, with vesting progressing linearly from initialization to the end
//! timestamp. All time checks use the current ledger timestamp.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VestingSchedule {
    /// Address that funded the schedule.
    pub funder: Address,
    /// Address entitled to release vested tokens.
    pub beneficiary: Address,
    /// Stellar asset contract held by this contract.
    pub token: Address,
    /// Ledger timestamp at which vesting began.
    pub start_time: u64,
    /// Earliest ledger timestamp at which a release is allowed.
    pub cliff_time: u64,
    /// Ledger timestamp at which the allocation is fully vested.
    pub end_time: u64,
    /// Total tokens deposited for this schedule.
    pub total_amount: i128,
    /// Tokens already released to the beneficiary.
    pub released_amount: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Schedule,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidSchedule = 4,
    CliffNotReached = 5,
    NothingToRelease = 6,
    ArithmeticOverflow = 7,
}

#[contract]
pub struct TokenVesting;

#[contractimpl]
impl TokenVesting {
    /// Create and fund a vesting schedule.
    ///
    /// The vesting start is the current ledger timestamp. `cliff_time` may
    /// equal the start time, while `end_time` must be strictly later than the
    /// cliff. The full allocation is transferred into the contract atomically.
    pub fn initialize(
        env: Env,
        funder: Address,
        beneficiary: Address,
        token: Address,
        total_amount: i128,
        cliff_time: u64,
        end_time: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Schedule) {
            return Err(Error::AlreadyInitialized);
        }
        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let start_time = env.ledger().timestamp();
        if cliff_time < start_time || end_time <= cliff_time {
            return Err(Error::InvalidSchedule);
        }

        funder.require_auth();

        let schedule = VestingSchedule {
            funder: funder.clone(),
            beneficiary,
            token: token.clone(),
            start_time,
            cliff_time,
            end_time,
            total_amount,
            released_amount: 0,
        };

        env.storage().instance().set(&DataKey::Schedule, &schedule);

        token::Client::new(&env, &token).transfer(
            &funder,
            &env.current_contract_address(),
            &total_amount,
        );

        Ok(())
    }

    /// Release all tokens vested at the current ledger timestamp.
    ///
    /// Only the beneficiary may authorize a release. Repeated releases pay
    /// only the newly vested amount; at `end_time` the entire allocation is
    /// available, including any remainder from integer division.
    pub fn release(env: Env) -> Result<i128, Error> {
        let mut schedule = Self::load_schedule(&env)?;
        schedule.beneficiary.require_auth();

        let now = env.ledger().timestamp();
        if now < schedule.cliff_time {
            return Err(Error::CliffNotReached);
        }

        let vested = Self::vested_at(&schedule, now)?;
        let releasable = vested - schedule.released_amount;
        if releasable <= 0 {
            return Err(Error::NothingToRelease);
        }

        schedule.released_amount = vested;
        env.storage().instance().set(&DataKey::Schedule, &schedule);

        token::Client::new(&env, &schedule.token).transfer(
            &env.current_contract_address(),
            &schedule.beneficiary,
            &releasable,
        );

        Ok(releasable)
    }

    /// Return the complete vesting schedule.
    pub fn schedule(env: Env) -> Result<VestingSchedule, Error> {
        Self::load_schedule(&env)
    }

    /// Return the amount vested at the current ledger timestamp.
    pub fn vested_amount(env: Env) -> Result<i128, Error> {
        let schedule = Self::load_schedule(&env)?;
        Self::vested_at(&schedule, env.ledger().timestamp())
    }

    /// Return the amount currently available to release.
    pub fn releasable_amount(env: Env) -> Result<i128, Error> {
        let schedule = Self::load_schedule(&env)?;
        if env.ledger().timestamp() < schedule.cliff_time {
            return Ok(0);
        }

        let vested = Self::vested_at(&schedule, env.ledger().timestamp())?;
        Ok(vested - schedule.released_amount)
    }

    fn load_schedule(env: &Env) -> Result<VestingSchedule, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Schedule)
            .ok_or(Error::NotInitialized)
    }

    fn vested_at(schedule: &VestingSchedule, timestamp: u64) -> Result<i128, Error> {
        if timestamp < schedule.cliff_time {
            return Ok(0);
        }
        if timestamp >= schedule.end_time {
            return Ok(schedule.total_amount);
        }

        let elapsed = i128::from(timestamp - schedule.start_time);
        let duration = i128::from(schedule.end_time - schedule.start_time);
        schedule
            .total_amount
            .checked_mul(elapsed)
            .map(|amount| amount / duration)
            .ok_or(Error::ArithmeticOverflow)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env,
    };

    const START_TIME: u64 = 1_000_000;
    const CLIFF_TIME: u64 = START_TIME + 100;
    const END_TIME: u64 = START_TIME + 1_000;
    const TOTAL_AMOUNT: i128 = 10_000;

    struct Fixture {
        env: Env,
        funder: Address,
        beneficiary: Address,
        token: Address,
        client: TokenVestingClient<'static>,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();
        set_time(&env, START_TIME);

        let admin = Address::generate(&env);
        let funder = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        token::StellarAssetClient::new(&env, &token).mint(&funder, &(TOTAL_AMOUNT * 2));

        let contract_id = env.register(TokenVesting, ());
        let client = TokenVestingClient::new(&env, &contract_id);

        Fixture {
            env,
            funder,
            beneficiary,
            token,
            client,
        }
    }

    fn set_time(env: &Env, timestamp: u64) {
        env.ledger().with_mut(|ledger| {
            ledger.timestamp = timestamp;
            ledger.sequence_number += 1;
        });
    }

    fn initialize(fixture: &Fixture) {
        fixture.client.initialize(
            &fixture.funder,
            &fixture.beneficiary,
            &fixture.token,
            &TOTAL_AMOUNT,
            &CLIFF_TIME,
            &END_TIME,
        );
    }

    fn token_client(fixture: &Fixture) -> token::Client<'_> {
        token::Client::new(&fixture.env, &fixture.token)
    }

    #[test]
    fn initialize_funds_and_records_the_schedule() {
        let fixture = setup();
        initialize(&fixture);

        let schedule = fixture.client.schedule();
        assert_eq!(schedule.funder, fixture.funder);
        assert_eq!(schedule.beneficiary, fixture.beneficiary);
        assert_eq!(schedule.token, fixture.token);
        assert_eq!(schedule.start_time, START_TIME);
        assert_eq!(schedule.cliff_time, CLIFF_TIME);
        assert_eq!(schedule.end_time, END_TIME);
        assert_eq!(schedule.total_amount, TOTAL_AMOUNT);
        assert_eq!(schedule.released_amount, 0);
        assert_eq!(
            token_client(&fixture).balance(&fixture.client.address),
            TOTAL_AMOUNT
        );
    }

    #[test]
    fn initialize_rejects_invalid_inputs_and_reinitialization() {
        let fixture = setup();

        assert_eq!(
            fixture.client.try_initialize(
                &fixture.funder,
                &fixture.beneficiary,
                &fixture.token,
                &0,
                &CLIFF_TIME,
                &END_TIME,
            ),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            fixture.client.try_initialize(
                &fixture.funder,
                &fixture.beneficiary,
                &fixture.token,
                &TOTAL_AMOUNT,
                &(START_TIME - 1),
                &END_TIME,
            ),
            Err(Ok(Error::InvalidSchedule))
        );
        assert_eq!(
            fixture.client.try_initialize(
                &fixture.funder,
                &fixture.beneficiary,
                &fixture.token,
                &TOTAL_AMOUNT,
                &CLIFF_TIME,
                &CLIFF_TIME,
            ),
            Err(Ok(Error::InvalidSchedule))
        );

        initialize(&fixture);
        assert_eq!(
            fixture.client.try_initialize(
                &fixture.funder,
                &fixture.beneficiary,
                &fixture.token,
                &TOTAL_AMOUNT,
                &CLIFF_TIME,
                &END_TIME,
            ),
            Err(Ok(Error::AlreadyInitialized))
        );
    }

    #[test]
    fn release_is_blocked_before_the_cliff() {
        let fixture = setup();
        initialize(&fixture);
        set_time(&fixture.env, CLIFF_TIME - 1);

        assert_eq!(fixture.client.releasable_amount(), 0);
        assert_eq!(
            fixture.client.try_release(),
            Err(Ok(Error::CliffNotReached))
        );
        assert_eq!(token_client(&fixture).balance(&fixture.beneficiary), 0);
    }

    #[test]
    fn cliff_releases_the_linearly_vested_portion() {
        let fixture = setup();
        initialize(&fixture);
        set_time(&fixture.env, CLIFF_TIME);

        assert_eq!(fixture.client.vested_amount(), 1_000);
        assert_eq!(fixture.client.release(), 1_000);
        assert_eq!(token_client(&fixture).balance(&fixture.beneficiary), 1_000);
    }

    #[test]
    fn repeated_releases_only_transfer_newly_vested_tokens() {
        let fixture = setup();
        initialize(&fixture);

        set_time(&fixture.env, START_TIME + 500);
        assert_eq!(fixture.client.release(), 5_000);

        set_time(&fixture.env, START_TIME + 750);
        assert_eq!(fixture.client.releasable_amount(), 2_500);
        assert_eq!(fixture.client.release(), 2_500);
        assert_eq!(token_client(&fixture).balance(&fixture.beneficiary), 7_500);
        assert_eq!(fixture.client.schedule().released_amount, 7_500);
    }

    #[test]
    fn end_time_releases_the_full_allocation_once() {
        let fixture = setup();
        initialize(&fixture);
        set_time(&fixture.env, END_TIME);

        assert_eq!(fixture.client.vested_amount(), TOTAL_AMOUNT);
        assert_eq!(fixture.client.release(), TOTAL_AMOUNT);
        assert_eq!(fixture.client.releasable_amount(), 0);
        assert_eq!(
            fixture.client.try_release(),
            Err(Ok(Error::NothingToRelease))
        );
        assert_eq!(
            token_client(&fixture).balance(&fixture.beneficiary),
            TOTAL_AMOUNT
        );
        assert_eq!(token_client(&fixture).balance(&fixture.client.address), 0);
    }

    #[test]
    fn vesting_math_reports_overflow() {
        let env = Env::default();
        let address = Address::generate(&env);
        let schedule = VestingSchedule {
            funder: address.clone(),
            beneficiary: address.clone(),
            token: address,
            start_time: 0,
            cliff_time: 0,
            end_time: 100,
            total_amount: i128::MAX,
            released_amount: 0,
        };

        assert_eq!(
            TokenVesting::vested_at(&schedule, 99),
            Err(Error::ArithmeticOverflow)
        );
    }

    #[test]
    fn view_functions_require_initialization() {
        let fixture = setup();

        assert_eq!(
            fixture.client.try_schedule(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_vested_amount(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_releasable_amount(),
            Err(Ok(Error::NotInitialized))
        );
    }
}
