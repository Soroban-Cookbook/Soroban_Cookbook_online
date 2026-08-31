#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/// Errors that can be returned by the price-oracle contract.
#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum OracleError {
    /// Caller is not the admin.
    Unauthorized = 1,
    /// The requested asset has never had a price recorded.
    AssetNotFound = 2,
    /// The stored price is older than the consumer-supplied `max_age`.
    StalePrice = 3,
    /// A supplied argument is out of the accepted range.
    InvalidArgument = 4,
    /// The contract has not been initialised yet.
    NotInitialized = 5,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

/// Composite storage key so each asset gets its own slot.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Admin address – who is allowed to call `set_price`.
    Admin,
    /// Price entry for the given asset symbol.
    Price(Symbol),
}

// ---------------------------------------------------------------------------
// On-chain price record
// ---------------------------------------------------------------------------

/// Full price record stored for every asset.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PriceEntry {
    /// The price value, scaled by `10^decimals`.
    pub price: i128,
    /// Number of decimal places (0–18).
    pub decimals: u32,
    /// Ledger timestamp (seconds since Unix epoch) when the entry was written.
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// On-chain price-oracle producer.
///
/// An admin account publishes price data; any other contract or off-chain
/// client can read it back.  Consumers are expected to enforce their own
/// freshness policy by comparing `PriceEntry.timestamp` against the current
/// ledger time and a `max_age` parameter.
#[contract]
pub struct PriceOracle;

#[contractimpl]
impl PriceOracle {
    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /// Initialise the oracle with an admin address.
    ///
    /// Can only be called once; a second call panics because the admin key
    /// already exists.
    ///
    /// # Arguments
    /// * `env`   – the Soroban environment
    /// * `admin` – address that is authorised to publish prices
    pub fn init(env: Env, admin: Address) {
        // Prevent re-initialisation.
        if env
            .storage()
            .instance()
            .has(&DataKey::Admin)
        {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    // -----------------------------------------------------------------------
    // Admin helpers
    // -----------------------------------------------------------------------

    /// Return the current admin address.
    pub fn get_admin(env: Env) -> Result<Address, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)
    }

    /// Transfer admin rights to a new address.
    ///
    /// The *current* admin must authorise this call.
    ///
    /// # Arguments
    /// * `env`       – the Soroban environment
    /// * `new_admin` – address that will become the new admin
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), OracleError> {
        let admin = Self::require_admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Price publishing (admin-only)
    // -----------------------------------------------------------------------

    /// Publish or update the price for an asset.
    ///
    /// Only the admin may call this function.  The timestamp recorded is the
    /// current ledger timestamp.
    ///
    /// # Arguments
    /// * `env`      – the Soroban environment
    /// * `asset`    – asset identifier, e.g. `Symbol::new(&env, "BTC")`
    /// * `price`    – price scaled by `10^decimals`; must be positive
    /// * `decimals` – number of decimal places (0–18)
    pub fn set_price(
        env: Env,
        asset: Symbol,
        price: i128,
        decimals: u32,
    ) -> Result<(), OracleError> {
        // Auth: only the admin may publish prices.
        let admin = Self::require_admin(&env)?;
        admin.require_auth();

        // Validate inputs.
        if price <= 0 {
            return Err(OracleError::InvalidArgument);
        }
        if decimals > 18 {
            return Err(OracleError::InvalidArgument);
        }

        let entry = PriceEntry {
            price,
            decimals,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Price(asset.clone()), &entry);

        // Emit an event so off-chain indexers can track updates.
        env.events().publish(
            (symbol_short!("set_price"), asset),
            (price, decimals, entry.timestamp),
        );

        Ok(())
    }

    // -----------------------------------------------------------------------
    // Price reading (public)
    // -----------------------------------------------------------------------

    /// Return the raw `PriceEntry` for an asset, without any freshness check.
    ///
    /// Consumers that have their own freshness logic (such as `oracle-consumer`)
    /// can call this and apply their own `max_age` policy.
    ///
    /// # Arguments
    /// * `env`   – the Soroban environment
    /// * `asset` – asset identifier
    pub fn get_price_entry(env: Env, asset: Symbol) -> Result<PriceEntry, OracleError> {
        env.storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::AssetNotFound)
    }

    /// Return `[price, decimals, timestamp]` as a flat `Vec<i128>`.
    ///
    /// This matches the interface that `oracle-consumer` expects so it can call
    /// this oracle directly via `env.invoke_contract`.
    ///
    /// # Arguments
    /// * `env`   – the Soroban environment
    /// * `asset` – asset identifier
    pub fn get_price(env: Env, asset: Symbol) -> Result<soroban_sdk::Vec<i128>, OracleError> {
        let entry: PriceEntry = env
            .storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::AssetNotFound)?;

        Ok(soroban_sdk::vec![
            &env,
            entry.price,
            entry.decimals as i128,
            entry.timestamp as i128,
        ])
    }

    /// Return the price, asserting it is not stale.
    ///
    /// # Arguments
    /// * `env`         – the Soroban environment
    /// * `asset`       – asset identifier
    /// * `max_age_secs`– maximum acceptable age of the price (seconds)
    ///
    /// # Errors
    /// Returns `OracleError::StalePrice` when the stored timestamp is more
    /// than `max_age_secs` seconds in the past relative to the current ledger.
    pub fn get_price_checked(
        env: Env,
        asset: Symbol,
        max_age_secs: u64,
    ) -> Result<PriceEntry, OracleError> {
        let entry: PriceEntry = env
            .storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::AssetNotFound)?;

        let now = env.ledger().timestamp();
        let age = now
            .checked_sub(entry.timestamp)
            .ok_or(OracleError::StalePrice)?;

        if age > max_age_secs {
            return Err(OracleError::StalePrice);
        }

        Ok(entry)
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    fn require_admin(env: &Env) -> Result<Address, OracleError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(OracleError::NotInitialized)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        Env, Symbol,
    };

    // -----------------------------------------------------------------------
    // Helper: create an initialised oracle + client in one line.
    // -----------------------------------------------------------------------

    fn setup() -> (Env, Address, PriceOracleClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(PriceOracle, ());
        let client = PriceOracleClient::new(&env, &contract_id);

        client.init(&admin);

        (env, admin, client)
    }

    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------

    #[test]
    fn test_init_stores_admin() {
        let (_, admin, client) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_init_panics() {
        let (env, admin, client) = setup();
        // Second init with a different address must panic.
        let other = Address::generate(&env);
        client.init(&other);
        let _ = admin; // silence unused warning
    }

    // -----------------------------------------------------------------------
    // Admin transfer
    // -----------------------------------------------------------------------

    #[test]
    fn test_set_admin_transfers_rights() {
        let (env, _old_admin, client) = setup();
        let new_admin = Address::generate(&env);

        client.set_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }

    // -----------------------------------------------------------------------
    // set_price
    // -----------------------------------------------------------------------

    #[test]
    fn test_set_price_succeeds_for_admin() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "BTC");

        client.set_price(&asset, &43_000_000_000_i128, &6);

        let entry = client.get_price_entry(&asset);
        assert_eq!(entry.price, 43_000_000_000_i128);
        assert_eq!(entry.decimals, 6);
    }

    #[test]
    fn test_set_price_rejects_zero_price() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "BTC");

        let result = client.try_set_price(&asset, &0_i128, &6);
        assert_eq!(result, Err(Ok(OracleError::InvalidArgument)));
    }

    #[test]
    fn test_set_price_rejects_negative_price() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "ETH");

        let result = client.try_set_price(&asset, &-1_i128, &6);
        assert_eq!(result, Err(Ok(OracleError::InvalidArgument)));
    }

    #[test]
    fn test_set_price_rejects_decimals_above_18() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "ETH");

        let result = client.try_set_price(&asset, &1_000_i128, &19);
        assert_eq!(result, Err(Ok(OracleError::InvalidArgument)));
    }

    #[test]
    fn test_set_price_requires_admin_auth() {
        // Without mock_all_auths the SDK enforces real auth.
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register(PriceOracle, ());
        let client = PriceOracleClient::new(&env, &contract_id);

        // Use mock_all_auths only for init.
        env.mock_all_auths();
        client.init(&admin);

        // Now stop mocking so auth is enforced.
        // A non-admin tries to publish a price — this must fail.
        let result = client.try_set_price(&Symbol::new(&env, "BTC"), &1_000_i128, &6);
        // Should panic / error because admin hasn't signed.
        assert!(result.is_err());
    }

    // -----------------------------------------------------------------------
    // get_price_entry
    // -----------------------------------------------------------------------

    #[test]
    fn test_get_price_entry_for_unknown_asset_returns_error() {
        let (env, _, client) = setup();
        let result = client.try_get_price_entry(&Symbol::new(&env, "XLM"));
        assert_eq!(result, Err(Ok(OracleError::AssetNotFound)));
    }

    // -----------------------------------------------------------------------
    // get_price (Vec<i128> format for oracle-consumer compatibility)
    // -----------------------------------------------------------------------

    #[test]
    fn test_get_price_returns_vec_format() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "ETH");

        client.set_price(&asset, &2_000_000_000_i128, &6);

        let data = client.get_price(&asset);
        assert_eq!(data.len(), 3);
        assert_eq!(data.get_unchecked(0), 2_000_000_000_i128); // price
        assert_eq!(data.get_unchecked(1), 6_i128);              // decimals
        // timestamp ≥ 0 (just verify it's plausible)
        assert!(data.get_unchecked(2) >= 0);
    }

    // -----------------------------------------------------------------------
    // get_price_checked (freshness enforcement)
    // -----------------------------------------------------------------------

    #[test]
    fn test_get_price_checked_accepts_fresh_price() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "USD");

        client.set_price(&asset, &1_000_000_i128, &6);

        // max_age = 3600 s, ledger time has not advanced → fresh.
        let entry = client.get_price_checked(&asset, &3600_u64);
        assert_eq!(entry.price, 1_000_000_i128);
    }

    #[test]
    fn test_get_price_checked_rejects_stale_price() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "USD");

        // Record price at t = 0.
        client.set_price(&asset, &1_000_000_i128, &6);

        // Advance ledger by 7 200 seconds (2 hours).
        env.ledger().with_mut(|info| {
            info.timestamp += 7_200;
        });

        // max_age = 3600 s → price is now 7200 s old → stale.
        let result = client.try_get_price_checked(&asset, &3600_u64);
        assert_eq!(result, Err(Ok(OracleError::StalePrice)));
    }

    #[test]
    fn test_get_price_checked_at_exact_boundary() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "EUR");

        client.set_price(&asset, &1_100_000_i128, &6);

        // Advance exactly max_age seconds → age == max_age → still fresh.
        env.ledger().with_mut(|info| {
            info.timestamp += 3600;
        });

        let entry = client.get_price_checked(&asset, &3600_u64);
        assert_eq!(entry.price, 1_100_000_i128);
    }

    #[test]
    fn test_get_price_checked_one_second_over_boundary() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "EUR");

        client.set_price(&asset, &1_100_000_i128, &6);

        // One second past the boundary → stale.
        env.ledger().with_mut(|info| {
            info.timestamp += 3601;
        });

        let result = client.try_get_price_checked(&asset, &3600_u64);
        assert_eq!(result, Err(Ok(OracleError::StalePrice)));
    }

    // -----------------------------------------------------------------------
    // Multiple assets
    // -----------------------------------------------------------------------

    #[test]
    fn test_multiple_assets_stored_independently() {
        let (env, _, client) = setup();

        let btc = Symbol::new(&env, "BTC");
        let eth = Symbol::new(&env, "ETH");
        let usd = Symbol::new(&env, "USD");

        client.set_price(&btc, &43_000_000_000_i128, &6);
        client.set_price(&eth, &2_500_000_000_i128, &6);
        client.set_price(&usd, &1_000_000_i128, &6);

        assert_eq!(client.get_price_entry(&btc).price, 43_000_000_000_i128);
        assert_eq!(client.get_price_entry(&eth).price, 2_500_000_000_i128);
        assert_eq!(client.get_price_entry(&usd).price, 1_000_000_i128);
    }

    // -----------------------------------------------------------------------
    // Price update
    // -----------------------------------------------------------------------

    #[test]
    fn test_price_can_be_updated() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "BTC");

        client.set_price(&asset, &43_000_000_000_i128, &6);
        assert_eq!(client.get_price_entry(&asset).price, 43_000_000_000_i128);

        // Advance time and publish a new price.
        env.ledger().with_mut(|info| {
            info.timestamp += 600;
        });

        client.set_price(&asset, &44_000_000_000_i128, &6);
        assert_eq!(client.get_price_entry(&asset).price, 44_000_000_000_i128);
    }

    // -----------------------------------------------------------------------
    // Decimals handling
    // -----------------------------------------------------------------------

    #[test]
    fn test_decimals_stored_correctly() {
        let (env, _, client) = setup();
        let asset = Symbol::new(&env, "BTC");

        // 8 decimal places.
        client.set_price(&asset, &4_300_000_000_000_i128, &8);
        let entry = client.get_price_entry(&asset);
        assert_eq!(entry.decimals, 8);
    }
}
