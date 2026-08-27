---
id: gas-and-resources
title: Gas and Resource Management
description: Document resource usage fundamentals and optimization strategies in Soroban.
---

# Gas and Resource Management

In Soroban, smart contracts execute within resource budgets to ensure the network remains efficient and fair for all users. Managing gas and resources is a critical part of developing cost-effective and scalable smart contracts.

This guide outlines how to identify high-cost operations, strategies to optimize resource consumption, and practical methods for monitoring contract performance.

## Cost Drivers and Budget Constraints

Soroban defines specific budgets for computation (CPU instructions) and storage (ledger entries). Every operation your contract performs consumes a portion of these resources, known collectively as "gas."

### Computation Cost Drivers

- **Cryptographic Operations:** Hashing (e.g., SHA-256) and signature verification are computationally intensive.
- **Complex Loops:** Iterating over large datasets or performing complex math inside loops quickly depletes CPU budgets.
- **Cross-Contract Calls:** Calling other contracts requires additional overhead and environment setup.

### Storage Cost Drivers

- **State Growth:** Creating new ledger entries is the most expensive operation.
- **Large Values:** Storing large data structures, such as unoptimized maps or vectors, consumes more space and incurs higher fees.
- **Read/Write Operations:** Reading and writing to storage each have associated costs. Repeatedly reading the same value from storage instead of passing it in memory is a common source of inefficiency.

## Optimization Patterns

By applying specific design patterns, you can measurably reduce your contract's resource footprint.

### 1. Optimize Data Structures

**Concrete Example:** Use specific and fixed-size integers over larger ones where appropriate, and pack related data together.

_High-Cost (Unoptimized):_

```rust
pub struct UserData {
    pub is_active: bool,
    pub level: u32,
    pub score: u64,
}
// Using multiple storage keys for each field instead of storing the struct.
```

_Optimized:_

```rust
// Store the entire struct under a single storage key.
// Soroban handles serialization, and one write operation is significantly cheaper than three.
env.storage().persistent().set(&user_id, &UserData { ... });
```

### 2. Minimize Storage Interactions

Read from storage once, perform your logic in memory, and write back only when necessary.

**Concrete Example:**
Instead of updating a total counter in a loop, calculate the final total and update storage once.

_High-Cost:_

```rust
for amount in payouts {
    let mut current_total = env.storage().persistent().get(&TOTAL_KEY).unwrap_or(0);
    current_total += amount;
    env.storage().persistent().set(&TOTAL_KEY, &current_total);
}
```

_Optimized:_

```rust
let mut current_total = env.storage().persistent().get(&TOTAL_KEY).unwrap_or(0);
let mut added = 0;
for amount in payouts {
    added += amount;
}
env.storage().persistent().set(&TOTAL_KEY, &(current_total + added));
```

### 3. Hash Pre-computation

If your contract requires verifying data against a hash, consider computing the hash off-chain and passing it as an argument, rather than hashing raw data on-chain whenever possible and secure.

## Monitoring and Benchmarking

To ensure your contracts remain within budget and are cost-effective, continuous monitoring is necessary.

### Practical Recommendations

1. **Use Soroban CLI for Cost Estimation:**
   Before deploying, use the Soroban CLI's `invoke` command. It returns the exact CPU instructions and memory bytes consumed.

   ```bash
   soroban contract invoke --id <contract_id> --source <account> --network testnet -- --function my_func
   ```

   _Look for the `cost` output in the transaction result to identify if operations are nearing limits._

2. **Benchmarking in Tests:**
   The Soroban Rust SDK allows you to track resource usage in your tests. Use `env.budget()` to observe the costs of specific function calls during your unit tests.

   ```rust
   #[test]
   fn test_gas_usage() {
       let env = Env::default();
       let contract_id = env.register_contract(None, MyContract);
       let client = MyContractClient::new(&env, &contract_id);

       // Measure budget before
       let start_cpu = env.budget().cpu_instruction_cost();

       client.execute_complex_logic();

       // Measure budget after
       let end_cpu = env.budget().cpu_instruction_cost();
       println!("CPU Instructions used: {}", end_cpu - start_cpu);
   }
   ```

3. **Monitor the Network Limits:**
   Keep an eye on the Stellar network's global parameters. If network usage spikes, the cost per instruction or ledger byte can increase. Design your contracts to comfortably fit within baseline limits to avoid out-of-gas errors during high-traffic periods.

---

## Related links

- [Optimization Playbook](/docs/patterns/optimization-playbook) — systematic profiling and gas reduction
- [Storage Patterns](/docs/concepts/storage) — storage cost drivers
- [Building and Compilation](/docs/getting-started/building-and-compilation) — release builds and WASM size
