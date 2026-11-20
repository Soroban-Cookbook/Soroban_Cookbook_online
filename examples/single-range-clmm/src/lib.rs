// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook
#![no_std]
//! Educational single-range concentrated-liquidity math.
//!
//! This contract is deliberately incomplete and must not be used with real
//! assets. It has one immutable range, no fees, and rejects swaps that leave
//! that range.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

const PRICE_SCALE: i128 = 1_000_000;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pool {
    pub sqrt_price: i128,
    pub sqrt_price_lower: i128,
    pub sqrt_price_upper: i128,
    pub liquidity: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Pool,
    TokenA,
    TokenB,
    UserLiquidity(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidRange = 3,
    InvalidAmount = 4,
    InsufficientLiquidity = 5,
    PriceOutOfRange = 6,
    BelowMinimum = 7,
    Overflow = 8,
}

#[contract]
pub struct SingleRangeClmm;

#[contractimpl]
impl SingleRangeClmm {
    pub fn initialize(
        env: Env,
        initializer: Address,
        token_a: Address,
        token_b: Address,
        sqrt_price_lower: i128,
        sqrt_price: i128,
        sqrt_price_upper: i128,
    ) -> Result<(), Error> {
        initializer.require_auth();
        if env.storage().persistent().has(&DataKey::Pool) {
            return Err(Error::AlreadyInitialized);
        }
        if sqrt_price_lower <= 0
            || sqrt_price_lower >= sqrt_price
            || sqrt_price >= sqrt_price_upper
            || token_a == token_b
        {
            return Err(Error::InvalidRange);
        }

        env.storage().persistent().set(&DataKey::TokenA, &token_a);
        env.storage().persistent().set(&DataKey::TokenB, &token_b);
        env.storage().persistent().set(
            &DataKey::Pool,
            &Pool {
                sqrt_price,
                sqrt_price_lower,
                sqrt_price_upper,
                liquidity: 0,
            },
        );
        Ok(())
    }

    pub fn add_liquidity(
        env: Env,
        provider: Address,
        liquidity: i128,
    ) -> Result<(i128, i128), Error> {
        provider.require_auth();
        if liquidity <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut pool = Self::get_pool_internal(&env)?;
        let amount_a = Self::amount_a_for_liquidity(
            liquidity,
            pool.sqrt_price,
            pool.sqrt_price_upper,
            true,
        )?;
        let amount_b = Self::amount_b_for_liquidity(
            liquidity,
            pool.sqrt_price,
            pool.sqrt_price_lower,
            true,
        )?;

        let token_a_address = Self::get_token_a(&env)?;
        let token_b_address = Self::get_token_b(&env)?;
        let token_a = token::Client::new(&env, &token_a_address);
        let token_b = token::Client::new(&env, &token_b_address);
        token_a.transfer(&provider, &env.current_contract_address(), &amount_a);
        token_b.transfer(&provider, &env.current_contract_address(), &amount_b);

        pool.liquidity = pool.liquidity.checked_add(liquidity).ok_or(Error::Overflow)?;
        env.storage().persistent().set(&DataKey::Pool, &pool);
        let user_liquidity = Self::read_user_liquidity(&env, &provider)
            .checked_add(liquidity)
            .ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&DataKey::UserLiquidity(provider), &user_liquidity);

        Ok((amount_a, amount_b))
    }

    pub fn remove_liquidity(
        env: Env,
        provider: Address,
        liquidity: i128,
    ) -> Result<(i128, i128), Error> {
        provider.require_auth();
        if liquidity <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut pool = Self::get_pool_internal(&env)?;
        let user_liquidity = Self::read_user_liquidity(&env, &provider);
        if user_liquidity < liquidity || pool.liquidity < liquidity {
            return Err(Error::InsufficientLiquidity);
        }

        let amount_a = Self::amount_a_for_liquidity(
            liquidity,
            pool.sqrt_price,
            pool.sqrt_price_upper,
            false,
        )?;
        let amount_b = Self::amount_b_for_liquidity(
            liquidity,
            pool.sqrt_price,
            pool.sqrt_price_lower,
            false,
        )?;
        pool.liquidity = pool.liquidity.checked_sub(liquidity).ok_or(Error::Overflow)?;
        env.storage().persistent().set(&DataKey::Pool, &pool);
        env.storage()
            .persistent()
            .set(&DataKey::UserLiquidity(provider.clone()), &(user_liquidity - liquidity));

        let token_a_address = Self::get_token_a(&env)?;
        let token_b_address = Self::get_token_b(&env)?;
        let token_a = token::Client::new(&env, &token_a_address);
        let token_b = token::Client::new(&env, &token_b_address);
        token_a.transfer(&env.current_contract_address(), &provider, &amount_a);
        token_b.transfer(&env.current_contract_address(), &provider, &amount_b);
        Ok((amount_a, amount_b))
    }

    pub fn swap_a_for_b(
        env: Env,
        trader: Address,
        amount_a_in: i128,
        min_b_out: i128,
    ) -> Result<i128, Error> {
        trader.require_auth();
        if amount_a_in <= 0 || min_b_out < 0 {
            return Err(Error::InvalidAmount);
        }

        let mut pool = Self::get_pool_internal(&env)?;
        if pool.liquidity <= 0 {
            return Err(Error::InsufficientLiquidity);
        }
        let numerator = pool
            .liquidity
            .checked_mul(pool.sqrt_price)
            .and_then(|value| value.checked_mul(PRICE_SCALE))
            .ok_or(Error::Overflow)?;
        let denominator = pool
            .liquidity
            .checked_mul(PRICE_SCALE)
            .and_then(|value| {
                amount_a_in
                    .checked_mul(pool.sqrt_price)
                    .and_then(|input| value.checked_add(input))
            })
            .ok_or(Error::Overflow)?;
        let new_sqrt_price = Self::divide(numerator, denominator, true)?;
        if new_sqrt_price < pool.sqrt_price_lower {
            return Err(Error::PriceOutOfRange);
        }
        let amount_b_out = pool
            .liquidity
            .checked_mul(pool.sqrt_price - new_sqrt_price)
            .and_then(|value| value.checked_div(PRICE_SCALE))
            .ok_or(Error::Overflow)?;
        if amount_b_out <= 0 || amount_b_out < min_b_out {
            return Err(Error::BelowMinimum);
        }

        Self::transfer_swap(
            &env,
            &trader,
            amount_a_in,
            amount_b_out,
            true,
        )?;
        pool.sqrt_price = new_sqrt_price;
        env.storage().persistent().set(&DataKey::Pool, &pool);
        Ok(amount_b_out)
    }

    pub fn swap_b_for_a(
        env: Env,
        trader: Address,
        amount_b_in: i128,
        min_a_out: i128,
    ) -> Result<i128, Error> {
        trader.require_auth();
        if amount_b_in <= 0 || min_a_out < 0 {
            return Err(Error::InvalidAmount);
        }

        let mut pool = Self::get_pool_internal(&env)?;
        if pool.liquidity <= 0 {
            return Err(Error::InsufficientLiquidity);
        }
        let price_delta = amount_b_in
            .checked_mul(PRICE_SCALE)
            .and_then(|value| value.checked_div(pool.liquidity))
            .ok_or(Error::Overflow)?;
        let new_sqrt_price = pool
            .sqrt_price
            .checked_add(price_delta)
            .ok_or(Error::Overflow)?;
        if new_sqrt_price > pool.sqrt_price_upper {
            return Err(Error::PriceOutOfRange);
        }
        let numerator = pool
            .liquidity
            .checked_mul(PRICE_SCALE)
            .and_then(|value| value.checked_mul(new_sqrt_price - pool.sqrt_price))
            .ok_or(Error::Overflow)?;
        let denominator = new_sqrt_price
            .checked_mul(pool.sqrt_price)
            .ok_or(Error::Overflow)?;
        let amount_a_out = numerator.checked_div(denominator).ok_or(Error::Overflow)?;
        if amount_a_out <= 0 || amount_a_out < min_a_out {
            return Err(Error::BelowMinimum);
        }

        Self::transfer_swap(
            &env,
            &trader,
            amount_b_in,
            amount_a_out,
            false,
        )?;
        pool.sqrt_price = new_sqrt_price;
        env.storage().persistent().set(&DataKey::Pool, &pool);
        Ok(amount_a_out)
    }

    pub fn get_pool(env: Env) -> Pool {
        match Self::get_pool_internal(&env) {
            Ok(pool) => pool,
            Err(_) => panic!("single-range-clmm: pool not initialized"),
        }
    }

    pub fn get_user_liquidity(env: Env, provider: Address) -> i128 {
        Self::read_user_liquidity(&env, &provider)
    }

    fn transfer_swap(
        env: &Env,
        trader: &Address,
        amount_in: i128,
        amount_out: i128,
        a_for_b: bool,
    ) -> Result<(), Error> {
        let token_a_address = Self::get_token_a(env)?;
        let token_b_address = Self::get_token_b(env)?;
        let token_a = token::Client::new(env, &token_a_address);
        let token_b = token::Client::new(env, &token_b_address);
        if a_for_b {
            token_a.transfer(trader, &env.current_contract_address(), &amount_in);
            token_b.transfer(&env.current_contract_address(), trader, &amount_out);
        } else {
            token_b.transfer(trader, &env.current_contract_address(), &amount_in);
            token_a.transfer(&env.current_contract_address(), trader, &amount_out);
        }
        Ok(())
    }

    fn amount_a_for_liquidity(
        liquidity: i128,
        sqrt_price: i128,
        sqrt_price_upper: i128,
        round_up: bool,
    ) -> Result<i128, Error> {
        let numerator = liquidity
            .checked_mul(sqrt_price_upper - sqrt_price)
            .and_then(|value| value.checked_mul(PRICE_SCALE))
            .ok_or(Error::Overflow)?;
        let denominator = sqrt_price
            .checked_mul(sqrt_price_upper)
            .ok_or(Error::Overflow)?;
        Self::divide(numerator, denominator, round_up)
    }

    fn amount_b_for_liquidity(
        liquidity: i128,
        sqrt_price: i128,
        sqrt_price_lower: i128,
        round_up: bool,
    ) -> Result<i128, Error> {
        let numerator = liquidity
            .checked_mul(sqrt_price - sqrt_price_lower)
            .ok_or(Error::Overflow)?;
        Self::divide(numerator, PRICE_SCALE, round_up)
    }

    fn divide(numerator: i128, denominator: i128, round_up: bool) -> Result<i128, Error> {
        let quotient = numerator.checked_div(denominator).ok_or(Error::Overflow)?;
        if round_up && numerator % denominator != 0 {
            quotient.checked_add(1).ok_or(Error::Overflow)
        } else {
            Ok(quotient)
        }
    }

    fn get_pool_internal(env: &Env) -> Result<Pool, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Pool)
            .ok_or(Error::NotInitialized)
    }

    fn get_token_a(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenA)
            .ok_or(Error::NotInitialized)
    }

    fn get_token_b(env: &Env) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenB)
            .ok_or(Error::NotInitialized)
    }

    fn read_user_liquidity(env: &Env, provider: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::UserLiquidity(provider.clone()))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    struct Setup {
        env: Env,
        alice: Address,
        bob: Address,
        token_a: Address,
        token_b: Address,
        sac_a: token::StellarAssetClient<'static>,
        client: SingleRangeClmmClient<'static>,
    }

    fn setup() -> Setup {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        let token_a = env.register_stellar_asset_contract(admin.clone());
        let token_b = env.register_stellar_asset_contract(admin.clone());
        let sac_a = token::StellarAssetClient::new(&env, &token_a);
        let sac_b = token::StellarAssetClient::new(&env, &token_b);
        sac_a.mint(&alice, &1_000_000);
        sac_b.mint(&alice, &1_000_000);
        sac_a.mint(&bob, &1_000_000);
        sac_b.mint(&bob, &1_000_000);

        let contract_id = env.register(SingleRangeClmm, ());
        let client = SingleRangeClmmClient::new(&env, &contract_id);
        client.initialize(&alice, &token_a, &token_b, &800_000, &1_000_000, &1_200_000);
        Setup {
            env,
            alice,
            bob,
            token_a,
            token_b,
            sac_a,
            client,
        }
    }

    #[test]
    fn adds_and_removes_liquidity_proportionally() {
        let setup = setup();
        let deposited = setup.client.add_liquidity(&setup.alice, &100_000);
        assert!(deposited.0 > 0);
        assert!(deposited.1 > 0);
        assert_eq!(setup.client.get_user_liquidity(&setup.alice), 100_000);

        let withdrawn = setup.client.remove_liquidity(&setup.alice, &50_000);
        assert_eq!(setup.client.get_user_liquidity(&setup.alice), 50_000);
        let pool = setup.client.get_pool();
        assert_eq!(pool.liquidity, 50_000);
        assert!(withdrawn.0 > 0 && withdrawn.1 > 0);
    }

    #[test]
    fn swaps_preserve_liquidity_and_keep_price_inside_the_single_range() {
        let setup = setup();
        setup.client.add_liquidity(&setup.alice, &100_000);
        let initial = setup.client.get_pool();

        let b_out = setup.client.swap_a_for_b(&setup.bob, &1_000, &1);
        assert!(b_out > 0);
        let after_a_to_b = setup.client.get_pool();
        assert!(after_a_to_b.sqrt_price < initial.sqrt_price);
        assert!(after_a_to_b.sqrt_price >= after_a_to_b.sqrt_price_lower);
        assert_eq!(after_a_to_b.liquidity, initial.liquidity);

        let a_out = setup.client.swap_b_for_a(&setup.bob, &1_000, &1);
        assert!(a_out > 0);
        let after_b_to_a = setup.client.get_pool();
        assert!(after_b_to_a.sqrt_price > after_a_to_b.sqrt_price);
        assert!(after_b_to_a.sqrt_price <= after_b_to_a.sqrt_price_upper);
        assert_eq!(after_b_to_a.liquidity, initial.liquidity);
    }

    #[test]
    fn rejects_swaps_that_would_cross_the_range_without_changing_state() {
        let setup = setup();
        setup.client.add_liquidity(&setup.alice, &100_000);
        let before = setup.client.get_pool();
        let bob_a_before = setup.sac_a.balance(&setup.bob);
        let result = setup
            .client
            .try_swap_a_for_b(&setup.bob, &1_000_000, &0);
        assert_eq!(result, Err(Ok(Error::PriceOutOfRange)));
        assert_eq!(setup.client.get_pool(), before);
        assert_eq!(setup.sac_a.balance(&setup.bob), bob_a_before);

        let bob_b_before = setup.sac_b.balance(&setup.bob);
        let result = setup
            .client
            .try_swap_b_for_a(&setup.bob, &1_000_000, &0);
        assert_eq!(result, Err(Ok(Error::PriceOutOfRange)));
        assert_eq!(setup.client.get_pool(), before);
        assert_eq!(setup.sac_b.balance(&setup.bob), bob_b_before);
    }

    #[test]
    fn rejects_invalid_ranges_and_unowned_withdrawals() {
        let setup = setup();
        let invalid_contract = setup.env.register(SingleRangeClmm, ());
        let invalid_client = SingleRangeClmmClient::new(&setup.env, &invalid_contract);
        let result = invalid_client.try_initialize(
            &setup.alice,
            &setup.token_a,
            &setup.token_b,
            &1_000_000,
            &1_000_000,
            &1_200_000,
        );
        assert_eq!(result, Err(Ok(Error::InvalidRange)));
        let result = setup.client.try_remove_liquidity(&setup.bob, &1);
        assert_eq!(result, Err(Ok(Error::InsufficientLiquidity)));
    }

    #[test]
    fn liquidity_invariant_holds_across_a_sequence_of_in_range_swaps() {
        let setup = setup();
        setup.client.add_liquidity(&setup.alice, &100_000);
        let initial_liquidity = setup.client.get_pool().liquidity;

        for _ in 0..20 {
            setup.client.swap_a_for_b(&setup.bob, &100, &0);
            setup.client.swap_b_for_a(&setup.bob, &100, &0);
            let pool = setup.client.get_pool();
            assert_eq!(pool.liquidity, initial_liquidity);
            assert!(
                pool.sqrt_price >= pool.sqrt_price_lower
                    && pool.sqrt_price <= pool.sqrt_price_upper,
                "price escaped the configured single range: {pool:?}"
            );
        }
    }
}
