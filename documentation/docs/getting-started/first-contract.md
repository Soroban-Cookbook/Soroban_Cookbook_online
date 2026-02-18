# Your First Contract

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

- [Deploy to testnet](./deploy-testnet.md)
- [Learn about storage](../concepts/storage.md)
- [Explore patterns](../patterns/overview.md)

## Resources

- [Soroban SDK Documentation](https://docs.rs/soroban-sdk)
- [Smart Contract Examples](https://github.com/stellar/soroban-examples)
