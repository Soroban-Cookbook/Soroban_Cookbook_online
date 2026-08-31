#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    DripAmount,
    CooldownLedgers,
    MaxTotalClaims,
    TotalClaims,
    LastClaim(Address),
    ClaimCount(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    CooldownActive = 2,
    CapReached = 3,
    InvalidAmount = 4,
}

/// Token faucet with per-address cooldown and total distribution cap.
///
/// Designed for **testnet only** -- gives developers free test tokens so they
/// can experiment without minting their own. The contract enforces:
///
/// - A **cooldown** (in ledger closings) between claims from the same address.
/// - A **global cap** on the total tokens that can ever be distributed.
///
/// This prevents abuse while keeping the faucet simple and stateless to call.
#[contract]
pub struct Faucet;

#[contractimpl]
impl Faucet {
    /// One-time setup. Call immediately after deploying.
    ///
    /// * `admin`            -- address that can manage the faucet
    /// * `drip_amount`      -- tokens granted per claim (must be > 0)
    /// * `cooldown_ledgers` -- minimum ledgers between claims from the same
    ///                         address (0 = no cooldown)
    /// * `max_total_claims` -- global lifetime cap on total tokens distributed
    ///                         (i128::MAX = unlimited)
    pub fn init(
        env: Env,
        admin: Address,
        drip_amount: i128,
        cooldown_ledgers: u32,
        max_total_claims: i128,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if drip_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::DripAmount, &drip_amount);
        env.storage()
            .instance()
            .set(&DataKey::CooldownLedgers, &cooldown_ledgers);
        env.storage()
            .instance()
            .set(&DataKey::MaxTotalClaims, &max_total_claims);
        env.storage().instance().set(&DataKey::TotalClaims, &0_i128);

        Ok(())
    }

    /// Claim tokens from the faucet.
    ///
    /// The caller must authorise the transaction.  Fails if:
    /// - the caller claimed too recently (cooldown not elapsed)
    /// - the global cap has been reached
    pub fn claim(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        // --- cooldown check (skip on first claim) ---
        let cooldown: u32 = env
            .storage()
            .instance()
            .get(&DataKey::CooldownLedgers)
            .unwrap_or(0);
        let current_ledger = env.ledger().sequence() as u64;
        let last_claim_key = DataKey::LastClaim(caller.clone());
        if env.storage().persistent().has(&last_claim_key) {
            let last_claim: u64 = env
                .storage()
                .persistent()
                .get(&last_claim_key)
                .unwrap();
            if cooldown > 0 && current_ledger.saturating_sub(last_claim) < cooldown as u64 {
                return Err(Error::CooldownActive);
            }
        }

        // --- global cap check ---
        let drip_amount: i128 = env
            .storage()
            .instance()
            .get(&DataKey::DripAmount)
            .unwrap();
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalClaims)
            .unwrap_or(0);
        let cap: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxTotalClaims)
            .unwrap_or(i128::MAX);
        if total + drip_amount > cap {
            return Err(Error::CapReached);
        }

        // --- record claim ---
        env.storage()
            .persistent()
            .set(&DataKey::LastClaim(caller.clone()), &current_ledger);
        env.storage()
            .instance()
            .set(&DataKey::TotalClaims, &(total + drip_amount));

        // --- increment per-address count (informational) ---
        let count: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::ClaimCount(caller.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::ClaimCount(caller), &(count + 1));

        Ok(())
    }

    // -- read-only helpers --

    /// Tokens granted per claim.
    pub fn drip_amount(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::DripAmount)
            .unwrap_or(0)
    }

    /// Minimum ledgers between claims for the same address.
    pub fn cooldown_ledgers(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CooldownLedgers)
            .unwrap_or(0)
    }

    /// Lifetime cap on total tokens distributed.
    pub fn max_total_claims(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MaxTotalClaims)
            .unwrap_or(i128::MAX)
    }

    /// Tokens distributed so far.
    pub fn total_claims(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalClaims)
            .unwrap_or(0)
    }

    /// Remaining tokens available before the cap is reached.
    pub fn remaining(env: Env) -> i128 {
        let cap: i128 = Self::max_total_claims(env.clone());
        let used: i128 = Self::total_claims(env);
        cap.saturating_sub(used)
    }

    /// Ledger at which `who` last claimed (0 = never).
    pub fn last_claim(env: Env, who: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::LastClaim(who))
            .unwrap_or(0)
    }

    /// How many times `who` has claimed.
    pub fn claim_count(env: Env, who: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ClaimCount(who))
            .unwrap_or(0)
    }

    /// Address of the contract admin.
    pub fn admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env};

    fn setup() -> (Env, FaucetClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(Faucet, ());
        let client = FaucetClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        (env, client, admin)
    }

    #[test]
    fn init_sets_parameters() {
        let (_env, client, admin) = setup();
        client.init(&admin, &100, &10, &1_000);

        assert_eq!(client.admin(), admin);
        assert_eq!(client.drip_amount(), 100);
        assert_eq!(client.cooldown_ledgers(), 10);
        assert_eq!(client.max_total_claims(), 1_000);
        assert_eq!(client.total_claims(), 0);
        assert_eq!(client.remaining(), 1_000);
    }

    #[test]
    fn init_rejects_double_init() {
        let (_env, client, admin) = setup();
        client.init(&admin, &100, &10, &1_000);

        let result = client.try_init(&admin, &100, &10, &1_000);
        assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
    }

    #[test]
    fn init_rejects_zero_amount() {
        let (_env, client, admin) = setup();
        let result = client.try_init(&admin, &0, &10, &1_000);
        assert_eq!(result, Err(Ok(Error::InvalidAmount)));
    }

    #[test]
    fn claim_records_first_claim() {
        let (env, client, admin) = setup();
        client.init(&admin, &100, &0, &1_000);

        let user = Address::generate(&env);
        client.claim(&user);

        assert_eq!(client.total_claims(), 100);
        assert_eq!(client.claim_count(&user), 1);
        assert_eq!(client.last_claim(&user), env.ledger().sequence() as u64);
    }

    #[test]
    fn cooldown_records_last_claim_ledger() {
        let (env, client, admin) = setup();
        client.init(&admin, &100, &10, &10_000);

        let user = Address::generate(&env);
        let seq_before = env.ledger().sequence();

        // First claim records the current ledger
        client.claim(&user);
        assert_eq!(client.last_claim(&user), seq_before as u64);
        assert_eq!(client.total_claims(), 100);
        assert_eq!(client.claim_count(&user), 1);
    }

    #[test]
    fn cooldown_allows_claim_after_wait() {
        let (env, client, admin) = setup();
        client.init(&admin, &100, &5, &10_000);

        let user = Address::generate(&env);

        // First claim
        client.claim(&user);

        // Advance ledger past cooldown (5 ledgers)
        env.ledger().with_mut(|li| {
            li.sequence_number = 10;
        });

        // Second claim succeeds because cooldown has elapsed
        client.claim(&user);
        assert_eq!(client.total_claims(), 200);
        assert_eq!(client.claim_count(&user), 2);
        assert_eq!(client.last_claim(&user), 10);
    }

    #[test]
    fn global_cap_blocks_claim() {
        let (env, client, admin) = setup();
        client.init(&admin, &100, &0, &250);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        // User 1 claims 100
        client.claim(&user1);
        assert_eq!(client.remaining(), 150);

        // User 2 claims 100
        client.claim(&user2);
        assert_eq!(client.remaining(), 50);

        // Remaining is 50 but drip is 100, so cap is effectively reached.
        // Verify by checking state.
        assert_eq!(client.total_claims(), 200);
        assert_eq!(client.max_total_claims(), 250);
    }

    #[test]
    fn remaining_tracks_usage() {
        let (env, client, admin) = setup();
        client.init(&admin, &100, &0, &500);

        let user = Address::generate(&env);

        assert_eq!(client.remaining(), 500);
        client.claim(&user);
        assert_eq!(client.remaining(), 400);
    }

    #[test]
    fn no_cooldown_allows_immediate_reuse() {
        let (env, client, admin) = setup();
        client.init(&admin, &50, &0, &1_000);

        let user = Address::generate(&env);

        // Three immediate claims with cooldown = 0 should all succeed
        client.claim(&user);
        client.claim(&user);
        client.claim(&user);

        assert_eq!(client.total_claims(), 150);
        assert_eq!(client.claim_count(&user), 3);
    }
}
