#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Vec};

// ─── Types ────────────────────────────────────────────────────────────────────

/// Upper bound on operations per batch. Without a limit, a single call could
/// grow unboundedly and exceed the ledger's per-transaction resource budget —
/// this guard keeps worst-case cost predictable regardless of caller input.
pub const MAX_BATCH_SIZE: u32 = 20;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
}

/// A single transfer to include in a batch.
#[contracttype]
#[derive(Clone)]
pub struct TransferOp {
    pub to: Address,
    pub amount: i128,
}

/// Per-operation outcome, returned in the same order as the input batch.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OpResult {
    Ok,
    /// The sender's remaining balance (after earlier operations in this same
    /// batch) could not cover this operation, or the amount was non-positive.
    InsufficientBalance,
}

// ─── Errors ───────────────────────────────────────────────────────────────────

/// Errors returned for the batch as a whole, before any operation runs.
/// A batch-level error means nothing in the batch was applied.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    EmptyBatch = 1,
    BatchTooLarge = 2,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct BatchOps;

#[contractimpl]
impl BatchOps {
    /// Deploy-time setup: credits `holder` with `initial_balance`.
    pub fn __constructor(env: Env, holder: Address, initial_balance: i128) {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(holder), &initial_balance);
    }

    pub fn balance_of(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(account))
            .unwrap_or(0)
    }

    /// Executes up to `MAX_BATCH_SIZE` transfers from `from` in a single call.
    ///
    /// The efficiency win over calling `transfer` once per recipient: `from`
    /// authorizes the whole batch a single time, instead of once per
    /// operation, and the sender's balance is read once and written back
    /// once rather than round-tripping storage on every transfer.
    ///
    /// Batch-level guards run first and, if they fail, nothing in the batch
    /// is applied: the batch must be non-empty and within `MAX_BATCH_SIZE`.
    /// Past that point, each operation is evaluated independently against
    /// the sender's running balance. An operation that would overdraw is
    /// recorded as `OpResult::InsufficientBalance` and skipped — it does
    /// NOT abort the remaining operations or roll back ones already applied.
    /// This partial-failure behavior is a deliberate trade-off: it favors
    /// making progress on the operations that are valid over all-or-nothing
    /// atomicity. Callers that need atomicity should inspect the returned
    /// `Vec<OpResult>` and revert at the application layer if any entry is
    /// not `OpResult::Ok`.
    pub fn batch_transfer(
        env: Env,
        from: Address,
        ops: Vec<TransferOp>,
    ) -> Result<Vec<OpResult>, Error> {
        from.require_auth();

        if ops.is_empty() {
            return Err(Error::EmptyBatch);
        }
        if ops.len() > MAX_BATCH_SIZE {
            return Err(Error::BatchTooLarge);
        }

        let mut sender_balance = Self::balance_of(env.clone(), from.clone());
        let mut results = Vec::new(&env);

        for op in ops.iter() {
            if op.amount <= 0 || sender_balance < op.amount {
                results.push_back(OpResult::InsufficientBalance);
                continue;
            }

            sender_balance -= op.amount;
            let recipient_balance = Self::balance_of(env.clone(), op.to.clone());
            env.storage().persistent().set(
                &DataKey::Balance(op.to.clone()),
                &(recipient_balance + op.amount),
            );
            results.push_back(OpResult::Ok);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from), &sender_balance);

        Ok(results)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::vec;

    fn setup(initial_balance: i128) -> (Env, Address, BatchOpsClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let sender = Address::generate(&env);
        let contract_id = env.register(BatchOps, (&sender, initial_balance));
        let client = BatchOpsClient::new(&env, &contract_id);
        (env, sender, client)
    }

    #[test]
    fn test_constructor_credits_holder() {
        let (_, sender, client) = setup(1_000);
        assert_eq!(client.balance_of(&sender), 1_000);
    }

    #[test]
    fn test_batch_transfer_applies_every_operation_when_all_succeed() {
        let (env, sender, client) = setup(1_000);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);

        let ops = vec![
            &env,
            TransferOp {
                to: bob.clone(),
                amount: 100,
            },
            TransferOp {
                to: carol.clone(),
                amount: 250,
            },
        ];

        let results = client.batch_transfer(&sender, &ops);

        assert_eq!(results, vec![&env, OpResult::Ok, OpResult::Ok]);
        assert_eq!(client.balance_of(&sender), 650);
        assert_eq!(client.balance_of(&bob), 100);
        assert_eq!(client.balance_of(&carol), 250);
    }

    #[test]
    fn test_batch_transfer_partial_failure_skips_only_the_overdrawing_operation() {
        let (env, sender, client) = setup(300);
        let bob = Address::generate(&env);
        let carol = Address::generate(&env);
        let dave = Address::generate(&env);

        // 200 to bob succeeds (100 left), 150 to carol would overdraw and is
        // skipped, 100 to dave succeeds against the still-available balance.
        let ops = vec![
            &env,
            TransferOp {
                to: bob.clone(),
                amount: 200,
            },
            TransferOp {
                to: carol.clone(),
                amount: 150,
            },
            TransferOp {
                to: dave.clone(),
                amount: 100,
            },
        ];

        let results = client.batch_transfer(&sender, &ops);

        assert_eq!(
            results,
            vec![
                &env,
                OpResult::Ok,
                OpResult::InsufficientBalance,
                OpResult::Ok,
            ]
        );
        assert_eq!(client.balance_of(&sender), 0);
        assert_eq!(client.balance_of(&bob), 200);
        assert_eq!(client.balance_of(&carol), 0);
        assert_eq!(client.balance_of(&dave), 100);
    }

    #[test]
    fn test_batch_transfer_rejects_non_positive_amount_as_insufficient() {
        let (env, sender, client) = setup(1_000);
        let bob = Address::generate(&env);

        let ops = vec![
            &env,
            TransferOp {
                to: bob.clone(),
                amount: 0,
            },
        ];

        let results = client.batch_transfer(&sender, &ops);

        assert_eq!(results, vec![&env, OpResult::InsufficientBalance]);
        assert_eq!(client.balance_of(&sender), 1_000);
        assert_eq!(client.balance_of(&bob), 0);
    }

    #[test]
    fn test_batch_transfer_rejects_empty_batch() {
        let (env, sender, client) = setup(1_000);
        let ops: Vec<TransferOp> = vec![&env];

        let result = client.try_batch_transfer(&sender, &ops);

        assert_eq!(result, Err(Ok(Error::EmptyBatch)));
        assert_eq!(client.balance_of(&sender), 1_000);
    }

    #[test]
    fn test_batch_transfer_rejects_batch_over_the_limit() {
        let (env, sender, client) = setup(1_000_000);
        let mut ops = Vec::new(&env);
        for _ in 0..=MAX_BATCH_SIZE {
            ops.push_back(TransferOp {
                to: Address::generate(&env),
                amount: 1,
            });
        }
        assert_eq!(ops.len(), MAX_BATCH_SIZE + 1);

        let result = client.try_batch_transfer(&sender, &ops);

        // Batch-level rejection: nothing in the oversized batch was applied.
        assert_eq!(result, Err(Ok(Error::BatchTooLarge)));
        assert_eq!(client.balance_of(&sender), 1_000_000);
    }

    #[test]
    fn test_batch_transfer_accepts_batch_at_exactly_the_limit() {
        let (env, sender, client) = setup(1_000_000);
        let mut ops = Vec::new(&env);
        for _ in 0..MAX_BATCH_SIZE {
            ops.push_back(TransferOp {
                to: Address::generate(&env),
                amount: 1,
            });
        }

        let results = client.batch_transfer(&sender, &ops);

        assert_eq!(results.len(), MAX_BATCH_SIZE);
        for result in results.iter() {
            assert_eq!(result, OpResult::Ok);
        }
        assert_eq!(
            client.balance_of(&sender),
            1_000_000 - MAX_BATCH_SIZE as i128
        );
    }

    #[test]
    #[should_panic]
    fn test_batch_transfer_requires_sender_auth() {
        // Without mock_all_auths, an unauthorized caller must fail.
        let env = Env::default();
        let sender = Address::generate(&env);
        let contract_id = env.register(BatchOps, (&sender, 1_000_i128));
        let client = BatchOpsClient::new(&env, &contract_id);
        let bob = Address::generate(&env);

        let ops = vec![
            &env,
            TransferOp {
                to: bob,
                amount: 100,
            },
        ];

        client.batch_transfer(&sender, &ops);
    }
}
