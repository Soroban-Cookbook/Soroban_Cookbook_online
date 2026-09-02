//! # Dutch Auction Example
//!
//! A time-decaying price auction contract demonstrating linear interpolation
//! and timestamp-based pricing in Soroban.
//!
//! In a Dutch auction, the asking price starts at an initial `start_price` and
//! linearly decays over a fixed `duration` down to a reserve `end_price`. The
//! first buyer to call `buy` acquires the item at the price determined by the
//! current ledger timestamp, concluding the auction.
//!
//! ## Price Interpolation Formula
//!
//! For any timestamp $t$:
//!
//! - If $t \le \text{start\_time}$:
//!   $$P(t) = \text{start\_price}$$
//! - If $\text{start\_time} < t < \text{start\_time} + \text{duration}$:
//!   $$\text{elapsed} = t - \text{start\_time}$$
//!   $$\text{price\_drop} = \text{start\_price} - \text{end\_price}$$
//!   $$P(t) = \text{start\_price} - \frac{\text{price\_drop} \times \text{elapsed}}{\text{duration}}$$
//! - If $t \ge \text{start\_time} + \text{duration}$:
//!   $$P(t) = \text{end\_price}$$
//!
//! ## Lifecycle State Machine
//!
//! ```text
//!              [Initialized / Active]
//!                    /        \
//!     buy(buyer)    /          \    close() [seller only]
//!                  v            v
//!               [Sold]       [Closed]
//! ```
//!
//! ## Storage Layout
//!
//! Stored in contract `instance` storage:
//!
//! | Key       | Type      | Description                                |
//! |-----------|-----------|--------------------------------------------|
//! | `Auction` | `Auction` | Complete auction metadata, config & state  |

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
};

// ─── State & Storage Layout ──────────────────────────────────────────────────

/// The lifecycle state of a Dutch auction.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuctionState {
    /// Auction is active and accepting bids.
    Active,
    /// Auction was concluded by a successful purchase.
    Sold,
    /// Auction was cancelled or closed by the seller.
    Closed,
}

/// The core auction configuration and settlement data.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    /// Seller address that initialized the auction and receives funds.
    pub seller: Address,
    /// Address of the payment token contract (e.g. SEP-41 / SAC).
    pub token: Address,
    /// Starting asking price (highest price).
    pub start_price: i128,
    /// Reserve / floor price (lowest price at expiration).
    pub end_price: i128,
    /// Ledger timestamp when the auction starts.
    pub start_time: u64,
    /// Total duration in seconds over which the price decays.
    pub duration: u64,
    /// Current lifecycle state.
    pub state: AuctionState,
    /// Address of the winning buyer, if sold.
    pub buyer: Option<Address>,
    /// Final price paid by the buyer, if sold.
    pub final_price: Option<i128>,
    /// Ledger timestamp when the auction was settled (sold or closed).
    pub settled_at: Option<u64>,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Auction,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The auction has already been initialized.
    AlreadyInitialized = 1,
    /// The auction has not been initialized yet.
    NotInitialized = 2,
    /// Start price must be positive and greater than or equal to end price.
    InvalidPrice = 3,
    /// Duration must be greater than zero.
    InvalidDuration = 4,
    /// The auction has not started yet (ledger timestamp is before start time).
    AuctionNotStarted = 5,
    /// The auction duration has expired.
    AuctionEnded = 6,
    /// The auction is no longer active (already sold or closed).
    AuctionNotActive = 7,
    /// The seller cannot buy their own auction.
    SellerCannotBuy = 8,
    /// Arithmetic overflow occurred during price interpolation.
    ArithmeticOverflow = 9,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct DutchAuction;

#[contractimpl]
#[allow(deprecated)]
impl DutchAuction {
    /// Initialize a new Dutch auction.
    ///
    /// Sets the seller, payment token, start/end prices, and auction duration.
    /// The auction start timestamp is set to the current ledger timestamp.
    ///
    /// # Arguments
    /// * `seller`      – Address creating the auction and receiving payment.
    /// * `token`       – Token contract address used for settlement.
    /// * `start_price` – Initial highest price (must be > 0 and >= `end_price`).
    /// * `end_price`   – Reserve / minimum price (must be >= 0).
    /// * `duration`    – Duration in seconds over which price decays (> 0).
    pub fn initialize(
        env: Env,
        seller: Address,
        token: Address,
        start_price: i128,
        end_price: i128,
        duration: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Auction) {
            return Err(Error::AlreadyInitialized);
        }

        seller.require_auth();

        if start_price <= 0 || end_price < 0 || start_price < end_price {
            return Err(Error::InvalidPrice);
        }

        if duration == 0 {
            return Err(Error::InvalidDuration);
        }

        let start_time = env.ledger().timestamp();

        let auction = Auction {
            seller: seller.clone(),
            token: token.clone(),
            start_price,
            end_price,
            start_time,
            duration,
            state: AuctionState::Active,
            buyer: None,
            final_price: None,
            settled_at: None,
        };

        env.storage().instance().set(&DataKey::Auction, &auction);

        env.events().publish(
            (symbol_short!("init"),),
            (seller, token, start_price, end_price, start_time, duration),
        );

        Ok(())
    }

    /// Return the current asking price based on the ledger timestamp.
    pub fn current_price(env: Env) -> Result<i128, Error> {
        let auction = Self::load_auction(&env)?;
        Self::calculate_price(&auction, env.ledger().timestamp())
    }

    /// Calculate what the asking price would be at a specific timestamp.
    pub fn price_at(env: Env, timestamp: u64) -> Result<i128, Error> {
        let auction = Self::load_auction(&env)?;
        Self::calculate_price(&auction, timestamp)
    }

    /// Purchase the auction at the current interpolated price.
    ///
    /// Transfers payment tokens from the buyer to the seller and concludes the
    /// auction. Rejects calls made after the auction duration has elapsed.
    ///
    /// # Arguments
    /// * `buyer` – Address purchasing the auction; must authorize this call.
    pub fn buy(env: Env, buyer: Address) -> Result<i128, Error> {
        let mut auction = Self::load_auction(&env)?;

        if auction.state != AuctionState::Active {
            return Err(Error::AuctionNotActive);
        }

        if buyer == auction.seller {
            return Err(Error::SellerCannotBuy);
        }

        buyer.require_auth();

        let now = env.ledger().timestamp();

        if now < auction.start_time {
            return Err(Error::AuctionNotStarted);
        }

        let end_time = auction
            .start_time
            .checked_add(auction.duration)
            .ok_or(Error::ArithmeticOverflow)?;

        if now >= end_time {
            return Err(Error::AuctionEnded);
        }

        let price = Self::calculate_price(&auction, now)?;

        // Update state before external token transfer (Checks-Effects-Interactions)
        auction.state = AuctionState::Sold;
        auction.buyer = Some(buyer.clone());
        auction.final_price = Some(price);
        auction.settled_at = Some(now);

        env.storage().instance().set(&DataKey::Auction, &auction);

        token::Client::new(&env, &auction.token).transfer(&buyer, &auction.seller, &price);

        env.events()
            .publish((symbol_short!("buy"),), (buyer, price, now));

        Ok(price)
    }

    /// Close / cancel an active auction.
    ///
    /// Callable only by the seller before the auction is sold.
    pub fn close(env: Env) -> Result<(), Error> {
        let mut auction = Self::load_auction(&env)?;

        if auction.state != AuctionState::Active {
            return Err(Error::AuctionNotActive);
        }

        auction.seller.require_auth();

        let now = env.ledger().timestamp();
        auction.state = AuctionState::Closed;
        auction.settled_at = Some(now);

        env.storage().instance().set(&DataKey::Auction, &auction);

        env.events()
            .publish((symbol_short!("close"),), (auction.seller, now));

        Ok(())
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /// Return the full auction record.
    pub fn auction(env: Env) -> Result<Auction, Error> {
        Self::load_auction(&env)
    }

    /// Return the initial start price.
    pub fn start_price(env: Env) -> Result<i128, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.start_price)
    }

    /// Return the floor / reserve end price.
    pub fn end_price(env: Env) -> Result<i128, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.end_price)
    }

    /// Return the start timestamp.
    pub fn start_time(env: Env) -> Result<u64, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.start_time)
    }

    /// Return the end timestamp (`start_time + duration`).
    pub fn end_time(env: Env) -> Result<u64, Error> {
        let auction = Self::load_auction(&env)?;
        auction
            .start_time
            .checked_add(auction.duration)
            .ok_or(Error::ArithmeticOverflow)
    }

    /// Return the duration in seconds.
    pub fn duration(env: Env) -> Result<u64, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.duration)
    }

    /// Return the seller address.
    pub fn seller(env: Env) -> Result<Address, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.seller)
    }

    /// Return the payment token address.
    pub fn token(env: Env) -> Result<Address, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.token)
    }

    /// Return the current auction state.
    pub fn state(env: Env) -> Result<AuctionState, Error> {
        let auction = Self::load_auction(&env)?;
        Ok(auction.state)
    }

    /// Return how many seconds remain until auction expiration, or 0 if expired/settled.
    pub fn time_remaining(env: Env) -> Result<u64, Error> {
        let auction = Self::load_auction(&env)?;
        if auction.state != AuctionState::Active {
            return Ok(0);
        }

        let now = env.ledger().timestamp();
        let end_time = auction
            .start_time
            .checked_add(auction.duration)
            .ok_or(Error::ArithmeticOverflow)?;

        Ok(end_time.saturating_sub(now))
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    fn load_auction(env: &Env) -> Result<Auction, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Auction)
            .ok_or(Error::NotInitialized)
    }

    /// Linearly interpolate price between `start_price` and `end_price`.
    ///
    /// - Before or at start: returns `start_price`.
    /// - At or after end: returns `end_price` (inclusive at boundary `t = end_time`).
    /// - Between start and end: `start_price - (price_drop * elapsed) / duration`.
    fn calculate_price(auction: &Auction, timestamp: u64) -> Result<i128, Error> {
        if timestamp <= auction.start_time {
            return Ok(auction.start_price);
        }

        let end_time = auction
            .start_time
            .checked_add(auction.duration)
            .ok_or(Error::ArithmeticOverflow)?;

        if timestamp >= end_time {
            return Ok(auction.end_price);
        }

        let elapsed = i128::from(timestamp - auction.start_time);
        let total_duration = i128::from(auction.duration);
        let price_drop = auction
            .start_price
            .checked_sub(auction.end_price)
            .ok_or(Error::ArithmeticOverflow)?;

        let decayed = price_drop
            .checked_mul(elapsed)
            .ok_or(Error::ArithmeticOverflow)?
            .checked_div(total_duration)
            .ok_or(Error::ArithmeticOverflow)?;

        auction
            .start_price
            .checked_sub(decayed)
            .ok_or(Error::ArithmeticOverflow)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env,
    };

    const BASE_TIME: u64 = 1_000_000;
    const DURATION: u64 = 1_000;
    const START_PRICE: i128 = 10_000;
    const END_PRICE: i128 = 2_000;

    struct Fixture {
        env: Env,
        seller: Address,
        buyer: Address,
        token: Address,
        client: DutchAuctionClient<'static>,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();
        set_time(&env, BASE_TIME);

        let seller = Address::generate(&env);
        let buyer = Address::generate(&env);
        let token_admin = Address::generate(&env);

        let token = env
            .register_stellar_asset_contract_v2(token_admin)
            .address();
        token::StellarAssetClient::new(&env, &token).mint(&buyer, &(START_PRICE * 2));

        let contract_id = env.register(DutchAuction, ());
        let client = DutchAuctionClient::new(&env, &contract_id);

        Fixture {
            env,
            seller,
            buyer,
            token,
            client,
        }
    }

    fn set_time(env: &Env, timestamp: u64) {
        env.ledger().with_mut(|li| {
            li.timestamp = timestamp;
            li.sequence_number += 1;
        });
    }

    fn advance_time(env: &Env, seconds: u64) {
        env.ledger().with_mut(|li| {
            li.timestamp += seconds;
            li.sequence_number += 1;
        });
    }

    fn init_default(fixture: &Fixture) {
        fixture.client.initialize(
            &fixture.seller,
            &fixture.token,
            &START_PRICE,
            &END_PRICE,
            &DURATION,
        );
    }

    fn token_client<'a>(fixture: &'a Fixture) -> token::Client<'a> {
        token::Client::new(&fixture.env, &fixture.token)
    }

    // ── Price Function Tests ──────────────────────────────────────────────────

    #[test]
    fn test_price_at_t0_equals_start_price() {
        let fixture = setup();
        init_default(&fixture);

        // Price at exactly start time
        assert_eq!(fixture.client.current_price(), START_PRICE);
        assert_eq!(fixture.client.price_at(&BASE_TIME), START_PRICE);

        // Price before start time
        assert_eq!(fixture.client.price_at(&(BASE_TIME - 100)), START_PRICE);
    }

    #[test]
    fn test_price_at_t_mid_equals_interpolated_value() {
        let fixture = setup();
        init_default(&fixture);

        let mid_time = BASE_TIME + (DURATION / 2);
        let expected_mid_price = START_PRICE - ((START_PRICE - END_PRICE) * 500) / 1_000;
        // 10000 - (8000 * 500) / 1000 = 10000 - 4000 = 6000
        assert_eq!(expected_mid_price, 6_000);

        // Using price_at helper
        assert_eq!(fixture.client.price_at(&mid_time), 6_000);

        // Advancing ledger time to t_mid
        advance_time(&fixture.env, DURATION / 2);
        assert_eq!(fixture.client.current_price(), 6_000);
    }

    #[test]
    fn test_price_at_quarter_and_three_quarters() {
        let fixture = setup();
        init_default(&fixture);

        // At 25% duration: elapsed = 250
        // 10000 - (8000 * 250) / 1000 = 10000 - 2000 = 8000
        let quarter_time = BASE_TIME + 250;
        assert_eq!(fixture.client.price_at(&quarter_time), 8_000);

        // At 75% duration: elapsed = 750
        // 10000 - (8000 * 750) / 1000 = 10000 - 6000 = 4000
        let three_quarter_time = BASE_TIME + 750;
        assert_eq!(fixture.client.price_at(&three_quarter_time), 4_000);
    }

    #[test]
    fn test_price_at_exact_duration_boundary() {
        let fixture = setup();
        init_default(&fixture);

        let end_time = BASE_TIME + DURATION;
        assert_eq!(fixture.client.price_at(&end_time), END_PRICE);

        advance_time(&fixture.env, DURATION);
        assert_eq!(fixture.client.current_price(), END_PRICE);
    }

    #[test]
    fn test_price_after_end_equals_end_price() {
        let fixture = setup();
        init_default(&fixture);

        // Timestamps well past auction expiration
        assert_eq!(
            fixture.client.price_at(&(BASE_TIME + DURATION + 1)),
            END_PRICE
        );
        assert_eq!(
            fixture.client.price_at(&(BASE_TIME + DURATION * 5)),
            END_PRICE
        );

        advance_time(&fixture.env, DURATION * 2);
        assert_eq!(fixture.client.current_price(), END_PRICE);
    }

    #[test]
    fn test_price_when_start_price_equals_end_price() {
        let fixture = setup();
        const FIXED_PRICE: i128 = 5_000;
        fixture.client.initialize(
            &fixture.seller,
            &fixture.token,
            &FIXED_PRICE,
            &FIXED_PRICE,
            &DURATION,
        );

        assert_eq!(fixture.client.price_at(&BASE_TIME), FIXED_PRICE);
        assert_eq!(
            fixture.client.price_at(&(BASE_TIME + DURATION / 2)),
            FIXED_PRICE
        );
        assert_eq!(
            fixture.client.price_at(&(BASE_TIME + DURATION)),
            FIXED_PRICE
        );
        assert_eq!(
            fixture.client.price_at(&(BASE_TIME + DURATION * 2)),
            FIXED_PRICE
        );
    }

    // ── Buy Tests ─────────────────────────────────────────────────────────────

    #[test]
    fn test_buy_succeeds_at_t0_transfers_start_price() {
        let fixture = setup();
        init_default(&fixture);

        let paid = fixture.client.buy(&fixture.buyer);
        assert_eq!(paid, START_PRICE);

        // Verification of state
        let auction = fixture.client.auction();
        assert_eq!(auction.state, AuctionState::Sold);
        assert_eq!(auction.buyer, Some(fixture.buyer.clone()));
        assert_eq!(auction.final_price, Some(START_PRICE));
        assert_eq!(auction.settled_at, Some(BASE_TIME));

        // Token balance transfers
        assert_eq!(token_client(&fixture).balance(&fixture.seller), START_PRICE);
        assert_eq!(token_client(&fixture).balance(&fixture.buyer), START_PRICE);
    }

    #[test]
    fn test_buy_succeeds_at_midpoint_transfers_interpolated_price() {
        let fixture = setup();
        init_default(&fixture);

        advance_time(&fixture.env, DURATION / 2);
        let paid = fixture.client.buy(&fixture.buyer);
        assert_eq!(paid, 6_000);

        let auction = fixture.client.auction();
        assert_eq!(auction.state, AuctionState::Sold);
        assert_eq!(auction.buyer, Some(fixture.buyer.clone()));
        assert_eq!(auction.final_price, Some(6_000));
        assert_eq!(auction.settled_at, Some(BASE_TIME + DURATION / 2));

        assert_eq!(token_client(&fixture).balance(&fixture.seller), 6_000);
        assert_eq!(
            token_client(&fixture).balance(&fixture.buyer),
            (START_PRICE * 2) - 6_000
        );
    }

    #[test]
    fn test_buy_fails_after_auction_ended() {
        let fixture = setup();
        init_default(&fixture);

        // Advance 1 second past auction duration
        advance_time(&fixture.env, DURATION + 1);

        let result = fixture.client.try_buy(&fixture.buyer);
        assert_eq!(result, Err(Ok(Error::AuctionEnded)));

        // Verify no funds were transferred
        assert_eq!(token_client(&fixture).balance(&fixture.seller), 0);
        assert_eq!(
            token_client(&fixture).balance(&fixture.buyer),
            START_PRICE * 2
        );
    }

    #[test]
    fn test_buy_fails_at_exact_duration_boundary() {
        let fixture = setup();
        init_default(&fixture);

        // Advance exactly to end_time
        advance_time(&fixture.env, DURATION);

        let result = fixture.client.try_buy(&fixture.buyer);
        assert_eq!(result, Err(Ok(Error::AuctionEnded)));
    }

    #[test]
    fn test_buy_fails_if_already_sold() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.buy(&fixture.buyer);

        let second_buyer = Address::generate(&fixture.env);
        let result = fixture.client.try_buy(&second_buyer);
        assert_eq!(result, Err(Ok(Error::AuctionNotActive)));
    }

    #[test]
    fn test_buy_fails_if_closed() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.close();

        let result = fixture.client.try_buy(&fixture.buyer);
        assert_eq!(result, Err(Ok(Error::AuctionNotActive)));
    }

    #[test]
    fn test_buy_fails_if_seller_is_buyer() {
        let fixture = setup();
        init_default(&fixture);

        let result = fixture.client.try_buy(&fixture.seller);
        assert_eq!(result, Err(Ok(Error::SellerCannotBuy)));
    }

    // ── Close Tests ───────────────────────────────────────────────────────────

    #[test]
    fn test_close_succeeds_by_seller() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.close();

        let auction = fixture.client.auction();
        assert_eq!(auction.state, AuctionState::Closed);
        assert_eq!(auction.settled_at, Some(BASE_TIME));
    }

    #[test]
    fn test_close_fails_if_already_sold() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.buy(&fixture.buyer);

        let result = fixture.client.try_close();
        assert_eq!(result, Err(Ok(Error::AuctionNotActive)));
    }

    #[test]
    fn test_close_fails_if_already_closed() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.close();

        let result = fixture.client.try_close();
        assert_eq!(result, Err(Ok(Error::AuctionNotActive)));
    }

    // ── Initialization & Validation Tests ─────────────────────────────────────

    #[test]
    fn test_initialize_records_auction_data() {
        let fixture = setup();
        init_default(&fixture);

        let auction = fixture.client.auction();
        assert_eq!(auction.seller, fixture.seller);
        assert_eq!(auction.token, fixture.token);
        assert_eq!(auction.start_price, START_PRICE);
        assert_eq!(auction.end_price, END_PRICE);
        assert_eq!(auction.start_time, BASE_TIME);
        assert_eq!(auction.duration, DURATION);
        assert_eq!(auction.state, AuctionState::Active);
        assert_eq!(auction.buyer, None);
        assert_eq!(auction.final_price, None);
        assert_eq!(auction.settled_at, None);

        assert_eq!(fixture.client.start_price(), START_PRICE);
        assert_eq!(fixture.client.end_price(), END_PRICE);
        assert_eq!(fixture.client.start_time(), BASE_TIME);
        assert_eq!(fixture.client.end_time(), BASE_TIME + DURATION);
        assert_eq!(fixture.client.duration(), DURATION);
        assert_eq!(fixture.client.seller(), fixture.seller);
        assert_eq!(fixture.client.token(), fixture.token);
        assert_eq!(fixture.client.state(), AuctionState::Active);
    }

    #[test]
    fn test_initialize_rejects_invalid_prices() {
        let fixture = setup();

        // start_price <= 0
        let res1 = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &0,
            &END_PRICE,
            &DURATION,
        );
        assert_eq!(res1, Err(Ok(Error::InvalidPrice)));

        let res2 = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &-100,
            &END_PRICE,
            &DURATION,
        );
        assert_eq!(res2, Err(Ok(Error::InvalidPrice)));

        // end_price < 0
        let res3 = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &START_PRICE,
            &-1,
            &DURATION,
        );
        assert_eq!(res3, Err(Ok(Error::InvalidPrice)));

        // start_price < end_price
        let res4 = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &1_000,
            &2_000,
            &DURATION,
        );
        assert_eq!(res4, Err(Ok(Error::InvalidPrice)));
    }

    #[test]
    fn test_initialize_rejects_zero_duration() {
        let fixture = setup();
        let res = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &START_PRICE,
            &END_PRICE,
            &0,
        );
        assert_eq!(res, Err(Ok(Error::InvalidDuration)));
    }

    #[test]
    fn test_initialize_rejects_double_initialization() {
        let fixture = setup();
        init_default(&fixture);

        let res = fixture.client.try_initialize(
            &fixture.seller,
            &fixture.token,
            &START_PRICE,
            &END_PRICE,
            &DURATION,
        );
        assert_eq!(res, Err(Ok(Error::AlreadyInitialized)));
    }

    // ── Time Remaining & View Helper Tests ────────────────────────────────────

    #[test]
    fn test_time_remaining_decreases_and_hits_zero() {
        let fixture = setup();
        init_default(&fixture);

        assert_eq!(fixture.client.time_remaining(), DURATION);

        advance_time(&fixture.env, DURATION / 2);
        assert_eq!(fixture.client.time_remaining(), DURATION / 2);

        advance_time(&fixture.env, DURATION / 2);
        assert_eq!(fixture.client.time_remaining(), 0);

        advance_time(&fixture.env, 100);
        assert_eq!(fixture.client.time_remaining(), 0);
    }

    #[test]
    fn test_time_remaining_zero_after_sold_or_closed() {
        let fixture = setup();
        init_default(&fixture);

        fixture.client.buy(&fixture.buyer);
        assert_eq!(fixture.client.time_remaining(), 0);
    }

    #[test]
    fn test_views_fail_before_initialization() {
        let fixture = setup();

        assert_eq!(fixture.client.try_auction(), Err(Ok(Error::NotInitialized)));
        assert_eq!(
            fixture.client.try_current_price(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_price_at(&BASE_TIME),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_start_price(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_end_price(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_start_time(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_end_time(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(
            fixture.client.try_duration(),
            Err(Ok(Error::NotInitialized))
        );
        assert_eq!(fixture.client.try_seller(), Err(Ok(Error::NotInitialized)));
        assert_eq!(fixture.client.try_token(), Err(Ok(Error::NotInitialized)));
        assert_eq!(fixture.client.try_state(), Err(Ok(Error::NotInitialized)));
        assert_eq!(
            fixture.client.try_time_remaining(),
            Err(Ok(Error::NotInitialized))
        );
    }
}
