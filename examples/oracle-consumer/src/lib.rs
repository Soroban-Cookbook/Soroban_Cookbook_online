#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Address, Env, IntoVal, Symbol, Vec,
};

/// Error types for oracle operations
#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum OracleError {
    /// Oracle data is stale or expired
    StaleData = 1,
    /// Oracle contract not found or invalid
    InvalidOracle = 2,
    /// Price is invalid or zero
    InvalidPrice = 3,
    /// Caller is not authorized
    Unauthorized = 4,
}

impl OracleError {
    pub fn into_u32(self) -> u32 {
        self as u32
    }
}

/// Oracle price data with timestamp
#[derive(Clone)]
pub struct PriceData {
    pub price: i128,
    pub decimals: u32,
    pub timestamp: u64,
}

/// Oracle consumer contract that reads price feeds from an oracle
#[contract]
pub struct OracleConsumer;

#[contractimpl]
impl OracleConsumer {
    /// Initialize the oracle consumer with an oracle contract address
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `oracle_address` - Address of the trusted oracle contract
    /// * `max_age_secs` - Maximum age of price data in seconds (data freshness)
    pub fn init(env: Env, oracle_address: Address, max_age_secs: u64) {
        env.storage()
            .instance()
            .set(&symbol_short!("oracle"), &oracle_address);
        env.storage()
            .instance()
            .set(&symbol_short!("max_age"), &max_age_secs);
    }

    /// Get the current oracle address
    pub fn get_oracle(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&symbol_short!("oracle"))
            .expect("Oracle not initialized")
    }

    /// Get the maximum age for price data
    pub fn get_max_age(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&symbol_short!("max_age"))
            .unwrap_or(3600) // Default 1 hour
    }

    /// Update the oracle address (admin function)
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `new_oracle` - New oracle contract address
    pub fn set_oracle(env: Env, new_oracle: Address) {
        // In production, add authorization check
        env.storage()
            .instance()
            .set(&symbol_short!("oracle"), &new_oracle);
    }

    /// Update the maximum age for price data
    pub fn set_max_age(env: Env, max_age_secs: u64) {
        // In production, add authorization check
        env.storage()
            .instance()
            .set(&symbol_short!("max_age"), &max_age_secs);
    }

    /// Fetch price for a specific asset from the oracle
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `asset` - The asset symbol to fetch price for (e.g., "USD")
    ///
    /// # Returns
    /// The price as i128 with decimals
    pub fn get_price(env: Env, asset: Symbol) -> Result<i128, OracleError> {
        let oracle = Self::get_oracle(env.clone());
        let max_age = Self::get_max_age(env.clone());

        // Call the oracle contract to fetch price
        // This demonstrates cross-contract invocation
        let price_data: Vec<i128> = env.invoke_contract(
            &oracle,
            &symbol_short!("get_price"),
            soroban_sdk::vec![&env, asset.into_val(&env)],
        );

        // Extract price, decimals, and timestamp from response
        if price_data.len() < 3 {
            return Err(OracleError::InvalidPrice);
        }

        let price = price_data.get_unchecked(0);
        let _decimals = price_data.get_unchecked(1);
        let timestamp = price_data.get_unchecked(2);

        // Validate price is positive
        if price <= 0 {
            return Err(OracleError::InvalidPrice);
        }

        // Check data freshness
        let current_time = env.ledger().timestamp();
        let age = current_time
            .checked_sub(timestamp as u64)
            .ok_or(OracleError::StaleData)?;

        if age > max_age {
            return Err(OracleError::StaleData);
        }

        Ok(price)
    }

    /// Fetch detailed price data including decimals and timestamp
    pub fn get_price_data(env: Env, asset: Symbol) -> Result<(i128, u32, u64), OracleError> {
        let oracle = Self::get_oracle(env.clone());
        let max_age = Self::get_max_age(env.clone());

        // Call oracle contract
        let price_data: Vec<i128> = env.invoke_contract(
            &oracle,
            &Symbol::new(&env, "get_price_data"),
            soroban_sdk::vec![&env, asset.into_val(&env)],
        );

        if price_data.len() < 3 {
            return Err(OracleError::InvalidPrice);
        }

        let price = price_data.get_unchecked(0);
        let decimals = price_data.get_unchecked(1) as u32;
        let timestamp = price_data.get_unchecked(2) as u64;

        // Validate price is positive
        if price <= 0 {
            return Err(OracleError::InvalidPrice);
        }

        // Validate decimals (reasonable range)
        if decimals > 18 {
            return Err(OracleError::InvalidPrice);
        }

        // Check data freshness
        let current_time = env.ledger().timestamp();
        let age = current_time
            .checked_sub(timestamp)
            .ok_or(OracleError::StaleData)?;

        if age > max_age {
            return Err(OracleError::StaleData);
        }

        Ok((price, decimals, timestamp))
    }

    /// Calculate value of an amount in an asset based on current price
    ///
    /// # Arguments
    /// * `env` - The Soroban environment
    /// * `asset` - The asset symbol
    /// * `amount` - The amount of the asset
    ///
    /// # Returns
    /// The value in the base currency (USD)
    pub fn calculate_value(env: Env, asset: Symbol, amount: i128) -> Result<i128, OracleError> {
        let (price, decimals, _) = Self::get_price_data(env, asset)?;

        // Calculate: (amount * price) / 10^decimals
        let value = amount
            .checked_mul(price)
            .ok_or(OracleError::InvalidPrice)?
            .checked_div(10_i128.pow(decimals))
            .ok_or(OracleError::InvalidPrice)?;

        Ok(value)
    }

    /// Get multiple prices in a single call (gas efficient)
    pub fn get_prices(env: Env, assets: Vec<Symbol>) -> Result<Vec<i128>, OracleError> {
        let mut prices = soroban_sdk::vec![&env];

        for asset in assets.iter() {
            let price = Self::get_price(env.clone(), asset)?;
            prices.push_back(price);
        }

        Ok(prices)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{symbol_short, Env, Symbol};

    /// Mock oracle contract for testing
    #[contract]
    pub struct MockOracle;

    #[contractimpl]
    impl MockOracle {
        pub fn get_price(env: Env, asset: Symbol) -> Vec<i128> {
            let usd = Symbol::new(&env, "USD");
            let eur = Symbol::new(&env, "EUR");
            let gbp = Symbol::new(&env, "GBP");
            let btc = Symbol::new(&env, "BTC");

            let price = if asset == usd {
                1_000_000
            } else if asset == eur {
                1_100_000
            } else if asset == gbp {
                1_250_000
            } else if asset == btc {
                43_000_000_000
            } else {
                0
            };

            soroban_sdk::vec![
                &env,
                price,
                6,                                // 6 decimals
                env.ledger().timestamp() as i128, // current timestamp
            ]
        }

        pub fn get_price_data(env: Env, asset: Symbol) -> Vec<i128> {
            Self::get_price(env, asset)
        }
    }

    #[test]
    fn test_oracle_init() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);

        assert_eq!(client.get_oracle(), oracle_id);
        assert_eq!(client.get_max_age(), 3600);
    }

    #[test]
    fn test_get_price() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);

        let usd_price = client.get_price(&Symbol::new(&env, "USD"));
        assert_eq!(usd_price, 1_000_000);

        let btc_price = client.get_price(&Symbol::new(&env, "BTC"));
        assert_eq!(btc_price, 43_000_000_000);
    }

    #[test]
    fn test_get_price_data() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);

        let (price, decimals, _timestamp) = client.get_price_data(&Symbol::new(&env, "EUR"));

        assert_eq!(price, 1_100_000);
        assert_eq!(decimals, 6);
    }

    #[test]
    fn test_calculate_value() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);

        // 100 USD = 100 * 1,000,000 / 10^6 = 100
        let value = client.calculate_value(&Symbol::new(&env, "USD"), &100);
        assert_eq!(value, 100);

        // 0.5 BTC at $43,000 each
        let btc_value = client.calculate_value(&Symbol::new(&env, "BTC"), &500_000);
        assert_eq!(btc_value, 21_500_000_000);
    }

    #[test]
    fn test_get_prices_multiple() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);

        let assets = soroban_sdk::vec![
            &env,
            Symbol::new(&env, "USD"),
            Symbol::new(&env, "EUR"),
            Symbol::new(&env, "GBP"),
        ];

        let prices = client.get_prices(&assets);
        assert_eq!(prices.len(), 3);
        assert_eq!(prices.get_unchecked(0), 1_000_000);
        assert_eq!(prices.get_unchecked(1), 1_100_000);
        assert_eq!(prices.get_unchecked(2), 1_250_000);
    }

    #[test]
    fn test_set_oracle() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle1_id = env.register(MockOracle, ());
        let oracle2_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle1_id, &3600);
        assert_eq!(client.get_oracle(), oracle1_id);

        client.set_oracle(&oracle2_id);
        assert_eq!(client.get_oracle(), oracle2_id);
    }

    #[test]
    fn test_set_max_age() {
        let env = Env::default();
        let consumer_id = env.register(OracleConsumer, ());
        let oracle_id = env.register(MockOracle, ());
        let client = OracleConsumerClient::new(&env, &consumer_id);

        client.init(&oracle_id, &3600);
        assert_eq!(client.get_max_age(), 3600);

        client.set_max_age(&7200);
        assert_eq!(client.get_max_age(), 7200);
    }
}
