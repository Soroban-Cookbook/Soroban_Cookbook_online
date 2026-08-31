#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env,
};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Reserves {
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub lp_total_supply: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Reserves,
    TokenA,
    TokenB,
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InsufficientLiquidity = 3,
    InsufficientOutput = 4,
    InsufficientInput = 5,
    InvalidAmount = 6,
    Overflow = 7,
    BelowMinimum = 8,
}

#[contract]
pub struct ConstantProductAmm;

#[contractimpl]
impl ConstantProductAmm {
    pub fn initialize(env: Env, token_a: Address, token_b: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&DataKey::TokenA) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().persistent().set(&DataKey::TokenA, &token_a);
        env.storage().persistent().set(&DataKey::TokenB, &token_b);

        let reserves = Reserves {
            reserve_a: 0,
            reserve_b: 0,
            lp_total_supply: 0,
        };
        env.storage().persistent().set(&DataKey::Reserves, &reserves);

        Ok(())
    }

    fn get_reserves_internal(env: &Env) -> Reserves {
        env.storage()
            .persistent()
            .get(&DataKey::Reserves)
            .unwrap()
    }

    fn get_token_a(env: &Env) -> Address {
        env.storage().persistent().get(&DataKey::TokenA).unwrap()
    }

    fn get_token_b(env: &Env) -> Address {
        env.storage().persistent().get(&DataKey::TokenB).unwrap()
    }

    fn read_lp_balance(env: &Env, address: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(address.clone()))
            .unwrap_or(0)
    }

    fn set_lp_balance(env: &Env, address: &Address, amount: i128) {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(address.clone()), &amount);
    }

    pub fn add_liquidity(
        env: Env,
        caller: Address,
        amount_a_desired: i128,
        amount_b_desired: i128,
        amount_a_min: i128,
        amount_b_min: i128,
    ) -> Result<(i128, i128, i128), Error> {
        caller.require_auth();

        if amount_a_desired <= 0 || amount_b_desired <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut reserves = Self::get_reserves_internal(&env);
        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        let (amount_a, amount_b) = if reserves.reserve_a == 0 && reserves.reserve_b == 0 {
            (amount_a_desired, amount_b_desired)
        } else {
            let amount_b_optimal = amount_a_desired
                .checked_mul(reserves.reserve_b)
                .ok_or(Error::Overflow)?
                .checked_div(reserves.reserve_a)
                .ok_or(Error::Overflow)?;

            if amount_b_optimal <= amount_b_desired {
                if amount_b_optimal < amount_b_min {
                    return Err(Error::BelowMinimum);
                }
                (amount_a_desired, amount_b_optimal)
            } else {
                let amount_a_optimal = amount_b_desired
                    .checked_mul(reserves.reserve_a)
                    .ok_or(Error::Overflow)?
                    .checked_div(reserves.reserve_b)
                    .ok_or(Error::Overflow)?;

                if amount_a_optimal < amount_a_min {
                    return Err(Error::BelowMinimum);
                }
                (amount_a_optimal, amount_b_desired)
            }
        };

        if amount_a <= 0 || amount_b <= 0 {
            return Err(Error::InvalidAmount);
        }

        let lp_amount = if reserves.lp_total_supply == 0 {
            let sqrt = sqrt_i128(
                amount_a
                    .checked_mul(amount_b)
                    .ok_or(Error::Overflow)?,
            );
            sqrt
        } else {
            let amount_a_mul_total = amount_a
                .checked_mul(reserves.lp_total_supply)
                .ok_or(Error::Overflow)?;
            let amount_b_mul_total = amount_b
                .checked_mul(reserves.lp_total_supply)
                .ok_or(Error::Overflow)?;

            let from_a = amount_a_mul_total
                .checked_div(reserves.reserve_a)
                .ok_or(Error::Overflow)?;
            let from_b = amount_b_mul_total
                .checked_div(reserves.reserve_b)
                .ok_or(Error::Overflow)?;

            from_a.min(from_b)
        };

        if lp_amount <= 0 {
            return Err(Error::InsufficientLiquidity);
        }

        token_a_client.transfer(&caller, &env.current_contract_address(), &amount_a);
        token_b_client.transfer(&caller, &env.current_contract_address(), &amount_b);

        reserves.reserve_a = reserves
            .reserve_a
            .checked_add(amount_a)
            .ok_or(Error::Overflow)?;
        reserves.reserve_b = reserves
            .reserve_b
            .checked_add(amount_b)
            .ok_or(Error::Overflow)?;
        reserves.lp_total_supply = reserves
            .lp_total_supply
            .checked_add(lp_amount)
            .ok_or(Error::Overflow)?;

        env.storage().persistent().set(&DataKey::Reserves, &reserves);

        let caller_lp = Self::read_lp_balance(&env, &caller)
            .checked_add(lp_amount)
            .ok_or(Error::Overflow)?;
        Self::set_lp_balance(&env, &caller, caller_lp);

        Ok((amount_a, amount_b, lp_amount))
    }

    pub fn remove_liquidity(
        env: Env,
        caller: Address,
        lp_amount: i128,
        amount_a_min: i128,
        amount_b_min: i128,
    ) -> Result<(i128, i128), Error> {
        caller.require_auth();

        if lp_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let reserves = Self::get_reserves_internal(&env);
        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        let caller_lp = Self::read_lp_balance(&env, &caller);
        if caller_lp < lp_amount {
            return Err(Error::InsufficientLiquidity);
        }

        let amount_a = lp_amount
            .checked_mul(reserves.reserve_a)
            .ok_or(Error::Overflow)?
            .checked_div(reserves.lp_total_supply)
            .ok_or(Error::Overflow)?;
        let amount_b = lp_amount
            .checked_mul(reserves.reserve_b)
            .ok_or(Error::Overflow)?
            .checked_div(reserves.lp_total_supply)
            .ok_or(Error::Overflow)?;

        if amount_a < amount_a_min || amount_b < amount_b_min {
            return Err(Error::BelowMinimum);
        }

        if amount_a <= 0 || amount_b <= 0 {
            return Err(Error::InsufficientOutput);
        }

        let new_caller_lp = caller_lp
            .checked_sub(lp_amount)
            .ok_or(Error::Overflow)?;
        Self::set_lp_balance(&env, &caller, new_caller_lp);

        let new_reserves = Reserves {
            reserve_a: reserves
                .reserve_a
                .checked_sub(amount_a)
                .ok_or(Error::Overflow)?,
            reserve_b: reserves
                .reserve_b
                .checked_sub(amount_b)
                .ok_or(Error::Overflow)?,
            lp_total_supply: reserves
                .lp_total_supply
                .checked_sub(lp_amount)
                .ok_or(Error::Overflow)?,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Reserves, &new_reserves);

        token_a_client.transfer(&env.current_contract_address(), &caller, &amount_a);
        token_b_client.transfer(&env.current_contract_address(), &caller, &amount_b);

        Ok((amount_a, amount_b))
    }

    pub fn swap_a_for_b(
        env: Env,
        caller: Address,
        amount_a_in: i128,
        min_b_out: i128,
    ) -> Result<i128, Error> {
        caller.require_auth();

        if amount_a_in <= 0 {
            return Err(Error::InvalidAmount);
        }

        let reserves = Self::get_reserves_internal(&env);
        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        let amount_a_in_with_fee = amount_a_in
            .checked_mul(997)
            .ok_or(Error::Overflow)?;
        let numerator = amount_a_in_with_fee
            .checked_mul(reserves.reserve_b)
            .ok_or(Error::Overflow)?;
        let denominator = reserves
            .reserve_a
            .checked_mul(1000)
            .ok_or(Error::Overflow)?
            .checked_add(amount_a_in_with_fee)
            .ok_or(Error::Overflow)?;
        let amount_b_out = numerator
            .checked_div(denominator)
            .ok_or(Error::Overflow)?;

        if amount_b_out < min_b_out {
            return Err(Error::InsufficientOutput);
        }
        if amount_b_out <= 0 {
            return Err(Error::InsufficientOutput);
        }

        token_a_client.transfer(&caller, &env.current_contract_address(), &amount_a_in);
        token_b_client.transfer(&env.current_contract_address(), &caller, &amount_b_out);

        let new_reserves = Reserves {
            reserve_a: reserves
                .reserve_a
                .checked_add(amount_a_in)
                .ok_or(Error::Overflow)?,
            reserve_b: reserves
                .reserve_b
                .checked_sub(amount_b_out)
                .ok_or(Error::Overflow)?,
            lp_total_supply: reserves.lp_total_supply,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Reserves, &new_reserves);

        Ok(amount_b_out)
    }

    pub fn swap_b_for_a(
        env: Env,
        caller: Address,
        amount_b_in: i128,
        min_a_out: i128,
    ) -> Result<i128, Error> {
        caller.require_auth();

        if amount_b_in <= 0 {
            return Err(Error::InvalidAmount);
        }

        let reserves = Self::get_reserves_internal(&env);
        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        let amount_b_in_with_fee = amount_b_in
            .checked_mul(997)
            .ok_or(Error::Overflow)?;
        let numerator = amount_b_in_with_fee
            .checked_mul(reserves.reserve_a)
            .ok_or(Error::Overflow)?;
        let denominator = reserves
            .reserve_b
            .checked_mul(1000)
            .ok_or(Error::Overflow)?
            .checked_add(amount_b_in_with_fee)
            .ok_or(Error::Overflow)?;
        let amount_a_out = numerator
            .checked_div(denominator)
            .ok_or(Error::Overflow)?;

        if amount_a_out < min_a_out {
            return Err(Error::InsufficientOutput);
        }
        if amount_a_out <= 0 {
            return Err(Error::InsufficientOutput);
        }

        token_b_client.transfer(&caller, &env.current_contract_address(), &amount_b_in);
        token_a_client.transfer(&env.current_contract_address(), &caller, &amount_a_out);

        let new_reserves = Reserves {
            reserve_a: reserves
                .reserve_a
                .checked_sub(amount_a_out)
                .ok_or(Error::Overflow)?,
            reserve_b: reserves
                .reserve_b
                .checked_add(amount_b_in)
                .ok_or(Error::Overflow)?,
            lp_total_supply: reserves.lp_total_supply,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Reserves, &new_reserves);

        Ok(amount_a_out)
    }

    pub fn get_reserves(env: Env) -> Reserves {
        Self::get_reserves_internal(&env)
    }

    pub fn get_lp_balance(env: Env, address: Address) -> i128 {
        Self::read_lp_balance(&env, &address)
    }

    pub fn get_tokens(env: Env) -> (Address, Address) {
        let token_a = Self::get_token_a(&env);
        let token_b = Self::get_token_b(&env);
        (token_a, token_b)
    }
}

fn sqrt_i128(y: i128) -> i128 {
    if y <= 1 {
        return y;
    }
    let mut z = y / 2 + 1;
    let mut prev = 0i128;
    while z != prev {
        prev = z;
        z = (y / z + z) / 2;
    }
    prev
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn create_token(env: &Env, admin: &Address) -> (Address, token::StellarAssetClient<'static>) {
        let asset = env.register_stellar_asset_contract(admin.clone());
        let sac = token::StellarAssetClient::new(env, &asset);
        (asset, sac)
    }

    struct Setup {
        env: Env,
        alice: Address,
        bob: Address,
        token_a: Address,
        token_b: Address,
        sac_a: token::StellarAssetClient<'static>,
        sac_b: token::StellarAssetClient<'static>,
        client: ConstantProductAmmClient<'static>,
    }

    fn setup() -> Setup {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let (token_a, sac_a) = create_token(&env, &admin);
        let (token_b, sac_b) = create_token(&env, &admin);

        sac_a.mint(&alice, &1_000_000);
        sac_b.mint(&alice, &1_000_000);
        sac_a.mint(&bob, &1_000_000);
        sac_b.mint(&bob, &1_000_000);

        let contract_id = env.register(ConstantProductAmm, ());
        let client = ConstantProductAmmClient::new(&env, &contract_id);

        client.initialize(&token_a, &token_b);

        Setup {
            env,
            alice,
            bob,
            token_a,
            token_b,
            sac_a,
            sac_b,
            client,
        }
    }

    #[test]
    fn test_initialize() {
        let setup = setup();
        let (ta, tb) = setup.client.get_tokens();
        assert_eq!(ta, setup.token_a);
        assert_eq!(tb, setup.token_b);

        let reserves = setup.client.get_reserves();
        assert_eq!(reserves.reserve_a, 0);
        assert_eq!(reserves.reserve_b, 0);
        assert_eq!(reserves.lp_total_supply, 0);
    }

    #[test]
    fn test_double_initialize_fails() {
        let setup = setup();
        let result = setup
            .client
            .try_initialize(&setup.token_a, &setup.token_b);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn test_add_liquidity() {
        let setup = setup();
        let (amount_a, amount_b, lp) = setup.client.add_liquidity(
            &setup.alice,
            &100_000,
            &200_000,
            &90_000,
            &180_000,
        );
        assert_eq!(amount_a, 100_000);
        assert_eq!(amount_b, 200_000);
        assert!(lp > 0);

        let reserves = setup.client.get_reserves();
        assert_eq!(reserves.reserve_a, 100_000);
        assert_eq!(reserves.reserve_b, 200_000);
        assert_eq!(reserves.lp_total_supply, lp);

        assert_eq!(setup.client.get_lp_balance(&setup.alice), lp);
    }

    #[test]
    fn test_add_liquidity_with_existing_pool() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let (amount_a, amount_b, lp) = setup.client.add_liquidity(
            &setup.bob,
            &100_000,
            &300_000,
            &90_000,
            &180_000,
        );
        assert_eq!(amount_a, 100_000);
        assert_eq!(amount_b, 200_000);
        assert!(lp > 0);
    }

    #[test]
    fn test_remove_liquidity() {
        let setup = setup();
        let (_, _, lp) = setup.client.add_liquidity(
            &setup.alice,
            &100_000,
            &200_000,
            &90_000,
            &180_000,
        );

        let (amount_a, amount_b) = setup
            .client
            .remove_liquidity(&setup.alice, &lp, &0, &0);
        assert!(amount_a > 0);
        assert!(amount_b > 0);

        let reserves = setup.client.get_reserves();
        assert_eq!(reserves.reserve_a, 100_000 - amount_a);
        assert_eq!(reserves.reserve_b, 200_000 - amount_b);
        assert_eq!(setup.client.get_lp_balance(&setup.alice), 0);
    }

    #[test]
    fn test_swap_a_for_b() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let amount_b_out = setup.client.swap_a_for_b(&setup.bob, &10_000, &0);
        assert!(amount_b_out > 0);
        assert!(amount_b_out < 20_000);

        let reserves = setup.client.get_reserves();
        assert_eq!(reserves.reserve_a, 110_000);
        assert_eq!(reserves.reserve_b, 200_000 - amount_b_out);
    }

    #[test]
    fn test_swap_b_for_a() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let amount_a_out = setup.client.swap_b_for_a(&setup.bob, &10_000, &0);
        assert!(amount_a_out > 0);
        assert!(amount_a_out < 5_000);

        let reserves = setup.client.get_reserves();
        assert_eq!(reserves.reserve_b, 210_000);
        assert_eq!(reserves.reserve_a, 100_000 - amount_a_out);
    }

    #[test]
    fn test_swap_with_slippage_protection() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let result = setup.client.try_swap_a_for_b(&setup.bob, &10_000, &25_000);
        assert_eq!(result, Err(Ok(Error::InsufficientOutput)));
    }

    #[test]
    fn test_remove_more_than_balance_fails() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let result = setup.client.try_remove_liquidity(&setup.bob, &1000, &0, &0);
        assert_eq!(result, Err(Ok(Error::InsufficientLiquidity)));
    }

    // ── overflow / boundary tests ────────────────────────────────────────────

    /// swap_a_for_b with amount_a_in = i128::MAX overflows in the fee
    /// calculation (amount_a_in * 997) and must return Overflow.
    #[test]
    fn test_swap_a_for_b_max_amount_overflows() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let result = setup.client.try_swap_a_for_b(&setup.bob, &i128::MAX, &0);
        assert_eq!(result, Err(Ok(Error::Overflow)));
    }

    /// swap_b_for_a with amount_b_in = i128::MAX overflows similarly.
    #[test]
    fn test_swap_b_for_a_max_amount_overflows() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);

        let result = setup.client.try_swap_b_for_a(&setup.bob, &i128::MAX, &0);
        assert_eq!(result, Err(Ok(Error::Overflow)));
    }

    /// add_liquidity with amounts that would cause lp_total_supply * amount to
    /// overflow returns Overflow.
    #[test]
    fn test_add_liquidity_large_amounts_overflow() {
        let setup = setup();

        // First deposit: set up the pool with large reserves.
        setup.sac_a.mint(&setup.alice, &i128::MAX);
        setup.sac_b.mint(&setup.alice, &i128::MAX);

        // Seed the pool — use half of i128::MAX to leave room.
        let half = i128::MAX / 2;
        setup
            .client
            .add_liquidity(&setup.alice, &half, &half, &0, &0);

        // Second deposit: the lp_total_supply * amount_a product will overflow.
        let result = setup
            .client
            .try_add_liquidity(&setup.bob, &i128::MAX, &i128::MAX, &0, &0);
        assert_eq!(result, Err(Ok(Error::Overflow)));
    }

    /// add_liquidity with zero desired amounts is rejected as InvalidAmount.
    #[test]
    fn test_add_liquidity_zero_amount_rejected() {
        let setup = setup();
        let result = setup.client.try_add_liquidity(&setup.alice, &0, &100, &0, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    /// swap_a_for_b with amount = 0 is rejected as InvalidAmount.
    #[test]
    fn test_swap_a_for_b_zero_rejected() {
        let setup = setup();
        setup
            .client
            .add_liquidity(&setup.alice, &100_000, &200_000, &90_000, &180_000);
        let result = setup.client.try_swap_a_for_b(&setup.bob, &0, &0);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }
}
