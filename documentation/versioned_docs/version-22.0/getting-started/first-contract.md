---
time: 15
sidebar_position: 3
title: Your First Contract
description: Create, build, and test your first Soroban smart contract from scratch — a beginner-friendly introduction to contract development.
---

# Your First Contract

title: Your First Contract
description: Learn how to create, build, and test your first Soroban smart contract.
sidebar_position: 4
---

Learn how to create, build, and test your first Soroban smart contract.

## Creating a New Project

Create a new Soroban contract project:

```bash
soroban contract init my-first-contract
cd my-first-contract
```

This creates a new project with:

- `Cargo.toml` - Project configuration
- `src/lib.rs` - Contract source code
- `Cargo.lock` - Dependency lock file

## Understanding the Code

Open `src/lib.rs` to see the basic contract structure:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}
```

## Building Your Contract

Build the contract to WebAssembly:

```bash
soroban contract build
```

This creates a `.wasm` file in `target/wasm32-unknown-unknown/release/`

## Testing Your Contract

Soroban contracts use standard Rust testing:

```rust
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_hello() {
        let env = Env::default();
        let contract_id = env.register_contract(None, HelloContract);
        let client = HelloContractClient::new(&env, &contract_id);

        let result = client.hello(&symbol_short!("World"));
        assert_eq!(result, symbol_short!("Hello"));
    }
}
```

Run tests:

```bash
cargo test
```

## Next Steps

- [Contract Testing Guide](./contract-testing) - Learn how to write and run tests
- [Deploy to testnet](./deploy-testnet)
- [Learn about storage](../concepts/storage)
- [Explore patterns](../patterns/overview)

- [Building and Compilation](/docs/getting-started/building-and-compilation) — compile your contract to WASM
- [Deploy to testnet](/docs/getting-started/deploy-testnet)
- [Learn about storage](/docs/concepts/storage)
- [Explore patterns](/docs/patterns/overview)

## Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Smart Contract Examples](https://github.com/stellar/soroban-examples)
