#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Env, Vec};

/// Error types for the TWAP helper contract.
#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum TwapError {
    /// No observations have been recorded yet.
    NoObservations = 1,
    /// The requested TWAP window is invalid (e.g. zero).
    InvalidWindow = 2,
    /// The observed price is invalid (e.g. zero or negative).
    InvalidPrice = 3,
    /// There are no observations within the requested window.
    InsufficientData = 4,
    /// Arithmetic overflow while computing the average.
    Overflow = 5,
}

/// A single price observation.
///
/// `price` is in effect from `timestamp` until the next observation (or until
/// the current time, for the most recent observation).
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Observation {
    pub price: i128,
    pub timestamp: u64,
}

/// Storage keys.
#[contracttype]
pub enum DataKey {
    Observations,
}

/// A minimal Time-Weighted Average Price (TWAP) helper contract.
///
/// # Warning (educational example)
///
/// This contract is a **teaching example**. It is intentionally minimal so the
/// accumulator math is easy to follow, but it is **not** audited and should
/// **not** be deployed with real value without a thorough security review.
///
/// # How the average is computed
///
/// Every call to [`observe`](Self::observe) records a `(price, timestamp)`
/// pair. The time-weighted average price over a window is the price weighted by
/// how long each price was active:
///
/// ```text
/// TWAP = Σ price_i * duration_i  /  covered_time
/// ```
///
/// where each `duration_i` is the time `price_i` stayed current within the
/// window, and `covered_time` equals `window` when observations cover the full
/// window (it is shorter when the first observation starts inside the window).
///
/// # Security note on sparse observations
///
/// This helper averages **only the time during which observations are
/// available**. If the first observation happens *after* the window start, the
/// price before that point is unknown and is **not** averaged in. With
/// infrequent observations a single stale price can dominate the result, so a
/// production TWAP should: combine TWAPs over several overlapping windows, prune
/// old observations, cap how far apart two observations may be, and use
/// [`persistent`](soroban_sdk::storage::Persistent) storage with explicit TTL
/// management instead of a single growing list.
#[contract]
pub struct TwapHelper;

#[contractimpl]
impl TwapHelper {
    /// Record a new price observation at the current ledger timestamp.
    ///
    /// # Arguments
    /// * `price` - The observed price (must be positive).
    ///
    /// # Returns
    /// The ledger timestamp at which the observation was recorded.
    pub fn observe(env: Env, price: i128) -> Result<u64, TwapError> {
        if price <= 0 {
            return Err(TwapError::InvalidPrice);
        }

        let now = env.ledger().timestamp();

        let mut observations: Vec<Observation> = env
            .storage()
            .instance()
            .get(&DataKey::Observations)
            .unwrap_or(soroban_sdk::vec![&env]);

        observations.push_back(Observation {
            price,
            timestamp: now,
        });

        env.storage()
            .instance()
            .set(&DataKey::Observations, &observations);

        Ok(now)
    }

    /// Return the time-weighted average price over the last `window` seconds.
    ///
    /// # Arguments
    /// * `window` - The number of seconds to average over (must be > 0).
    ///
    /// # Returns
    /// The TWAP as an `i128`. See the module docs for the exact math and the
    /// caveats around sparse observations.
    pub fn twap(env: Env, window: u64) -> Result<i128, TwapError> {
        if window == 0 {
            return Err(TwapError::InvalidWindow);
        }

        let now = env.ledger().timestamp();

        let observations: Vec<Observation> = env
            .storage()
            .instance()
            .get(&DataKey::Observations)
            .ok_or(TwapError::NoObservations)?;

        if observations.len() == 0 {
            return Err(TwapError::NoObservations);
        }

        // The window starts `window` seconds ago (clamped so it cannot go
        // negative when the window reaches back before "time zero").
        let window_start: i128 = (now as i128).saturating_sub(window as i128);

        let n = observations.len();

        // Active price starts at the first available observation. If that
        // observation is after `window_start`, we only have data from its
        // timestamp onward (sparse-observation caveat, see module docs).
        let first_ts = observations.get_unchecked(0).timestamp as i128;
        let data_start = if first_ts > window_start {
            first_ts
        } else {
            window_start
        };

        if data_start >= now as i128 {
            return Err(TwapError::InsufficientData);
        }

        // The price active at `data_start` is the last observation whose
        // timestamp is at or before `data_start`.
        let mut idx: u32 = 0;
        let mut active_price: i128 = 0;
        while idx < n && (observations.get_unchecked(idx).timestamp as i128) <= data_start {
            active_price = observations.get_unchecked(idx).price;
            idx += 1;
        }

        // Integrate price over time from `data_start` to `now`.
        let mut cursor = data_start;
        let mut integral: i128 = 0;
        while cursor < now as i128 {
            let next_boundary: i128 = if idx < n {
                observations.get_unchecked(idx).timestamp as i128
            } else {
                now as i128
            };
            let seg_end = if next_boundary > now as i128 {
                now as i128
            } else {
                next_boundary
            };

            if seg_end > cursor {
                let dt = seg_end - cursor;
                let add = active_price.checked_mul(dt).ok_or(TwapError::Overflow)?;
                integral = integral.checked_add(add).ok_or(TwapError::Overflow)?;
                cursor = seg_end;
            }

            if idx < n {
                active_price = observations.get_unchecked(idx).price;
                idx += 1;
            }
        }

        let elapsed = (now as i128) - data_start;
        let twap = integral.checked_div(elapsed).ok_or(TwapError::Overflow)?;

        Ok(twap)
    }

    /// Clear all recorded observations.
    pub fn reset(env: Env) {
        env.storage().instance().remove(&DataKey::Observations);
    }

    /// Return how many observations have been recorded so far.
    pub fn get_observation_count(env: Env) -> u32 {
        let observations: Vec<Observation> = env
            .storage()
            .instance()
            .get(&DataKey::Observations)
            .unwrap_or(soroban_sdk::vec![&env]);
        observations.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Ledger;

    fn register(env: &Env) -> TwapHelperClient<'_> {
        let id = env.register(TwapHelper, ());
        TwapHelperClient::new(env, &id)
    }

    #[test]
    fn test_empty_twap_error() {
        let env = Env::default();
        let client = register(&env);

        let result = client.try_twap(&3600);
        assert_eq!(result, Err(Ok(TwapError::NoObservations)));
    }

    #[test]
    fn test_invalid_price_error() {
        let env = Env::default();
        let client = register(&env);

        assert_eq!(client.try_observe(&0), Err(Ok(TwapError::InvalidPrice)));
        assert_eq!(client.try_observe(&-5), Err(Ok(TwapError::InvalidPrice)));
    }

    #[test]
    fn test_invalid_window_error() {
        let env = Env::default();
        let client = register(&env);

        // One observation so twap is reached, then a zero window is rejected.
        env.ledger().set_timestamp(1000);
        client.observe(&100);

        let result = client.try_twap(&0);
        assert_eq!(result, Err(Ok(TwapError::InvalidWindow)));
    }

    #[test]
    fn test_two_observations_average_correctly() {
        let env = Env::default();
        let client = register(&env);

        // Observation 1: price 1000 at t=1000
        env.ledger().set_timestamp(1000);
        let t1 = client.observe(&1000);
        assert_eq!(t1, 1000);

        // 100s later observe price 2000 at t=1100
        env.ledger().set_timestamp(1100);
        let t2 = client.observe(&2000);
        assert_eq!(t2, 1100);

        // 100s later the window is [1000, 1200].
        env.ledger().set_timestamp(1200);

        // price 1000 was active for 100s, price 2000 for 100s.
        // TWAP = (1000*100 + 2000*100) / 200 = 1500
        let twap = client.twap(&200);
        assert_eq!(twap, 1500);
    }

    #[test]
    fn test_twap_weights_longer_prices_more_heavily() {
        let env = Env::default();
        let client = register(&env);

        // price 1000 active for 300s, then 3000 active for 100s.
        env.ledger().set_timestamp(0);
        client.observe(&1000);

        env.ledger().set_timestamp(300);
        client.observe(&3000);

        env.ledger().set_timestamp(400);

        // TWAP = (1000*300 + 3000*100) / 400 = (300000 + 300000) / 400 = 1500
        let twap = client.twap(&400);
        assert_eq!(twap, 1500);
    }

    #[test]
    fn test_twap_immediate_observe() {
        let env = Env::default();
        let client = register(&env);

        // A single observation that spans the whole window returns its price.
        env.ledger().set_timestamp(0);
        client.observe(&4200);

        env.ledger().set_timestamp(1000);
        assert_eq!(client.twap(&1000), 4200);
    }

    #[test]
    fn test_reset_and_count() {
        let env = Env::default();
        let client = register(&env);

        assert_eq!(client.get_observation_count(), 0);

        env.ledger().set_timestamp(0);
        client.observe(&100);
        client.observe(&200);
        assert_eq!(client.get_observation_count(), 2);

        client.reset();
        assert_eq!(client.get_observation_count(), 0);
    }
}
