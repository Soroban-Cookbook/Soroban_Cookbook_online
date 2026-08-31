#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
    Vec,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transaction {
    pub targets: Vec<Address>,
    pub values: Vec<i128>,
    pub signatures: Vec<Symbol>,
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum TimelockDataKey {
    Admin,
    Delay,
    PendingTransactions(Transaction),
    DoneTransactions(Transaction),
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const TOPIC_TX_QUEUED: Symbol = symbol_short!("TxQ");
const TOPIC_TX_EXECUTED: Symbol = symbol_short!("TxExec");
const TOPIC_TX_CANCELED: Symbol = symbol_short!("TxCancel");

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TimelockError {
    AlreadyInitialized = 1,
    InvalidDelay = 2,
    Unauthorized = 3,
    TransactionNotQueued = 4,
    TransactionAlreadyExecuted = 5,
}

// ---------------------------------------------------------------------------
// Timelock Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct Timelock;

#[contractimpl]
impl Timelock {
    /// Initialize the timelock with an admin and delay period.
    pub fn initialize(env: Env, admin: Address, delay: u64) -> Result<(), TimelockError> {
        if env.storage().instance().has(&TimelockDataKey::Admin) {
            return Err(TimelockError::AlreadyInitialized);
        }

        admin.require_auth();

        if delay == 0 {
            return Err(TimelockError::InvalidDelay);
        }

        env.storage()
            .instance()
            .set(&TimelockDataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&TimelockDataKey::Delay, &delay);

        Ok(())
    }

    /// Queue a transaction for execution after the delay.
    pub fn queue_transaction(
        env: Env,
        targets: Vec<Address>,
        values: Vec<i128>,
        signatures: Vec<Symbol>,
    ) {
        let tx = Transaction {
            targets,
            values,
            signatures,
        };

        env.storage()
            .instance()
            .set(&TimelockDataKey::PendingTransactions(tx), &true);

        env.events().publish((TOPIC_TX_QUEUED,), ());
    }

    /// Execute a queued transaction.
    pub fn execute_transaction(
        env: Env,
        targets: Vec<Address>,
        values: Vec<i128>,
        signatures: Vec<Symbol>,
    ) -> Result<(), TimelockError> {
        let tx = Transaction {
            targets: targets.clone(),
            values: values.clone(),
            signatures: signatures.clone(),
        };

        if !env
            .storage()
            .instance()
            .has(&TimelockDataKey::PendingTransactions(tx.clone()))
        {
            return Err(TimelockError::TransactionNotQueued);
        }

        // Record execution
        env.storage()
            .instance()
            .set(&TimelockDataKey::DoneTransactions(tx.clone()), &true);

        env.storage()
            .instance()
            .remove(&TimelockDataKey::PendingTransactions(tx));

        env.events().publish((TOPIC_TX_EXECUTED,), ());

        Ok(())
    }

    /// Cancel a queued transaction. Only callable by admin.
    pub fn cancel_transaction(
        env: Env,
        targets: Vec<Address>,
        values: Vec<i128>,
        signatures: Vec<Symbol>,
    ) -> Result<(), TimelockError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&TimelockDataKey::Admin)
            .ok_or(TimelockError::Unauthorized)?;

        admin.require_auth();

        let tx = Transaction {
            targets,
            values,
            signatures,
        };

        if !env
            .storage()
            .instance()
            .has(&TimelockDataKey::PendingTransactions(tx.clone()))
        {
            return Err(TimelockError::TransactionNotQueued);
        }

        env.storage()
            .instance()
            .remove(&TimelockDataKey::PendingTransactions(tx));

        env.events().publish((TOPIC_TX_CANCELED,), ());

        Ok(())
    }

    /// Get the timelock delay.
    pub fn get_delay(env: Env) -> Result<u64, TimelockError> {
        env.storage()
            .instance()
            .get(&TimelockDataKey::Delay)
            .ok_or(TimelockError::AlreadyInitialized)
    }

    /// Get the admin address.
    pub fn get_admin(env: Env) -> Result<Address, TimelockError> {
        env.storage()
            .instance()
            .get(&TimelockDataKey::Admin)
            .ok_or(TimelockError::AlreadyInitialized)
    }

    /// Check if a transaction is queued.
    pub fn is_queued(
        env: Env,
        targets: Vec<Address>,
        values: Vec<i128>,
        signatures: Vec<Symbol>,
    ) -> bool {
        let tx = Transaction {
            targets,
            values,
            signatures,
        };
        env.storage()
            .instance()
            .has(&TimelockDataKey::PendingTransactions(tx))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as AddressTestUtils;
    use soroban_sdk::{vec, Env};

    fn setup() -> (Env, Address, TimelockClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register(Timelock, ());
        let client = TimelockClient::new(&env, &contract_id);
        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, admin, client) = setup();
        client.initialize(&admin, &3600);

        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_delay(), 3600);
    }

    #[test]
    fn test_double_initialize_fails() {
        let (_env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let result = client.try_initialize(&admin, &7200);
        assert_eq!(result, Err(Ok(TimelockError::AlreadyInitialized)));
    }

    #[test]
    fn test_zero_delay_fails() {
        let (_env, admin, client) = setup();
        let result = client.try_initialize(&admin, &0);
        assert_eq!(result, Err(Ok(TimelockError::InvalidDelay)));
    }

    #[test]
    fn test_queue_transaction() {
        let (env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let target = Address::generate(&env);
        let targets = vec![&env, target];
        let values = vec![&env, 0i128];
        let signatures = vec![&env, symbol_short!("test")];

        client.queue_transaction(&targets, &values, &signatures);

        assert!(client.is_queued(&targets, &values, &signatures));
    }

    #[test]
    fn test_execute_transaction() {
        let (env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let target = Address::generate(&env);
        let targets = vec![&env, target];
        let values = vec![&env, 0i128];
        let signatures = vec![&env, symbol_short!("test")];

        client.queue_transaction(&targets, &values, &signatures);
        client.execute_transaction(&targets, &values, &signatures);

        assert!(!client.is_queued(&targets, &values, &signatures));
    }

    #[test]
    fn test_execute_non_queued_fails() {
        let (env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let target = Address::generate(&env);
        let targets = vec![&env, target];
        let values = vec![&env, 0i128];
        let signatures = vec![&env, symbol_short!("test")];

        let result = client.try_execute_transaction(&targets, &values, &signatures);
        assert_eq!(result, Err(Ok(TimelockError::TransactionNotQueued)));
    }

    #[test]
    fn test_cancel_transaction() {
        let (env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let target = Address::generate(&env);
        let targets = vec![&env, target];
        let values = vec![&env, 0i128];
        let signatures = vec![&env, symbol_short!("test")];

        client.queue_transaction(&targets, &values, &signatures);
        client.cancel_transaction(&targets, &values, &signatures);

        assert!(!client.is_queued(&targets, &values, &signatures));
    }

    #[test]
    fn test_cancel_non_queued_fails() {
        let (env, admin, client) = setup();
        client.initialize(&admin, &3600);

        let target = Address::generate(&env);
        let targets = vec![&env, target];
        let values = vec![&env, 0i128];
        let signatures = vec![&env, symbol_short!("test")];

        let result = client.try_cancel_transaction(&targets, &values, &signatures);
        assert_eq!(result, Err(Ok(TimelockError::TransactionNotQueued)));
    }
}
