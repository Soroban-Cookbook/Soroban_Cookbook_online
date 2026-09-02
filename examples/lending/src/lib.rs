//! # Lending Pool (simplified, NOT production-ready)
//!
//! A minimal collateralized lending protocol: one collateral token, one debt
//! token, and a price oracle. Users deposit collateral, borrow debt against
//! it up to a maximum loan-to-value (LTV), repay debt, withdraw collateral,
//! and can be liquidated when the position becomes under-collateralized.
//!
//! > **WARNING — educational example only.** This contract is deliberately
//! > simplified and is **not production-ready**. It omits interest accrual,
//! > multi-asset pools, partial-liquidation sizing, oracle manipulation
//! > defenses (TWAP, deviation bounds), governance, and upgrade safety. See
//! > `documentation/docs/security/defi-patterns.md` section 7 ("Lending
//! > Protocol Security") for the full risk list.
//!
//! ## Design
//!
//! - **Oracle**: an external oracle contract exposes
//!   `price(Address) -> (i128 price, u64 timestamp)` giving the collateral
//!   price in debt-token units. Every price read carries a timestamp; the
//!   pool rejects prices older than `max_price_age` seconds
//!   (`Error::StalePrice`). A mock oracle in the tests shows the interface.
//! - **LTV**: borrowing is allowed only while
//!   `debt_value <= collateral_value * max_ltv_bps / 10_000`.
//! - **Liquidation**: anyone may liquidate a position whose
//!   `debt_value > collateral_value * liquidate_threshold_bps / 10_000`.
//!   The liquidator repays `debt_repay_amount` of debt and receives that
//!   amount plus a bonus (`debt_repay_amount * liquidation_bonus_bps /
//!   10_000`) of the borrower's collateral — the classic liquidation
//!   incentive.
//!
//! ## Arithmetic
//!
//! All token arithmetic uses `checked_*` operations and returns
//! `Error::Overflow` instead of panicking, following the convention in
//! [`staking`](../staking) and [`flash-loan`](../flash-loan).

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

// ── constants ────────────────────────────────────────────────────────────────

/// Denominator for basis-point LTV, threshold, and bonus calculations.
const BPS_DENOMINATOR: i128 = 10_000;

// ── storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    CollateralToken,
    DebtToken,
    Oracle,
    OracleDecimals,
    MaxPriceAge,
    MaxLtvBps,
    LiquidateThresholdBps,
    LiquidationBonusBps,
    TotalCollateral,
    TotalDebt,
    Position(Address),
}

// ── per-user position record ─────────────────────────────────────────────────

/// Collateral and debt balances for one user.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    /// Collateral tokens deposited by the user.
    pub collateral: i128,
    /// Debt tokens owed by the user.
    pub debt: i128,
}

// ── error taxonomy ───────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract already initialized.
    AlreadyInitialized = 1,
    /// Called before `initialize`.
    NotInitialized = 2,
    /// Only the admin may call this function.
    Unauthorized = 3,
    /// Amount must be positive.
    InvalidAmount = 4,
    /// Parameter out of range (bps >= 10_000, price age 0, or decimals > 18).
    InvalidParameter = 5,
    /// Borrow would push debt above the maximum LTV.
    InsufficientCollateral = 6,
    /// Caller has no outstanding debt to repay.
    NothingToRepay = 7,
    /// Withdraw would leave the position above the maximum LTV.
    WithdrawExceedsLtv = 9,
    /// The pool cannot cover this operation with its current reserves.
    InsufficientPoolLiquidity = 10,
    /// Position is healthy and cannot be liquidated.
    PositionHealthy = 11,
    /// Oracle price is stale (older than `max_price_age` seconds).
    StalePrice = 12,
    /// Oracle returned an invalid (non-positive) price.
    InvalidPrice = 13,
    /// An arithmetic operation overflowed i128.
    Overflow = 14,
}

// ── contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct LendingPool;

#[contractimpl]
impl LendingPool {
    // ── admin ────────────────────────────────────────────────────────────────

    /// Initialize the pool.
    ///
    /// - `admin`                   — address allowed to update risk parameters
    /// - `collateral_token`        — token users deposit as collateral
    /// - `debt_token`              — token the pool lends out
    /// - `oracle`                  — contract exposing `price(Address) -> (i128, u64)`
    /// - `oracle_decimals`         — decimals of the oracle price (price is scaled
    ///                               by 10^oracle_decimals; ≤ 18)
    /// - `max_price_age`           — maximum acceptable oracle price age (seconds, > 0)
    /// - `max_ltv_bps`             — maximum debt value per collateral value (bps, < 10_000)
    /// - `liquidate_threshold_bps` — debt/collateral ratio that enables liquidation (bps)
    /// - `liquidation_bonus_bps`   — extra collateral paid to liquidators (bps, < 10_000)
    #[allow(clippy::too_many_arguments)]
    pub fn initialize(
        env: Env,
        admin: Address,
        collateral_token: Address,
        debt_token: Address,
        oracle: Address,
        oracle_decimals: u32,
        max_price_age: u64,
        max_ltv_bps: u32,
        liquidate_threshold_bps: u32,
        liquidation_bonus_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if max_price_age == 0 || oracle_decimals > 18 {
            return Err(Error::InvalidParameter);
        }
        // All ratio parameters are fractions of BPS_DENOMINATOR.
        for bps in [max_ltv_bps, liquidate_threshold_bps, liquidation_bonus_bps] {
            if bps as i128 >= BPS_DENOMINATOR {
                return Err(Error::InvalidParameter);
            }
        }

        admin.require_auth();

        let storage = env.storage().instance();
        storage.set(&DataKey::Admin, &admin);
        storage.set(&DataKey::CollateralToken, &collateral_token);
        storage.set(&DataKey::DebtToken, &debt_token);
        storage.set(&DataKey::Oracle, &oracle);
        storage.set(&DataKey::OracleDecimals, &oracle_decimals);
        storage.set(&DataKey::MaxPriceAge, &max_price_age);
        storage.set(&DataKey::MaxLtvBps, &max_ltv_bps);
        storage.set(&DataKey::LiquidateThresholdBps, &liquidate_threshold_bps);
        storage.set(&DataKey::LiquidationBonusBps, &liquidation_bonus_bps);
        storage.set(&DataKey::TotalCollateral, &0_i128);
        storage.set(&DataKey::TotalDebt, &0_i128);

        Ok(())
    }

    /// Update risk parameters. Admin only. All bps parameters must be < 10_000.
    pub fn set_risk_parameters(
        env: Env,
        max_ltv_bps: u32,
        liquidate_threshold_bps: u32,
        liquidation_bonus_bps: u32,
    ) -> Result<(), Error> {
        for bps in [max_ltv_bps, liquidate_threshold_bps, liquidation_bonus_bps] {
            if bps as i128 >= BPS_DENOMINATOR {
                return Err(Error::InvalidParameter);
            }
        }
        let admin = Self::require_admin(&env)?;
        admin.require_auth();

        let storage = env.storage().instance();
        storage.set(&DataKey::MaxLtvBps, &max_ltv_bps);
        storage.set(&DataKey::LiquidateThresholdBps, &liquidate_threshold_bps);
        storage.set(&DataKey::LiquidationBonusBps, &liquidation_bonus_bps);
        Ok(())
    }

    // ── user actions ─────────────────────────────────────────────────────────

    /// Deposit `amount` collateral tokens on behalf of `user`.
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        user.require_auth();
        Self::require_initialized(&env)?;

        let collateral = token::Client::new(&env, &Self::collateral_token(&env)?);
        collateral.transfer(&user, &env.current_contract_address(), &amount);

        let mut pos = Self::load_position(&env, &user);
        pos.collateral = pos
            .collateral
            .checked_add(amount)
            .ok_or(Error::Overflow)?;
        Self::save_position(&env, &user, &pos);

        let total = Self::total_collateral(env.clone());
        let new_total = total.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalCollateral, &new_total);

        Ok(())
    }

    /// Borrow `amount` debt tokens against deposited collateral.
    ///
    /// The position must satisfy the maximum LTV at the current oracle price,
    /// and the pool must hold enough debt tokens to pay out the loan.
    pub fn borrow(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        user.require_auth();
        Self::require_initialized(&env)?;

        let price = Self::oracle_price(env.clone())?;

        let mut pos = Self::load_position(&env, &user);
        let new_debt = pos.debt.checked_add(amount).ok_or(Error::Overflow)?;

        // collateral_value = collateral * price (price is already in raw
        // debt-token units — oracle_price un-scales it)
        // max_debt_value   = collateral_value * max_ltv_bps / 10_000
        // Chain checked multiplications; each can overflow independently.
        let collateral_value = pos
            .collateral
            .checked_mul(price)
            .ok_or(Error::Overflow)?;
        let max_ltv_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxLtvBps)
            .unwrap_or(0);
        let max_debt_value = collateral_value
            .checked_mul(max_ltv_bps as i128)
            .ok_or(Error::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(Error::Overflow)?;
        if new_debt > max_debt_value {
            return Err(Error::InsufficientCollateral);
        }

        // The pool must actually hold the debt tokens it is lending out.
        let debt_token = token::Client::new(&env, &Self::debt_token(&env)?);
        if debt_token.balance(&env.current_contract_address()) < amount {
            return Err(Error::InsufficientPoolLiquidity);
        }

        pos.debt = new_debt;
        Self::save_position(&env, &user, &pos);

        let total_debt = Self::total_debt(env.clone());
        let new_total_debt = total_debt.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDebt, &new_total_debt);

        debt_token.transfer(&env.current_contract_address(), &user, &amount);

        Ok(())
    }

    /// Repay `amount` of outstanding debt. Returns the amount actually
    /// repaid (capped at the outstanding debt).
    pub fn repay(env: Env, user: Address, amount: i128) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        user.require_auth();
        Self::require_initialized(&env)?;

        let mut pos = Self::load_position(&env, &user);
        if pos.debt == 0 {
            return Err(Error::NothingToRepay);
        }
        let repaid = amount.min(pos.debt);

        let debt_token = token::Client::new(&env, &Self::debt_token(&env)?);
        debt_token.transfer(&user, &env.current_contract_address(), &repaid);

        // repaid <= pos.debt is guaranteed above; checked_sub guards against
        // state corruption.
        pos.debt = pos.debt.checked_sub(repaid).ok_or(Error::Overflow)?;
        Self::save_position(&env, &user, &pos);

        let total_debt = Self::total_debt(env.clone());
        let new_total_debt = total_debt.checked_sub(repaid).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDebt, &new_total_debt);

        Ok(repaid)
    }

    /// Withdraw `amount` of collateral. The remaining position must still
    /// satisfy the maximum LTV at the current oracle price.
    pub fn withdraw(env: Env, user: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        user.require_auth();
        Self::require_initialized(&env)?;

        let price = Self::oracle_price(env.clone())?;

        let mut pos = Self::load_position(&env, &user);
        if amount > pos.collateral {
            return Err(Error::InvalidAmount);
        }

        let new_collateral = pos
            .collateral
            .checked_sub(amount)
            .ok_or(Error::Overflow)?;
        let collateral_value = new_collateral
            .checked_mul(price)
            .ok_or(Error::Overflow)?;
        let max_ltv_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MaxLtvBps)
            .unwrap_or(0);
        let max_debt_value = collateral_value
            .checked_mul(max_ltv_bps as i128)
            .ok_or(Error::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(Error::Overflow)?;
        if pos.debt > max_debt_value {
            return Err(Error::WithdrawExceedsLtv);
        }

        pos.collateral = new_collateral;
        Self::save_position(&env, &user, &pos);

        let total = Self::total_collateral(env.clone());
        let new_total = total.checked_sub(amount).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalCollateral, &new_total);

        let collateral = token::Client::new(&env, &Self::collateral_token(&env)?);
        collateral.transfer(&env.current_contract_address(), &user, &amount);

        Ok(())
    }

    /// Liquidate an under-collateralized position.
    ///
    /// Anyone may call this when the position's debt value exceeds
    /// `collateral_value * liquidate_threshold_bps / 10_000` at the current
    /// oracle price. The liquidator transfers `debt_repay_amount` of debt
    /// tokens to the pool and receives that amount plus a bonus of the
    /// borrower's collateral.
    pub fn liquidate(
        env: Env,
        user: Address,
        liquidator: Address,
        debt_repay_amount: i128,
    ) -> Result<(), Error> {
        if debt_repay_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        liquidator.require_auth();
        Self::require_initialized(&env)?;

        let price = Self::oracle_price(env.clone())?;

        let pos = Self::load_position(&env, &user);
        if pos.debt == 0 {
            return Err(Error::NothingToRepay);
        }

        // Health check: the outstanding debt (already in raw debt-token units,
        // like borrow/withdraw compare `debt` against a collateral-derived
        // cap) must exceed collateral_value * threshold. `collateral_value`
        // is in raw debt-token units because `price` is un-scaled.
        let collateral_value = pos
            .collateral
            .checked_mul(price)
            .ok_or(Error::Overflow)?;
        let threshold_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LiquidateThresholdBps)
            .unwrap_or(0);
        let threshold_value = collateral_value
            .checked_mul(threshold_bps as i128)
            .ok_or(Error::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(Error::Overflow)?;
        if pos.debt <= threshold_value {
            return Err(Error::PositionHealthy);
        }

        let repay = debt_repay_amount.min(pos.debt);

        // The liquidator must actually hold the debt tokens it repays.
        let debt_token = token::Client::new(&env, &Self::debt_token(&env)?);
        if debt_token.balance(&liquidator) < repay {
            return Err(Error::InsufficientPoolLiquidity);
        }

        // Bonus collateral = repay * bonus_bps / 10_000, capped at the
        // borrower's remaining collateral.
        let bonus_bps: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LiquidationBonusBps)
            .unwrap_or(0);
        let bonus = repay
            .checked_mul(bonus_bps as i128)
            .ok_or(Error::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(Error::Overflow)?;
        let collateral_due = repay
            .checked_add(bonus)
            .ok_or(Error::Overflow)?
            .min(pos.collateral);

        // Effects: transfer debt in, reduce debt, move collateral out.
        debt_token.transfer(&liquidator, &env.current_contract_address(), &repay);

        let new_debt = pos.debt.checked_sub(repay).ok_or(Error::Overflow)?;
        let new_collateral = pos
            .collateral
            .checked_sub(collateral_due)
            .ok_or(Error::Overflow)?;
        Self::save_position(
            &env,
            &user,
            &Position { collateral: new_collateral, debt: new_debt },
        );

        let total = Self::total_collateral(env.clone());
        let new_total = total
            .checked_sub(collateral_due)
            .ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalCollateral, &new_total);

        let total_debt = Self::total_debt(env.clone());
        let new_total_debt = total_debt.checked_sub(repay).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalDebt, &new_total_debt);

        let collateral = token::Client::new(&env, &Self::collateral_token(&env)?);
        collateral.transfer(&env.current_contract_address(), &liquidator, &collateral_due);

        Ok(())
    }

    // ── view functions ───────────────────────────────────────────────────────

    /// Return the position for `user`.
    pub fn position(env: Env, user: Address) -> Position {
        Self::load_position(&env, &user)
    }

    /// Return the current oracle price **in debt-token units** (i.e. the raw
    /// oracle price divided by 10^oracle_decimals). Rejects stale or
    /// non-positive prices.
    pub fn oracle_price(env: Env) -> Result<i128, Error> {
        let oracle = Self::oracle(&env)?;
        // Expected oracle interface: price(Address) -> (i128 price, u64 timestamp)
        let (price, timestamp): (i128, u64) = env.invoke_contract(
            &oracle,
            &soroban_sdk::symbol_short!("price"),
            soroban_sdk::vec![&env, env.current_contract_address().to_val()],
        );

        if price <= 0 {
            return Err(Error::InvalidPrice);
        }
        let max_age: u64 = env
            .storage()
            .instance()
            .get(&DataKey::MaxPriceAge)
            .unwrap_or(0);
        let now = env.ledger().timestamp();
        let age = now.checked_sub(timestamp).ok_or(Error::StalePrice)?;
        if age > max_age {
            return Err(Error::StalePrice);
        }
        // Un-scale the price to debt-token units so LTV/liquidation math
        // compares like with like (raw debt vs raw collateral value).
        let decimals: u32 = env
            .storage()
            .instance()
            .get(&DataKey::OracleDecimals)
            .unwrap_or(0);
        let scale = i128::checked_pow(10, decimals).ok_or(Error::Overflow)?;
        price.checked_div(scale).ok_or(Error::Overflow)
    }

    /// Return total collateral held by the pool.
    pub fn total_collateral(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalCollateral)
            .unwrap_or(0)
    }

    /// Return total outstanding debt across all users.
    pub fn total_debt(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalDebt)
            .unwrap_or(0)
    }

    // ── internal helpers ─────────────────────────────────────────────────────

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn require_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn load_position(env: &Env, user: &Address) -> Position {
        env.storage()
            .persistent()
            .get(&DataKey::Position(user.clone()))
            .unwrap_or(Position { collateral: 0, debt: 0 })
    }

    fn save_position(env: &Env, user: &Address, pos: &Position) {
        env.storage()
            .persistent()
            .set(&DataKey::Position(user.clone()), pos);
    }

    fn collateral_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::CollateralToken)
            .ok_or(Error::NotInitialized)
    }

    fn debt_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::DebtToken)
            .ok_or(Error::NotInitialized)
    }

    fn oracle(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Oracle)
            .ok_or(Error::NotInitialized)
    }
}

// ── tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        contractimpl,
        testutils::{Address as _, Ledger, LedgerInfo},
        token::{StellarAssetClient, TokenClient},
        Symbol,
    };

    /// Mock oracle contract for testing. Stores a price and the timestamp of
    /// the last update; tests advance the ledger timestamp to make it stale.
    #[contract]
    pub struct MockOracle;

    #[contractimpl]
    impl MockOracle {
        /// Set the price and stamp it with the current ledger timestamp.
        pub fn set_price(env: Env, price: i128) {
            env.storage()
                .instance()
                .set(&Symbol::new(&env, "price"), &price);
            env.storage()
                .instance()
                .set(&Symbol::new(&env, "ts"), &env.ledger().timestamp());
        }

        /// Interface expected by the pool: (price, timestamp_of_last_update).
        pub fn price(env: Env, _who: Address) -> (i128, u64) {
            let price: i128 = env
                .storage()
                .instance()
                .get(&Symbol::new(&env, "price"))
                .unwrap_or(0);
            let ts: u64 = env
                .storage()
                .instance()
                .get(&Symbol::new(&env, "ts"))
                .unwrap_or(0);
            (price, ts)
        }
    }

    /// Default risk parameters: price 1.0 (6 decimals), max LTV 75%,
    /// liquidation threshold 85%, liquidation bonus 5%.
    /// Oracle price has 6 decimals: 1_000_000 represents 1.0 debt-token units.
    const ORACLE_DECIMALS: u32 = 6;
    const PRICE: i128 = 1_000_000;
    const MAX_LTV_BPS: u32 = 7_500;
    const LIQ_THRESHOLD_BPS: u32 = 8_500;
    const LIQ_BONUS_BPS: u32 = 500;
    const MAX_PRICE_AGE: u64 = 3_600;
    const T0: u64 = 1_000_000;

    fn set_ledger_timestamp(env: &Env, timestamp: u64) {
        env.ledger().set(LedgerInfo {
            protocol_version: 27,
            sequence_number: env.ledger().sequence(),
            timestamp,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });
    }

    /// Fixture with everything wired: tokens, mock oracle, pool.
    /// The user holds 10_000 collateral tokens; the pool holds 10_000 debt
    /// tokens so borrows can pay out.
    struct Fixture {
        env: Env,
        admin: Address,
        user: Address,
        liquidator: Address,
        collateral: Address,
        debt: Address,
        oracle_id: Address,
        client: LendingPoolClient<'static>,
        coll: TokenClient<'static>,
        debt_tok: TokenClient<'static>,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set(LedgerInfo {
            protocol_version: 27,
            sequence_number: 1,
            timestamp: T0,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 1,
            min_persistent_entry_ttl: 1,
            max_entry_ttl: 6_312_000,
        });

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let liquidator = Address::generate(&env);

        let pool_id = env.register(LendingPool, ());

        let collateral_addr = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        StellarAssetClient::new(&env, &collateral_addr).mint(&user, &10_000);

        let debt_addr = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        StellarAssetClient::new(&env, &debt_addr).mint(&pool_id, &10_000);

        let oracle_id = env.register(MockOracle, ());
        MockOracleClient::new(&env, &oracle_id).set_price(&PRICE);

        let client = LendingPoolClient::new(&env, &pool_id);
        client.initialize(
            &admin,
            &collateral_addr,
            &debt_addr,
            &oracle_id,
            &ORACLE_DECIMALS,
            &MAX_PRICE_AGE,
            &MAX_LTV_BPS,
            &LIQ_THRESHOLD_BPS,
            &LIQ_BONUS_BPS,
        );

        Fixture {
            env: env.clone(),
            admin,
            user,
            liquidator,
            collateral: collateral_addr.clone(),
            debt: debt_addr.clone(),
            oracle_id,
            client,
            coll: TokenClient::new(&env, &collateral_addr.clone()),
            debt_tok: TokenClient::new(&env, &debt_addr.clone()),
        }
    }

    // ── initialization / parameters ─────────────────────────────────────

    #[test]
    fn test_initialize_sets_state() {
        let fx = setup();
        assert_eq!(fx.client.total_collateral(), 0);
        assert_eq!(fx.client.total_debt(), 0);
        let empty = fx.client.position(&Address::generate(&fx.env));
        assert_eq!(empty.collateral, 0);
        assert_eq!(empty.debt, 0);
    }

    #[test]
    fn test_double_initialize_is_rejected() {
        let fx = setup();
        let result = fx.client.try_initialize(
            &fx.admin,
            &fx.collateral,
            &fx.debt,
            &fx.oracle_id,
            &ORACLE_DECIMALS,
            &MAX_PRICE_AGE,
            &MAX_LTV_BPS,
            &LIQ_THRESHOLD_BPS,
            &LIQ_BONUS_BPS,
        );
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_invalid_ltv_parameter_is_rejected() {
        let fx = setup();
        // Any bps parameter >= 10_000 is invalid.
        let result = fx.client.try_set_risk_parameters(
            &(BPS_DENOMINATOR as u32),
            &LIQ_THRESHOLD_BPS,
            &LIQ_BONUS_BPS,
        );
        assert_eq!(result, Err(Ok(Error::InvalidParameter)));
    }

    #[test]
    fn test_set_risk_parameters_updates_values() {
        let fx = setup();
        fx.client.set_risk_parameters(&8_000, &9_000, &1_000);
        // Observable through behavior: with LTV 80%, borrowing 800 of 1_000
        // collateral now succeeds.
        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &800);
        assert_eq!(fx.client.position(&fx.user).debt, 800);
    }

    // ── deposit ─────────────────────────────────────────────────────────

    #[test]
    fn test_deposit_increases_position_and_pool_total() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        let pos = fx.client.position(&fx.user);
        assert_eq!(pos.collateral, 1_000);
        assert_eq!(pos.debt, 0);
        assert_eq!(fx.client.total_collateral(), 1_000);
        assert_eq!(fx.coll.balance(&fx.client.address), 1_000);
        assert_eq!(fx.coll.balance(&fx.user), 9_000);
    }

    #[test]
    fn test_deposit_zero_is_rejected() {
        let fx = setup();
        assert_eq!(
            fx.client.try_deposit(&fx.user, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    #[test]
    fn test_deposit_negative_is_rejected() {
        let fx = setup();
        assert_eq!(
            fx.client.try_deposit(&fx.user, &-100),
            Err(Ok(Error::InvalidAmount))
        );
    }

    // ── borrow: LTV enforcement ─────────────────────────────────────────

    #[test]
    fn test_borrow_within_ltv_succeeds() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        // Price 1.0; max LTV 75% of 1_000 collateral value = 750 debt.
        fx.client.borrow(&fx.user, &700);

        let pos = fx.client.position(&fx.user);
        assert_eq!(pos.debt, 700);
        assert_eq!(fx.debt_tok.balance(&fx.user), 700);
        assert_eq!(fx.client.total_debt(), 700);
    }

    #[test]
    fn test_borrow_above_max_ltv_is_rejected() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        // 800 > 75% of 1_000 = 750.
        assert_eq!(
            fx.client.try_borrow(&fx.user, &800),
            Err(Ok(Error::InsufficientCollateral))
        );
    }

    #[test]
    fn test_cumulative_borrow_respects_max_ltv() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &500);
        // 500 + 300 = 800 > 750.
        assert_eq!(
            fx.client.try_borrow(&fx.user, &300),
            Err(Ok(Error::InsufficientCollateral))
        );
        // 500 + 250 = 750 is exactly at the limit and succeeds.
        fx.client.borrow(&fx.user, &250);
        assert_eq!(fx.client.position(&fx.user).debt, 750);
    }

    #[test]
    fn test_borrow_zero_is_rejected() {
        let fx = setup();
        fx.client.deposit(&fx.user, &1_000);
        assert_eq!(
            fx.client.try_borrow(&fx.user, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    // ── repay ───────────────────────────────────────────────────────────

    #[test]
    fn test_repay_reduces_debt() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        let repaid = fx.client.repay(&fx.user, &300);
        assert_eq!(repaid, 300);
        assert_eq!(fx.client.position(&fx.user).debt, 400);
        assert_eq!(fx.debt_tok.balance(&fx.user), 400);
        assert_eq!(fx.client.total_debt(), 400);
    }

    #[test]
    fn test_repay_more_than_debt_is_capped() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        let repaid = fx.client.repay(&fx.user, &1_000);
        assert_eq!(repaid, 700);
        assert_eq!(fx.client.position(&fx.user).debt, 0);
        assert_eq!(fx.debt_tok.balance(&fx.user), 0);
        assert_eq!(fx.client.total_debt(), 0);
    }

    #[test]
    fn test_repay_with_no_debt_is_rejected() {
        let fx = setup();
        assert_eq!(
            fx.client.try_repay(&fx.user, &100),
            Err(Ok(Error::NothingToRepay))
        );
    }

    // ── withdraw ────────────────────────────────────────────────────────

    #[test]
    fn test_withdraw_within_ltv_succeeds() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &500);
        // Remaining collateral 900; 75% of 900 = 675 >= 500 debt.
        fx.client.withdraw(&fx.user, &100);
        assert_eq!(fx.client.position(&fx.user).collateral, 900);
        // User started with 10_000, deposited 1_000, then withdrew 100.
        assert_eq!(fx.coll.balance(&fx.user), 9_100);
    }

    #[test]
    fn test_withdraw_that_breaks_ltv_is_rejected() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        // Remaining collateral 900; 75% of 900 = 675 < 700 debt.
        assert_eq!(
            fx.client.try_withdraw(&fx.user, &100),
            Err(Ok(Error::WithdrawExceedsLtv))
        );
        // A smaller withdrawal leaves 950; 75% of 950 = 712 >= 700.
        fx.client.withdraw(&fx.user, &50);
        assert_eq!(fx.client.position(&fx.user).collateral, 950);
    }

    #[test]
    fn test_withdraw_more_than_collateral_is_rejected() {
        let fx = setup();

        fx.client.deposit(&fx.user, &500);
        assert_eq!(
            fx.client.try_withdraw(&fx.user, &600),
            Err(Ok(Error::InvalidAmount))
        );
    }

    #[test]
    fn test_withdraw_zero_is_rejected() {
        let fx = setup();
        fx.client.deposit(&fx.user, &1_000);
        assert_eq!(
            fx.client.try_withdraw(&fx.user, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    // ── oracle price freshness ──────────────────────────────────────────

    #[test]
    fn test_borrow_with_fresh_price_succeeds() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        // The oracle price was stamped at T0 and the ledger is at T0.
        fx.client.borrow(&fx.user, &500);
        assert_eq!(fx.client.position(&fx.user).debt, 500);
    }

    #[test]
    fn test_stale_price_is_rejected_on_borrow() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        // Advance the ledger timestamp past max_price_age (3600 s).
        set_ledger_timestamp(&fx.env, T0 + MAX_PRICE_AGE + 1);
        assert_eq!(
            fx.client.try_borrow(&fx.user, &100),
            Err(Ok(Error::StalePrice))
        );
    }

    #[test]
    fn test_stale_price_is_rejected_on_withdraw() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        set_ledger_timestamp(&fx.env, T0 + MAX_PRICE_AGE + 1);
        assert_eq!(
            fx.client.try_withdraw(&fx.user, &100),
            Err(Ok(Error::StalePrice))
        );
    }

    #[test]
    fn test_stale_price_is_rejected_on_liquidate() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        fx.debt_tok.transfer(&fx.user, &fx.liquidator, &700);

        // Drop the price to make the position liquidatable, then let the
        // price go stale before the liquidation attempt.
        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&800_000);
        set_ledger_timestamp(&fx.env, T0 + MAX_PRICE_AGE + 1);
        assert_eq!(
            fx.client.try_liquidate(&fx.user, &fx.liquidator, &100),
            Err(Ok(Error::StalePrice))
        );
    }

    #[test]
    fn test_fresh_price_after_oracle_update_succeeds() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        set_ledger_timestamp(&fx.env, T0 + MAX_PRICE_AGE + 1);
        assert_eq!(
            fx.client.try_borrow(&fx.user, &100),
            Err(Ok(Error::StalePrice))
        );
        // A fresh price stamp restores borrowing.
        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&PRICE);
        fx.client.borrow(&fx.user, &100);
        assert_eq!(fx.client.position(&fx.user).debt, 100);
    }

    #[test]
    fn test_nonpositive_price_is_rejected() {
        let fx = setup();
        fx.client.deposit(&fx.user, &1_000);

        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&0);
        assert_eq!(
            fx.client.try_borrow(&fx.user, &100),
            Err(Ok(Error::InvalidPrice))
        );
    }

    // ── liquidation ─────────────────────────────────────────────────────

    #[test]
    fn test_healthy_position_cannot_be_liquidated() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &500);
        // debt_value 500 vs collateral_value 1_000 * 85% = 850 → healthy.
        assert_eq!(
            fx.client.try_liquidate(&fx.user, &fx.liquidator, &100),
            Err(Ok(Error::PositionHealthy))
        );
    }

    #[test]
    fn test_price_drop_triggers_liquidation() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        fx.debt_tok.transfer(&fx.user, &fx.liquidator, &700);

        // At price 1.0 the position is healthy (700 <= 850).
        assert_eq!(
            fx.client.try_liquidate(&fx.user, &fx.liquidator, &100),
            Err(Ok(Error::PositionHealthy))
        );

        // Collateral price falls 20%: collateral_value 800, threshold 680,
        // debt_value 700 > 680 → liquidatable.
        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&800_000);
        fx.client.liquidate(&fx.user, &fx.liquidator, &700);

        let pos = fx.client.position(&fx.user);
        // Full repay of 700 debt plus a 5% bonus: 700 + 35 = 735 collateral
        // transferred to the liquidator.
        assert_eq!(pos.debt, 0);
        assert_eq!(pos.collateral, 1_000 - 735);
        assert_eq!(fx.coll.balance(&fx.liquidator), 735);
        assert_eq!(fx.client.total_collateral(), 265);
        assert_eq!(fx.client.total_debt(), 0);
    }

    #[test]
    fn test_partial_liquidation_reduces_debt_and_pays_bonus() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        fx.debt_tok.transfer(&fx.user, &fx.liquidator, &700);

        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&800_000);

        // Repay only 400 of the 700 debt.
        fx.client.liquidate(&fx.user, &fx.liquidator, &400);

        let pos = fx.client.position(&fx.user);
        // Bonus: 400 * 5% = 20 collateral to the liquidator.
        assert_eq!(pos.debt, 300);
        assert_eq!(pos.collateral, 1_000 - 420);
        assert_eq!(fx.coll.balance(&fx.liquidator), 420);
        assert_eq!(fx.client.total_debt(), 300);
    }

    #[test]
    fn test_liquidate_zero_amount_is_rejected() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        fx.client.borrow(&fx.user, &700);
        assert_eq!(
            fx.client.try_liquidate(&fx.user, &fx.liquidator, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    #[test]
    fn test_liquidate_with_no_debt_is_rejected() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        assert_eq!(
            fx.client.try_liquidate(&fx.user, &fx.liquidator, &100),
            Err(Ok(Error::NothingToRepay))
        );
    }

    // ── overflow / boundary tests ────────────────────────────────────────

    /// An extreme oracle price makes collateral * price overflow i128, which
    /// must surface as Error::Overflow rather than a panic.
    #[test]
    fn test_borrow_overflow_returns_error() {
        let fx = setup();

        fx.client.deposit(&fx.user, &1_000);
        // price = i128::MAX; collateral * price overflows i128.
        MockOracleClient::new(&fx.env, &fx.oracle_id).set_price(&i128::MAX);
        let result = fx.client.try_borrow(&fx.user, &1);
        assert_eq!(result, Err(Ok(Error::Overflow)));
    }
}
