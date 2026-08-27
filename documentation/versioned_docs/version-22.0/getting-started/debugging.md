---
time: 25
title: Debugging Guide
description: Systematic debugging workflows and practical troubleshooting techniques for Soroban smart contract development
---

Learn systematic debugging techniques to quickly identify and resolve issues in your contract development. This guide covers the debugging workflow, common issues across different failure categories, and practical development tools.

## Systematic Debugging Workflow

A repeatable debugging process helps you systematically narrow down issues:

### 1. Reproduce the Issue

**Goal**: Consistently trigger the problem to understand its scope.

```bash
# Document the exact steps
# 1. Run the command that fails
cargo build --release

# 2. Note the environment
rustc --version
cargo --version
soroban --version

# 3. Check system state
which soroban
echo $PATH
echo $SOROBAN_RPC_URL
```

**Questions to ask**:

- Is the issue consistently reproducible?
- Does it happen on different machines?
- What was the last successful state?
- What changed since it worked?

### 2. Isolate the Problem

**Goal**: Narrow down the specific component causing the issue.

```bash
# Reduce scope systematically
# Start with a minimal example
soroban contract init test-minimal
cd test-minimal

# Try building the minimal contract
cargo build

# Add one component at a time
# - Add a function
# - Add storage operations
# - Add authorization checks
# See where it breaks
```

**Debugging techniques**:

- Comment out code sections to find the problematic area
- Test with simpler inputs
- Isolate individual contract functions
- Test in a fresh project directory
- Compare against working examples from the cookbook

### 3. Verify the Fix

**Goal**: Confirm your solution resolves the issue completely.

```bash
# Test the fix thoroughly
cargo test

# Clean and rebuild from scratch
cargo clean
cargo build --release

# Verify on a clean system/environment if possible
```

**Verification steps**:

- Run all relevant tests
- Check on a clean build
- Test on different machines/environments if possible
- Document the root cause and solution

---

## Common Issues by Category

### Setup Issues

#### Issue: `soroban: command not found`

**Problem**: Soroban CLI is not in your system PATH.

**Diagnosis**:

```bash
# Check if soroban is installed
which soroban

# Check Rust installation
rustup --version
cargo --version

# Check environment variables
echo $PATH
```

**Solutions**:

1. **Install Soroban CLI** (if not installed):

   ```bash
   # macOS/Linux
   curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
   source ~/.bashrc  # or ~/.zshrc for zsh

   # Windows (with WSL)
   curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | sh
   source ~/.bashrc
   ```

2. **Update PATH** (if already installed):

   ```bash
   # Linux/macOS - Add to ~/.bashrc or ~/.zshrc
   export PATH="$HOME/.local/bin:$PATH"
   source ~/.bashrc

   # Windows - Add C:\Users\<YOUR_USER>\.local\bin to System PATH
   # Control Panel > System > Environment Variables > Edit PATH
   ```

3. **Verify installation**:
   ```bash
   soroban --version
   soroban contract --help
   ```

#### Issue: `error: could not find Soroban Rust SDK`

**Problem**: Rust SDK is not properly installed or version mismatch.

**Diagnosis**:

```bash
# Check Rust toolchain
rustup show
cargo --version

# List installed Rust targets
rustup target list | grep installed

# Check SDK version in Cargo.toml
grep soroban-sdk Cargo.toml
```

**Solutions**:

1. **Install WebAssembly target**:

   ```bash
   # Add the wasm target for your Rust version
   rustup target add wasm32-unknown-unknown

   # Verify
   rustup target list | grep wasm
   ```

2. **Update SDK dependency**:

   ```bash
   # Update to latest SDK version
   cargo update soroban-sdk

   # Or specify a specific version in Cargo.toml
   soroban-sdk = "20.1"
   ```

3. **Check Rust version**:
   ```bash
   # Ensure you have a recent Rust version
   rustup update
   rustup override set stable
   ```

#### Issue: `error: linker 'cc' not found`

**Problem**: C compiler is missing (needed for dependencies).

**Solutions**:

**Linux**:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential

# Fedora/RHEL
sudo dnf install gcc

# Verify
gcc --version
```

**Windows**:

```bash
# Install Visual Studio Build Tools with C++ support
# Or use Windows Subsystem for Linux (WSL)
# See: setup-windows.md for detailed instructions
```

**macOS**:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify
clang --version
```

---

### Build Issues

#### Issue: `error[E0308]: mismatched types`

**Problem**: Type mismatch in your contract code.

**Example**:

```rust
// ❌ Error: expected i128, found u32
pub fn transfer(amount: i128) -> Result<(), Error> {
    let user_amount: u32 = 100;  // Type mismatch!
    validate_amount(user_amount)?;  // Takes i128
    Ok(())
}
```

**Diagnosis**:

```bash
# Get detailed error message
cargo build 2>&1 | head -50

# Check the specific type at line
cargo build --message-format=json | jq '.message'
```

**Solution**:

```rust
// ✅ Fix: Convert types explicitly
pub fn transfer(amount: i128) -> Result<(), Error> {
    let user_amount: i128 = 100;  // Match expected type
    validate_amount(user_amount)?;
    Ok(())
}

// Or use `as` for type conversion
let user_amount: u32 = 100;
validate_amount(user_amount as i128)?;
```

**Prevention**:

- Enable strict type checking in `Cargo.toml`:
  ```toml
  [profile.dev]
  overflow-checks = true
  ```
- Use `#![forbid(unsafe_code)]` for extra safety
- Run `cargo clippy` for linting suggestions

#### Issue: `error[E0382]: value used after being moved`

**Problem**: Moving a value and then trying to use it.

**Example**:

```rust
// ❌ Error: value moved here
let vec = vec![1, 2, 3];
consume_vector(vec);  // vec is moved
let len = vec.len();  // ❌ Can't use vec anymore
```

**Solution**:

```rust
// ✅ Solution 1: Borrow instead of move
let vec = vec![1, 2, 3];
consume_vector(&vec);  // Borrow with &
let len = vec.len();  // ✅ Can still use vec

// ✅ Solution 2: Clone if needed
let vec = vec![1, 2, 3];
consume_vector(vec.clone());
let len = vec.len();
```

#### Issue: `error: build failed with "could not compile 'contract'"`

**Problem**: Multiple compilation errors that are hard to parse.

**Diagnosis and solution**:

```bash
# Get cleaner error output
cargo build 2>&1 | grep "error\|help:" | head -20

# Check for common issues
cargo check  # Faster syntax check
cargo clippy  # Linting

# Full verbose output
RUST_BACKTRACE=1 cargo build -vv

# Check dependencies
cargo tree  # Shows dependency tree

# Update dependencies
cargo update
```

---

### Runtime Issues

#### Issue: `Contract invocation failed`

**Problem**: Contract executes but returns an error.

**Example**:

```bash
$ soroban contract invoke --id <ID> -- transfer --amount 100
error: ...
ContractError: InvalidAmount
```

**Diagnosis**:

1. **Check error handling**:

   ```rust
   // Add detailed error types
   #[derive(Clone, Debug, Eq, PartialEq)]
   pub enum Error {
       InvalidAmount = 1,
       InsufficientBalance = 2,
       Unauthorized = 3,
   }
   ```

2. **Add logging to understand the issue**:

   ```rust
   pub fn transfer(env: Env, amount: i128) -> Result<(), Error> {
       // Validate inputs
       if amount <= 0 {
           return Err(Error::InvalidAmount);
       }

       // Get current balance
       let balance = get_balance(&env)?;

       if amount > balance {
           return Err(Error::InsufficientBalance);
       }

       Ok(())
   }
   ```

3. **Test in isolation**:
   ```rust
   #[test]
   fn test_transfer_with_invalid_amount() {
       let env = Env::default();
       let contract = /* setup contract */;

       let result = contract.try_transfer(-100);  // Negative amount
       assert_eq!(result, Err(Ok(Error::InvalidAmount)));
   }
   ```

**Solution**:

- Review contract logic for the failure condition
- Add specific error handling for each case
- Test with valid inputs first
- Check contract state (storage, authorization)

#### Issue: `Authorization failed`

**Problem**: Contract call rejected due to authorization checks.

**Common causes**:

```rust
// Missing authorization signature
// Wrong signer
// Insufficient permissions
// Incorrect auth context
```

**Diagnosis and solution**:

```bash
# Check transaction signatures
soroban contract invoke \
  --id <ID> \
  --signers <PUBLIC_KEY> \
  -- function args

# Test with mock auth (for testing only)
```

**Code example**:

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    // Require authorization from the 'from' address
    from.require_auth();

    // Proceed with transfer
    // ...
    Ok(())
}

// In tests
#[test]
fn test_authorized_transfer() {
    let env = Env::default();
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    env.mock_all_auths();  // Mock all auth for testing

    let contract = /* setup */;
    let result = contract.try_transfer(&from, &to, &100);

    assert!(result.is_ok());
}
```

#### Issue: `Storage operation failed`

**Problem**: Contract can't read/write to storage.

**Common causes**:

```
- Storage not initialized
- Wrong storage key type
- Accessing non-existent keys without fallback
- Contract isolation issues
```

**Example**:

```rust
// ❌ Panic if key doesn't exist
let balance = env.storage().get(&user_key).unwrap();

// ✅ Safe default value
let balance = env.storage()
    .get(&user_key)
    .unwrap_or(0);
```

**Debugging**:

```rust
// Add diagnostic logging
pub fn get_balance(env: &Env, user: &Address) -> Result<i128, Error> {
    let key = user;

    match env.storage().get(key) {
        Some(balance) => {
            // Key exists
            Ok(balance)
        }
        None => {
            // Key doesn't exist, use default
            Ok(0)
        }
    }
}

// Test storage operations
#[test]
fn test_storage_operations() {
    let env = Env::default();
    let key = Symbol::new(&env, "balance");

    // Initially empty
    assert_eq!(env.storage().get(&key), None);

    // Set value
    env.storage().set(&key, &100_i128);

    // Now it exists
    assert_eq!(env.storage().get(&key), Some(100));
}
```

---

### Testing Issues

#### Issue: Tests fail with `thread panicked`

**Problem**: Unexpected panic in test, not a clear assertion failure.

**Diagnosis**:

```bash
# Run with backtrace for more details
RUST_BACKTRACE=1 cargo test

# Run specific test with output
cargo test test_name -- --nocapture

# Get panic message
cargo test 2>&1 | grep "panicked\|thread\|message"
```

**Solution**:

```rust
// ❌ Bad: Can panic
let balance = env.storage().get(&key).unwrap();

// ✅ Good: Handle None case
let balance = env.storage()
    .get(&key)
    .unwrap_or(0);

// ✅ Better: Use Result
fn get_balance(key: &Symbol) -> Result<i128, Error> {
    env.storage()
        .get(key)
        .ok_or(Error::NotFound)
}
```

#### Issue: `Assertion failed: expected X, found Y`

**Problem**: Test assertion doesn't match expected value.

**Example**:

```rust
// ❌ Assertion failed
#[test]
fn test_transfer() {
    let env = Env::default();
    // ... setup ...

    contract.transfer(&amount);
    assert_eq!(get_balance(&env), 100);  // Expected 100, got 50
}
```

**Diagnosis and solution**:

```rust
// ✅ Add debugging output
#[test]
fn test_transfer() {
    let env = Env::default();
    // ... setup ...

    let initial = get_balance(&env);
    println!("Initial balance: {}", initial);

    contract.transfer(&amount);

    let final_balance = get_balance(&env);
    println!("Final balance: {}", final_balance);

    // Use more descriptive assertions
    assert_eq!(
        final_balance,
        initial - amount,
        "Balance should decrease by transfer amount"
    );
}
```

---

## Development Tools & Debugging Techniques

### Essential Tools

#### 1. Cargo Tooling

```bash
# Check syntax and dependencies (fast)
cargo check

# Run linter and get suggestions
cargo clippy

# Format code
cargo fmt

# Generate documentation
cargo doc --open

# Analyze build times
cargo build --timings

# Check for security vulnerabilities
cargo audit
```

#### 2. Testing Tools

```bash
# Run all tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_transfer -- --nocapture

# Run tests in single-threaded mode (helpful for debugging)
cargo test -- --test-threads=1 --nocapture

# Show test output even for passing tests
cargo test -- --nocapture --test-threads=1
```

#### 3. Soroban CLI Debugging

```bash
# Get verbose output
soroban contract invoke \
  --id <ID> \
  --source <KEY> \
  --verbose \
  -- function args

# Test with local network
soroban network add --rpc-url http://localhost:8000

# Inspect contract state
soroban contract inspect --id <ID>
```

### Debugging Strategies

#### Strategy 1: Progressive Simplification

```rust
// Start complex
#[test]
fn test_complex_flow() {
    // Multiple operations, hard to debug if it fails
}

// Break into smaller tests
#[test]
fn test_initialization() {
    // Just initialization
}

#[test]
fn test_basic_operation() {
    // One operation
}

#[test]
fn test_error_handling() {
    // Error case
}

// This makes it clear which part fails
```

#### Strategy 2: Assertion-Driven Debugging

```rust
#[test]
fn test_contract_state() {
    let env = Env::default();

    // Assert state at each step
    assert_eq!(get_balance(&env), 0, "Initial balance should be 0");

    contract.deposit(100);
    assert_eq!(get_balance(&env), 100, "After deposit, balance should be 100");

    contract.withdraw(30);
    assert_eq!(get_balance(&env), 70, "After withdraw, balance should be 70");
}
```

#### Strategy 3: Type-Driven Debugging

```rust
// Use the type system to catch errors at compile time
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
    // Compiler enforces proper error handling with Result type
    let balance = get_balance(&env, &from)?;  // Auto-propagate errors
    validate_amount(amount)?;  // Type safe
    Ok(())
}

// This catches many issues before runtime
```

---

## Troubleshooting Quick Reference

| Issue                        | Quick Check                         | Common Fix                                    |
| ---------------------------- | ----------------------------------- | --------------------------------------------- |
| `soroban: command not found` | `which soroban`                     | Update PATH or reinstall                      |
| `linker 'cc' not found`      | `gcc --version`                     | Install build tools (`build-essential`, etc.) |
| Type mismatch                | Check variable types at assignment  | Convert types with `as` or change type        |
| Value moved                  | Look for missing `&` (borrow)       | Add `&` or `.clone()`                         |
| Test panics                  | Run with `RUST_BACKTRACE=1`         | Replace `.unwrap()` with `.unwrap_or()`       |
| Auth failed                  | Check signer address                | Add `env.mock_all_auths()` in tests           |
| Storage error                | Check if key is initialized         | Use `.unwrap_or()` for default values         |
| Build hangs                  | Check for infinite loops or network | `Ctrl+C` and check `Cargo.lock`               |

---

## Tips & Best Practices

### ✅ Best Practices

1. **Use type-safe error handling**:

   ```rust
   // Good: Result-based
   fn operation() -> Result<T, Error> {
       do_thing()?;
       Ok(value)
   }
   ```

2. **Validate early, fail fast**:

   ```rust
   pub fn transfer(amount: i128) -> Result<(), Error> {
       // Validate first, before state changes
       if amount <= 0 {
           return Err(Error::InvalidAmount);
       }
       // Then proceed
       Ok(())
   }
   ```

3. **Test error paths systematically**:

   ```rust
   #[test]
   fn test_all_error_conditions() {
       assert!(test_invalid_input().is_err());
       assert!(test_insufficient_balance().is_err());
       assert!(test_unauthorized().is_err());
   }
   ```

4. **Use descriptive error types**:
   ```rust
   pub enum Error {
       InsufficientBalance = 1,  // Clear what failed
       InvalidAmount = 2,
       Unauthorized = 3,
   }
   ```

### 📋 Debugging Checklist

Before asking for help, verify:

- [ ] Problem is reproducible consistently
- [ ] You've tested with a minimal example
- [ ] Error message has been fully read
- [ ] Relevant `Cargo.toml` versions are checked
- [ ] Environment variables are set correctly
- [ ] All dependencies are up to date: `cargo update`
- [ ] Clean build succeeds: `cargo clean && cargo build`
- [ ] Type mismatches have been reviewed
- [ ] Error paths are tested
- [ ] Code follows examples in the Cookbook

### 🔗 Related Resources

- [Error Handling in Soroban](../concepts/error-handling.md) - Detailed error patterns
- [Testing Error Scenarios](./testing-errors.md) - Comprehensive error testing
- [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts) - Official docs
- [Rust Book](https://doc.rust-lang.org/book/) - Rust fundamentals

---

## Getting Help

If you're stuck after following this guide:

1. **Check the error message carefully** - It usually points to the issue
2. **Review the related documentation** - Links above
3. **Search the Soroban community** - Discord, GitHub Issues
4. **Create a minimal reproduction** - Simplify your contract to the failing component
5. **Ask with context** - Include error message, code, Rust/Soroban versions
