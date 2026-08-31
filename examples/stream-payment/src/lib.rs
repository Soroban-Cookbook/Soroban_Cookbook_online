//! Linear token streaming with withdrawable balance.
//!
//! A sender deposits tokens to create a stream. The recipient can withdraw
//! the currently available portion at any time after the stream starts.
//! Balance accrues linearly from start to end, with no cliff. Repeated
//! withdrawals are supported and the recipient can never withdraw more than
//! the total stream amount.
//!
//! **Contrast with token-vesting:** Token vesting typically releases tokens
//! according to a schedule (often with a cliff) and may be designed around
//! beneficiary entitlement/release milestones. Token streaming continuously
//! accrues balance over time so the recipient can withdraw the available
//! portion repeatedly without waiting for a single release event.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stream {
    /// Address that created and funded the stream.
    pub sender: Address,
    /// Address entitled to withdraw from the stream.
    pub recipient: Address,
    /// Stellar asset contract held by this contract.
    pub token: Address,
    /// Ledger timestamp at which the stream begins.
    pub start_time: u64,
    /// Ledger timestamp at which the full allocation is available.
    pub end_time: u64,
    /// Total tokens deposited for this stream.
    pub total_amount: i128,
    /// Tokens already withdrawn by the recipient.
    pub withdrawn_amount: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Stream,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidSchedule = 4,
    StreamNotStarted = 5,
    NothingToWithdraw = 6,
    OverWithdraw = 7,
    ArithmeticOverflow = 8,
    Unauthorized = 9,
}

#[contract]
pub struct StreamPayment;

#[contractimpl]
impl StreamPayment {
    /// Create and fund a token stream.
    ///
    /// The stream starts at the current ledger timestamp. `end_time` must be
    /// strictly later than the start time. The full allocation is transferred
    /// into the contract atomically.
    pub fn initialize(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        total_amount: i128,
        end_time: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Stream) {
            return Err(Error::AlreadyInitialized);
        }
        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let start_time = env.ledger().timestamp();
        if end_time <= start_time {
            return Err(Error::InvalidSchedule);
        }

        sender.require_auth();

        let stream = Stream {
            sender: sender.clone(),
            recipient,
            token: token.clone(),
            start_time,
            end_time,
            total_amount,
            withdrawn_amount: 0,
        };

        env.storage().instance().set(&DataKey::Stream, &stream);

        token::Client::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &total_amount,
        );

        Ok(())
    }

    /// Withdraw the currently available portion of the stream.
    ///
    /// Only the recipient may authorize a withdrawal. The amount withdrawn is
    /// the linearly released amount at the current timestamp minus any
    /// previously withdrawn balance. After `end_time` the full allocation is
    /// available.
    pub fn withdraw(env: Env) -> Result<i128, Error> {
        let mut stream = Self::load_stream(&env)?;
        stream.recipient.require_auth();

        let now = env.ledger().timestamp();
        if now < stream.start_time {
            return Err(Error::StreamNotStarted);
        }

        let available = Self::withdrawable_at(&stream, now)?;
        if available <= 0 {
            return Err(Error::NothingToWithdraw);
        }

        stream.withdrawn_amount += available;
        env.storage()
            .instance()
            .set(&DataKey::Stream, &stream);

        token::Client::new(&env, &stream.token).transfer(
            &env.current_contract_address(),
            &stream.recipient,
            &available,
        );

        Ok(available)
    }

    /// Return the complete stream record.
    pub fn stream(env: Env) -> Result<Stream, Error> {
        Self::load_stream(&env)
    }

    /// Return the amount currently available to withdraw.
    pub fn available_amount(env: Env) -> Result<i128, Error> {
        let stream = Self::load_stream(&env)?;
        Self::withdrawable_at(&stream, env.ledger().timestamp())
    }

    /// Calculate the withdrawable amount at a given timestamp.
    ///
    /// Before `start_time`: 0
    /// Between start and end: `total * elapsed / duration`
    /// At or after `end_time`: `total - withdrawn`
    pub fn withdrawable_at(stream: &Stream, timestamp: u64) -> Result<i128, Error> {
        if timestamp < stream.start_time {
            return Ok(0);
        }

        let total_released = if timestamp >= stream.end_time {
            stream.total_amount
        } else {
            let elapsed = i128::from(timestamp - stream.start_time);
            let duration = i128::from(stream.end_time - stream.start_time);
            stream
                .total_amount
                .checked_mul(elapsed)
                .map(|amount| amount / duration)
                .ok_or(Error::ArithmeticOverflow)?
        };

        let available = total_released
            .checked_sub(stream.withdrawn_amount)
            .ok_or(Error::ArithmeticOverflow)?;

        Ok(available)
    }

    fn load_stream(env: &Env) -> Result<Stream, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Stream)
            .ok_or(Error::NotInitialized)
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
    const END_TIME: u64 = START_TIME + 1_000;
    const TOTAL_AMOUNT: i128 = 10_000;

    struct Fixture {
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        client: StreamPaymentClient<'static>,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();
        set_time(&env, START_TIME);

        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        token::StellarAssetClient::new(&env, &token).mint(&sender, &(TOTAL_AMOUNT * 2));

        let contract_id = env.register(StreamPayment, ());
        let client = StreamPaymentClient::new(&env, &contract_id);

        Fixture {
            env,
            sender,
            recipient,
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
            &fixture.sender,
            &fixture.recipient,
            &fixture.token,
            &TOTAL_AMOUNT,
            &END_TIME,
        );
    }

    fn token_client(fixture: &Fixture) -> token::Client<'_> {
        token::Client::new(&fixture.env, &fixture.token)
    }

    #[test]
    fn initialize_funds_and_records_the_stream() {
        let fixture = setup();
        initialize(&fixture);

        let stream = fixture.client.stream();
        assert_eq!(stream.sender, fixture.sender);
        assert_eq!(stream.recipient, fixture.recipient);
        assert_eq!(stream.token, fixture.token);
        assert_eq!(stream.start_time, START_TIME);
        assert_eq!(stream.end_time, END_TIME);
        assert_eq!(stream.total_amount, TOTAL_AMOUNT);
        assert_eq!(stream.withdrawn_amount, 0);
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
                &fixture.sender,
                &fixture.recipient,
                &fixture.token,
                &0,
                &END_TIME,
            ),
            Err(Ok(Error::InvalidAmount))
        );
        assert_eq!(
            fixture.client.try_initialize(
                &fixture.sender,
                &fixture.recipient,
                &fixture.token,
                &TOTAL_AMOUNT,
                &START_TIME,
            ),
            Err(Ok(Error::InvalidSchedule))
        );

        initialize(&fixture);
        assert_eq!(
            fixture.client.try_initialize(
                &fixture.sender,
                &fixture.recipient,
                &fixture.token,
                &TOTAL_AMOUNT,
                &END_TIME,
            ),
            Err(Ok(Error::AlreadyInitialized))
        );
    }

    #[test]
    fn nothing_withdrawable_before_stream_starts() {
        let fixture = setup();
        set_time(&fixture.env, START_TIME - 1);
        initialize(&fixture);

        assert_eq!(fixture.client.available_amount(), 0);
        assert_eq!(
            fixture.client.try_withdraw(),
            Err(Ok(Error::StreamNotStarted))
        );
        assert_eq!(token_client(&fixture).balance(&fixture.recipient), 0);
    }

    #[test]
    fn partial_withdrawal_during_stream() {
        let fixture = setup();
        initialize(&fixture);

        // At 50% through the stream, 50% should be available
        set_time(&fixture.env, START_TIME + 500);
        assert_eq!(fixture.client.available_amount(), 5_000);
        assert_eq!(fixture.client.withdraw(), 5_000);
        assert_eq!(token_client(&fixture).balance(&fixture.recipient), 5_000);

        // After withdrawing, available should be 0
        assert_eq!(fixture.client.available_amount(), 0);
    }

    #[test]
    fn withdrawable_at_calculates_correctly() {
        let fixture = setup();
        initialize(&fixture);

        let stream = fixture.client.stream();

        // Before start
        assert_eq!(StreamPayment::withdrawable_at(&stream, START_TIME - 1).unwrap(), 0);

        // At start
        assert_eq!(StreamPayment::withdrawable_at(&stream, START_TIME).unwrap(), 0);

        // 25% through
        assert_eq!(StreamPayment::withdrawable_at(&stream, START_TIME + 250).unwrap(), 2_500);

        // 50% through
        assert_eq!(StreamPayment::withdrawable_at(&stream, START_TIME + 500).unwrap(), 5_000);

        // 75% through
        assert_eq!(StreamPayment::withdrawable_at(&stream, START_TIME + 750).unwrap(), 7_500);

        // At end
        assert_eq!(StreamPayment::withdrawable_at(&stream, END_TIME).unwrap(), TOTAL_AMOUNT);

        // After end
        assert_eq!(StreamPayment::withdrawable_at(&stream, END_TIME + 100).unwrap(), TOTAL_AMOUNT);
    }

    #[test]
    fn partial_withdrawal_reduces_remaining_balance() {
        let fixture = setup();
        initialize(&fixture);

        // First partial withdrawal
        set_time(&fixture.env, START_TIME + 500);
        assert_eq!(fixture.client.withdraw(), 5_000);

        // Second partial withdrawal later
        set_time(&fixture.env, START_TIME + 750);
        assert_eq!(fixture.client.available_amount(), 2_500);
        assert_eq!(fixture.client.withdraw(), 2_500);
        assert_eq!(token_client(&fixture).balance(&fixture.recipient), 7_500);
        assert_eq!(fixture.client.stream().withdrawn_amount, 7_500);
    }

    #[test]
    fn end_of_stream_releases_full_allocation() {
        let fixture = setup();
        initialize(&fixture);

        set_time(&fixture.env, END_TIME);
        assert_eq!(fixture.client.available_amount(), TOTAL_AMOUNT);
        assert_eq!(fixture.client.withdraw(), TOTAL_AMOUNT);
        assert_eq!(fixture.client.available_amount(), 0);
        assert_eq!(
            fixture.client.try_withdraw(),
            Err(Ok(Error::NothingToWithdraw))
        );
        assert_eq!(
            token_client(&fixture).balance(&fixture.recipient),
            TOTAL_AMOUNT
        );
        assert_eq!(token_client(&fixture).balance(&fixture.client.address), 0);
    }

    #[test]
    fn cannot_withdraw_more_than_total() {
        let fixture = setup();
        initialize(&fixture);

        // Withdraw the full amount
        set_time(&fixture.env, END_TIME);
        fixture.client.withdraw();

        // Try to withdraw again
        set_time(&fixture.env, END_TIME + 1000);
        assert_eq!(fixture.client.available_amount(), 0);
        assert_eq!(
            fixture.client.try_withdraw(),
            Err(Ok(Error::NothingToWithdraw))
        );
    }

    #[test]
    #[should_panic]
    fn unauthorized_withdrawal_fails() {
        let fixture = setup();
        initialize(&fixture);

        // Without mock_all_auths, an unauthorized caller must fail.
        // The require_auth() call in withdraw() will panic.
        set_time(&fixture.env, START_TIME + 500);
        fixture.client.withdraw();
    }

    #[test]
    fn repeated_withdrawals_accrue_correctly() {
        let fixture = setup();
        initialize(&fixture);

        // Withdraw at 25%
        set_time(&fixture.env, START_TIME + 250);
        assert_eq!(fixture.client.withdraw(), 2_500);

        // Withdraw at 50%
        set_time(&fixture.env, START_TIME + 500);
        assert_eq!(fixture.client.withdraw(), 2_500);

        // Withdraw at 75%
        set_time(&fixture.env, START_TIME + 750);
        assert_eq!(fixture.client.withdraw(), 2_500);

        // Withdraw at 100%
        set_time(&fixture.env, END_TIME);
        assert_eq!(fixture.client.withdraw(), 2_500);

        // Total withdrawn should equal total amount
        assert_eq!(fixture.client.stream().withdrawn_amount, TOTAL_AMOUNT);
        assert_eq!(token_client(&fixture).balance(&fixture.recipient), TOTAL_AMOUNT);
    }

    #[test]
    fn view_functions_require_initialization() {
        let fixture = setup();

        assert_eq!(
            fixture.client.try_stream(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_available_amount(),
            Err(Ok(Error::NotInitialized))
        );
    }
}
