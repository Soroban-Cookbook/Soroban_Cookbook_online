//! # Flash Loan
//!
//! A single-asset liquidity pool that lets anyone borrow tokens with **no
//! collateral**, provided the loan (plus a fee) is repaid before the
//! borrowing transaction finishes.
//!
//! ## Flow
//!
//! ```text
//! 1. Borrower calls `flash_loan(receiver, amount)`.
//! 2. Pool transfers `amount` of its token to `receiver`.
//! 3. Pool invokes `receiver.execute_operation(pool, asset, amount, fee)`.
//!    The receiver contract runs arbitrary logic (e.g. arbitrage) and must
//!    transfer `amount + fee` back to the pool before returning.
//! 4. Pool checks its own balance increased by at least `fee`. If not, it
//!    panics — the Soroban host aborts the whole invocation and rolls back
//!    every state change made along the way, including step 2's transfer,
//!    so an unpaid loan simply never happened.
//! ```
//!
//! Because the balance check happens *after* control returns from the
//! receiver, the contract never trusts the receiver's return value for the
//! critical invariant — it verifies the token balance directly. This mirrors
//! the checks-effects-interactions discipline used in
//! [`reentrancy-guard`](../reentrancy-guard), applied to a borrow-repay
//! invariant instead of a double-spend invariant.
//!
//! ## Storage layout
//!
//! All entries use `instance` storage.
//!
//! | Key             | Type      | Description                              |
//! |------------------|-----------|-------------------------------------------|
//! | `Admin`          | `Address` | Address that may withdraw collected fees |
//! | `Token`          | `Address` | Token contract the pool lends            |
//! | `FeeBps`         | `u32`     | Fee charged per loan, in basis points    |
//! | `FeesCollected`  | `i128`    | Total fees accrued and not yet withdrawn |

#![no_std]
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, token, Address, Env,
};

// ─── Constants ──────────────────────────────────────────────────────────────

/// Denominator for basis-point fee calculations (10_000 bps = 100%).
const BPS_DENOMINATOR: i128 = 10_000;

// ─── Storage Keys ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    FeeBps,
    FeesCollected,
}

// ─── Errors ─────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidFee = 4,
    InsufficientLiquidity = 5,
    InsufficientFees = 6,
}

// ─── Flash Loan Receiver Interface ─────────────────────────────────────────

/// Trait implemented by contracts that wish to receive flash loans.
///
/// `execute_operation` runs after the pool has already transferred `amount`
/// of `asset` to the receiver. Before returning, the receiver must transfer
/// `amount + fee` of `asset` back to `pool`, or the whole transaction
/// (including the initial transfer) is rolled back by the pool.
#[contractclient(name = "FlashLoanReceiverClient")]
pub trait FlashLoanReceiverInterface {
    fn execute_operation(env: Env, pool: Address, asset: Address, amount: i128, fee: i128);
}

// ─── Flash Loan Pool Contract ──────────────────────────────────────────────

#[contract]
pub struct FlashLoanPool;

#[contractimpl]
impl FlashLoanPool {
    /// Initialize the pool with an admin, a lending token, and a fee (in
    /// basis points) charged on every flash loan.
    pub fn initialize(env: Env, admin: Address, token: Address, fee_bps: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if fee_bps as i128 >= BPS_DENOMINATOR {
            return Err(Error::InvalidFee);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage()
            .instance()
            .set(&DataKey::FeesCollected, &0i128);

        Ok(())
    }

    /// Add liquidity that can be borrowed via `flash_loan`.
    pub fn deposit_liquidity(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        from.require_auth();

        let token_client = token::Client::new(&env, &Self::token_address(&env));
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        Ok(())
    }

    /// Borrow `amount` of the pool's token with no collateral.
    ///
    /// Transfers `amount` to `receiver`, invokes its `execute_operation`
    /// callback, then requires the pool's balance to have grown by at least
    /// the fee. If repayment is missing, this call panics and every state
    /// change made during the invocation — including the initial transfer —
    /// is rolled back by the host, so the loan atomically either profits the
    /// pool or never took effect.
    ///
    /// Returns the fee charged.
    pub fn flash_loan(env: Env, receiver: Address, amount: i128) -> Result<i128, Error> {
        Self::require_initialized(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_addr = Self::token_address(&env);
        let token_client = token::Client::new(&env, &token_addr);
        let pool = env.current_contract_address();

        let balance_before = token_client.balance(&pool);
        if balance_before < amount {
            return Err(Error::InsufficientLiquidity);
        }

        let fee = Self::calculate_fee(env.clone(), amount);

        // Interaction: hand the principal to the receiver before we know
        // whether it will be repaid.
        token_client.transfer(&pool, &receiver, &amount);

        // Arbitrary receiver logic runs here (e.g. arbitrage). The receiver
        // is expected to transfer `amount + fee` back to `pool` before this
        // call returns.
        FlashLoanReceiverClient::new(&env, &receiver).execute_operation(
            &pool,
            &token_addr,
            &amount,
            &fee,
        );

        // Effects: verify repayment by re-reading the pool's own balance
        // rather than trusting anything the receiver returned.
        let balance_after = token_client.balance(&pool);
        // balance_before + fee: fee < balance_before (fee_bps < 10_000), so
        // this only overflows if balance_before is astronomically close to
        // i128::MAX — guard it defensively and panic with a clear message.
        let required = balance_before
            .checked_add(fee)
            .expect("flash-loan: fee overflow");
        if balance_after < required {
            panic!("flash-loan: repayment not received");
        }

        // Accumulate fees — checked against corruption of the stored counter.
        let collected = Self::fees_collected(env.clone())
            .checked_add(fee)
            .expect("flash-loan: fees overflow");
        env.storage()
            .instance()
            .set(&DataKey::FeesCollected, &collected);

        Ok(fee)
    }

    /// Withdraw previously accrued fees to `to`. Admin only.
    pub fn withdraw_fees(env: Env, to: Address, amount: i128) -> Result<(), Error> {
        Self::require_initialized(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let admin = Self::admin(env.clone());
        admin.require_auth();

        let collected = Self::fees_collected(env.clone());
        if amount > collected {
            return Err(Error::InsufficientFees);
        }

        // amount ≤ collected is enforced above; checked_sub guards against
        // state corruption (e.g. a future upgrade writing a bad value).
        let new_collected = collected
            .checked_sub(amount)
            .ok_or(Error::InsufficientFees)?;
        env.storage()
            .instance()
            .set(&DataKey::FeesCollected, &new_collected);

        let token_client = token::Client::new(&env, &Self::token_address(&env));
        token_client.transfer(&env.current_contract_address(), &to, &amount);

        Ok(())
    }

    /// Fee (in the pool's token) owed for borrowing `amount`.
    ///
    /// Uses checked arithmetic: if `amount × fee_bps` overflows i128 the
    /// function panics.  In practice `fee_bps < 10_000` and Stellar token
    /// balances are bounded well below i128::MAX / 10_000, so this path is
    /// unreachable in normal operation.
    pub fn calculate_fee(env: Env, amount: i128) -> i128 {
        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0);
        amount
            .checked_mul(fee_bps as i128)
            .expect("flash-loan: fee calculation overflow")
            / BPS_DENOMINATOR
    }

    /// Token balance currently available to borrow.
    pub fn available_liquidity(env: Env) -> i128 {
        let token_client = token::Client::new(&env, &Self::token_address(&env));
        token_client.balance(&env.current_contract_address())
    }

    /// Total fees accrued and not yet withdrawn by the admin.
    pub fn fees_collected(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::FeesCollected)
            .unwrap_or(0)
    }

    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    pub fn token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized")
    }

    pub fn fee_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
    }

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn token_address(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .expect("not initialized")
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    extern crate std;

    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{self, StellarAssetClient},
        Address, Env,
    };

    /// Helper: register a Stellar asset contract and mint tokens to `to`.
    fn create_token<'a>(
        env: &Env,
        admin: &Address,
        to: &Address,
        amount: i128,
    ) -> (Address, token::Client<'a>) {
        let contract_address = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        let sac = StellarAssetClient::new(env, &contract_address);
        sac.mint(to, &amount);
        let client = token::Client::new(env, &contract_address);
        (contract_address, client)
    }

    /// Fully-wired pool: initialized, 1_000 liquidity deposited, 1% fee.
    fn setup() -> (Env, Address, Address, Address, FlashLoanPoolClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let lp = Address::generate(&env);
        let (token_addr, _) = create_token(&env, &admin, &lp, 1_000);

        let pool_id = env.register(FlashLoanPool, ());
        let client = FlashLoanPoolClient::new(&env, &pool_id);

        client.initialize(&admin, &token_addr, &100); // 1% == 100 bps
        client.deposit_liquidity(&lp, &1_000);

        (env, admin, lp, token_addr, client)
    }

    // ── initialize / deposit_liquidity ──────────────────────────────────────

    #[test]
    fn test_initialize_and_deposit() {
        let (env, _admin, _lp, token_addr, client) = setup();
        assert_eq!(client.available_liquidity(), 1_000);
        assert_eq!(client.fee_bps(), 100);
        assert_eq!(client.fees_collected(), 0);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&client.address), 1_000);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (_env, admin, _lp, token_addr, client) = setup();
        let result = client.try_initialize(&admin, &token_addr, &50);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_initialize_with_fee_at_or_above_100_percent_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let (token_addr, _) = create_token(&env, &admin, &admin, 0);

        let pool_id = env.register(FlashLoanPool, ());
        let client = FlashLoanPoolClient::new(&env, &pool_id);

        let result = client.try_initialize(&admin, &token_addr, &(BPS_DENOMINATOR as u32));
        assert_eq!(result, Err(Ok(Error::InvalidFee)));
    }

    #[test]
    fn test_calculate_fee() {
        let (_env, _admin, _lp, _token, client) = setup();
        // 1% of 500 == 5
        assert_eq!(client.calculate_fee(&500), 5);
    }

    // ── flash_loan: happy path ──────────────────────────────────────────────

    #[test]
    fn test_flash_loan_success_charges_fee_and_repays() {
        let (env, _admin, _lp, token_addr, client) = setup();

        let borrower_id = env.register(GoodBorrower, ());
        let token_client = token::Client::new(&env, &token_addr);

        // Fund the borrower with enough extra tokens to cover the fee
        // (simulating arbitrage profit), then let it self-repay.
        let sac = StellarAssetClient::new(&env, &token_addr);
        sac.mint(&borrower_id, &10);

        let fee = client.flash_loan(&borrower_id, &500);
        assert_eq!(fee, 5);

        // Pool ends up with its original liquidity plus the fee.
        assert_eq!(token_client.balance(&client.address), 1_005);
        assert_eq!(client.available_liquidity(), 1_005);
        assert_eq!(client.fees_collected(), 5);

        // Borrower kept its 10-token buffer minus the 5-token fee it paid.
        assert_eq!(token_client.balance(&borrower_id), 5);
    }

    #[test]
    fn test_flash_loan_zero_fee_pool() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let lp = Address::generate(&env);
        let (token_addr, _) = create_token(&env, &admin, &lp, 1_000);

        let pool_id = env.register(FlashLoanPool, ());
        let client = FlashLoanPoolClient::new(&env, &pool_id);
        client.initialize(&admin, &token_addr, &0);
        client.deposit_liquidity(&lp, &1_000);

        let borrower_id = env.register(GoodBorrower, ());
        let fee = client.flash_loan(&borrower_id, &500);
        assert_eq!(fee, 0);
        assert_eq!(client.available_liquidity(), 1_000);
    }

    // ── flash_loan: validation ──────────────────────────────────────────────

    #[test]
    fn test_flash_loan_before_initialize_fails() {
        let env = Env::default();
        let pool_id = env.register(FlashLoanPool, ());
        let client = FlashLoanPoolClient::new(&env, &pool_id);
        let borrower_id = env.register(GoodBorrower, ());

        let result = client.try_flash_loan(&borrower_id, &100);
        assert_eq!(result, Err(Ok(Error::NotInitialized)));
    }

    #[test]
    fn test_flash_loan_zero_amount_fails() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(GoodBorrower, ());
        let result = client.try_flash_loan(&borrower_id, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn test_flash_loan_exceeding_liquidity_fails() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(GoodBorrower, ());
        let result = client.try_flash_loan(&borrower_id, &1_001);
        assert_eq!(result, Err(Ok(Error::InsufficientLiquidity)));
    }

    // ── flash_loan: revert on non-repayment ─────────────────────────────────

    #[test]
    #[should_panic(expected = "flash-loan: repayment not received")]
    fn test_flash_loan_reverts_when_receiver_does_not_repay() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(NoRepayBorrower, ());
        client.flash_loan(&borrower_id, &500);
    }

    #[test]
    #[should_panic(expected = "flash-loan: repayment not received")]
    fn test_flash_loan_reverts_when_fee_is_underpaid() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(PartialRepayBorrower, ());
        // Repays exactly the principal but not the fee.
        client.flash_loan(&borrower_id, &500);
    }

    #[test]
    fn test_failed_flash_loan_leaves_pool_state_untouched() {
        let (env, _admin, _lp, token_addr, client) = setup();
        let borrower_id = env.register(NoRepayBorrower, ());

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            client.flash_loan(&borrower_id, &500);
        }));
        assert!(result.is_err(), "flash loan should have panicked");

        // The host rolls back the whole invocation on panic, so the
        // principal transfer to the borrower never actually happened.
        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&client.address), 1_000);
        assert_eq!(token_client.balance(&borrower_id), 0);
        assert_eq!(client.available_liquidity(), 1_000);
        assert_eq!(client.fees_collected(), 0);
    }

    // ── withdraw_fees ────────────────────────────────────────────────────────

    #[test]
    fn test_admin_can_withdraw_collected_fees() {
        let (env, _admin, _lp, token_addr, client) = setup();

        let borrower_id = env.register(GoodBorrower, ());
        let sac = StellarAssetClient::new(&env, &token_addr);
        sac.mint(&borrower_id, &10);
        client.flash_loan(&borrower_id, &500);
        assert_eq!(client.fees_collected(), 5);

        let treasury = Address::generate(&env);
        client.withdraw_fees(&treasury, &5);

        let token_client = token::Client::new(&env, &token_addr);
        assert_eq!(token_client.balance(&treasury), 5);
        assert_eq!(client.fees_collected(), 0);
    }

    #[test]
    fn test_withdraw_more_fees_than_collected_fails() {
        let (env, _admin, _lp, _token, client) = setup();
        let treasury = Address::generate(&env);
        let result = client.try_withdraw_fees(&treasury, &1);
        assert_eq!(result, Err(Ok(Error::InsufficientFees)));
    }

    // ── overflow / boundary tests ─────────────────────────────────────────────

    /// calculate_fee with a large-but-safe amount does not overflow.
    /// Maximum safe amount for 1% fee (100 bps): i128::MAX / 100.
    #[test]
    fn test_calculate_fee_boundary_safe() {
        let (env, _admin, _lp, _token, client) = setup();
        // fee_bps = 100; safe_max = i128::MAX / 100
        let safe_max = i128::MAX / 100;
        let fee = client.calculate_fee(&safe_max);
        // fee = amount * fee_bps / BPS_DENOMINATOR = safe_max * 100 / 10_000
        assert_eq!(fee, safe_max / 100);
    }

    /// flash_loan rejects amount = 0 with InvalidAmount.
    #[test]
    fn test_flash_loan_zero_amount_boundary() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(GoodBorrower, ());
        assert_eq!(
            client.try_flash_loan(&borrower_id, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    /// flash_loan rejects amount = i128::MAX (far exceeds pool liquidity).
    #[test]
    fn test_flash_loan_max_i128_exceeds_liquidity() {
        let (env, _admin, _lp, _token, client) = setup();
        let borrower_id = env.register(GoodBorrower, ());
        assert_eq!(
            client.try_flash_loan(&borrower_id, &i128::MAX),
            Err(Ok(Error::InsufficientLiquidity))
        );
    }

    /// deposit_liquidity rejects amount = 0 with InvalidAmount.
    #[test]
    fn test_deposit_liquidity_zero_amount_boundary() {
        let (env, _admin, lp, _token, client) = setup();
        assert_eq!(
            client.try_deposit_liquidity(&lp, &0),
            Err(Ok(Error::InvalidAmount))
        );
    }

    // ── borrower fixtures ────────────────────────────────────────────────────

    /// Repays the loan plus fee in full and signals success.
    #[contract]
    pub struct GoodBorrower;

    #[contractimpl]
    impl GoodBorrower {
        pub fn execute_operation(env: Env, pool: Address, asset: Address, amount: i128, fee: i128) {
            // Use checked_add to avoid overflow in the repayment amount.
            // In a well-behaved pool fee_bps < 10_000, so amount + fee fits
            // comfortably in i128, but we guard it for correctness.
            let repay = amount
                .checked_add(fee)
                .expect("GoodBorrower: repayment overflow");
            token::Client::new(&env, &asset).transfer(
                &env.current_contract_address(),
                &pool,
                &repay,
            );
        }
    }

    /// Keeps the borrowed funds and repays nothing.
    #[contract]
    pub struct NoRepayBorrower;

    #[contractimpl]
    impl NoRepayBorrower {
        pub fn execute_operation(
            _env: Env,
            _pool: Address,
            _asset: Address,
            _amount: i128,
            _fee: i128,
        ) {
            // Intentionally does nothing — simulates a malicious or buggy borrower.
        }
    }

    /// Repays the principal but skips the fee.
    #[contract]
    pub struct PartialRepayBorrower;

    #[contractimpl]
    impl PartialRepayBorrower {
        pub fn execute_operation(
            env: Env,
            pool: Address,
            asset: Address,
            amount: i128,
            _fee: i128,
        ) {
            token::Client::new(&env, &asset).transfer(
                &env.current_contract_address(),
                &pool,
                &amount,
            );
        }
    }
}
