---
time: 20
sidebar_position: 7
title: Deploy to Testnet
description: Deploy Soroban smart contracts to Stellar testnet for validation, testing, and live environment verification before mainnet deployment.
---

# Deploy to Testnet

Deploy your Soroban contract to the Stellar testnet for validation in a live network environment. This guide covers the complete workflow from contract artifact build to verification.

## Prerequisites

Before deploying, ensure you have:

- **Stellar CLI** - Installed (`stellar --version`)
- **Built WASM artifact** - From `stellar contract build`
- **Testnet account** - With testnet XLM for transaction fees
- **Network access** - To Stellar testnet RPC

---

## Step 1: Prepare Your Contract

### Build Your Contract

First, build your contract into an optimized WebAssembly artifact:

```bash
cd my-first-contract
stellar contract build
```

Expected output:

```
Compiling my-first-contract v0.1.0
Finished release [optimized] target(s) in 2.34s
```

The compiled WASM file is located at:

```
target/wasm32-unknown-unknown/release/my_first_contract.wasm
```

### Verify the Build

Check that the WASM file was created:

```bash
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

Expected output:

```
-rw-r--r-- 1 user group 123K Mar 23 10:30 target/wasm32-unknown-unknown/release/my_first_contract.wasm
```

---

## Step 2: Set Up Your Testnet Account

### Create a Testnet Account

If you don't have a testnet account, create one using Stellar CLI:

```bash
stellar keys generate --global my-testnet-account
```

This generates a new keypair and stores it securely in your local configuration.

To view the public address:

```bash
stellar keys address my-testnet-account
```

Expected output:

```
GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Fund Your Account

You can fund your testnet account directly using the Stellar CLI:

```bash
stellar keys fund my-testnet-account --network testnet
```

Alternatively, use the Stellar Friendbot via `curl`:

```bash
curl "https://friendbot.stellar.org?addr=$(stellar keys address my-testnet-account)"
```

---

## Step 3: Configure Network for Testnet

### Verify Network Configuration

Check that testnet is properly configured:

```bash
stellar network ls
```

Expected output:

```
testnet
  RPC URL: https://soroban-testnet.stellar.org
  Network Passphrase: Test SDF Network ; September 2015
```

If testnet is not listed, add it:

```bash
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

---

## Step 4: Deploy Your Contract

### Deploy the Contract

Deploy your contract to testnet:

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet
```

Expected output:

```
Contract deployed successfully.
Contract ID: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

**Save your Contract ID** — you'll need it for all interactions with this contract.

This ID isn't random — it's deterministically derived from your source account and an internal deploy salt, which is why redeploying with the same account and salt on the same network always reproduces the same address. See [Contract IDs & Deploy Salt](/docs/concepts/contract-ids) if you need to predict a contract's address before deploying it (for example, to add it to an allowlist in advance).

### Store Contract ID for Later Use

Save the contract ID to an environment variable for convenience:

```bash
export CONTRACT_ID="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
```

Or save it to a file:

```bash
echo "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" > contract-id.txt
```

---

## Step 5: Verify Deployment

### Check Contract Exists

Verify that your contract was deployed successfully:

```bash
stellar contract info --id $CONTRACT_ID --network testnet
```

### Inspect Contract Metadata

Get detailed interface metadata about your contract:

```bash
stellar contract inspect --id $CONTRACT_ID --network testnet
```

This shows:
- Contract specification
- Available functions and parameter names
- Authorization requirements

Example output:

```
Contract: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4

Functions:
  hello(to: Symbol) -> Symbol
```

---

## Step 6: Interact with Your Contract

### Invoke a Read-Only Function

Call a read-only function to verify contract execution:

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- hello --to World
```

Expected output:

```
"Hello"
```

### Invoke a State-Modifying Function

If your contract has functions that modify state, invoke them:

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- increment
```

Expected output:

```
1
```

### Verify State Changes

Call the read function again to verify state persisted:

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- get_count
```

Expected output:

```
1
```

---

## Complete Deployment Workflow Example

Here is a complete, copy-pasteable script from start to finish:

```bash
# 1. Build contract
cd my-first-contract
stellar contract build

# 2. Create and fund account
stellar keys generate --global my-testnet-account
stellar keys fund my-testnet-account --network testnet

# 3. Configure network (if not already present)
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 4. Deploy contract
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet)

echo "Contract deployed: $CONTRACT_ID"

# 5. Verify deployment
stellar contract info --id $CONTRACT_ID --network testnet

# 6. Invoke contract
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- hello --to World
```

---

## Verification Checklist

Use this checklist to confirm your deployment is complete and working:

- [ ] Contract built successfully: `stellar contract build` completed without errors
- [ ] WASM file exists: `ls target/wasm32-unknown-unknown/release/*.wasm` shows file
- [ ] Testnet account created: `stellar keys ls` shows your account
- [ ] Account funded: `stellar keys fund my-testnet-account --network testnet` succeeds
- [ ] Network configured: `stellar network ls` shows testnet
- [ ] Contract deployed: `stellar contract deploy` returned a Contract ID
- [ ] Deployment verified: `stellar contract info --id $CONTRACT_ID --network testnet` succeeds
- [ ] Contract callable: `stellar contract invoke` returns expected output
- [ ] State persists: Multiple invocations show consistent state changes

---

## Troubleshooting

### Build Errors

**Problem:** `error: could not compile 'my-first-contract'`

**Solution:**

```bash
# Update Soroban SDK to latest version
cargo update

# Check Rust version
rustc --version

# Ensure WebAssembly target is installed
rustup target add wasm32-unknown-unknown

# Clean and rebuild
cargo clean
stellar contract build
```

### Account Not Funded

**Problem:** `Error: Account not found` or `Error: Insufficient balance`

**Solution:**

```bash
# Fund using Stellar CLI
stellar keys fund my-testnet-account --network testnet

# Or via Friendbot curl
curl "https://friendbot.stellar.org?addr=$(stellar keys address my-testnet-account)"
```

### Network Configuration Issues

**Problem:** `Error: Network 'testnet' not found`

**Solution:**

```bash
# Add testnet network
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Verify it was added
stellar network ls
```

### Deployment Fails with "Invalid WASM"

**Problem:** `Error: Invalid WASM binary`

**Solution:**

```bash
# Ensure you're using the correct WASM file
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Rebuild the contract
cargo clean
stellar contract build

# Verify the file size is reasonable (typically 10KB-200KB)
```

### Contract Deployment Timeout

**Problem:** `Error: Request timeout` or `Error: Network error`

**Solution:**

```bash
# Check network connectivity
ping -c 3 soroban-testnet.stellar.org

# Try again
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet

# Check Stellar network status: https://status.stellar.org
```

### Contract Invocation Authorization Error

**Problem:** `Error: Authorization failed` or `Error: Unauthorized`

**Solution:**

```bash
# Verify you're using the correct source account
stellar keys address my-testnet-account

# Re-fund if account ran out of transaction fees
stellar keys fund my-testnet-account --network testnet
```

### Contract Not Found After Deployment

**Problem:** `Error: Contract not found` when trying to invoke

**Solution:**

```bash
# Verify the contract ID is correct
echo $CONTRACT_ID

# Check that the contract exists on testnet
stellar contract info --id $CONTRACT_ID --network testnet

# Check the deployment on Stellar Expert:
# https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID
```

---

## Common Deployment Patterns

### Deploying Multiple Contracts

```bash
# Deploy first contract
CONTRACT_1=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract1.wasm \
  --source my-testnet-account \
  --network testnet)

# Deploy second contract
CONTRACT_2=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract2.wasm \
  --source my-testnet-account \
  --network testnet)

# Save both IDs
echo "Contract 1: $CONTRACT_1" > contract-ids.txt
echo "Contract 2: $CONTRACT_2" >> contract-ids.txt
```

### Deploying with Custom Initialization

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- initialize --admin $(stellar keys address my-testnet-account)
```

---

## Using the Faucet Example

If you need test tokens for your dApp during development, deploy the
**faucet** example contract. It distributes tokens on testnet with built-in
rate limiting (per-address cooldown) and a global distribution cap.

```bash
# Build the faucet
cargo build --manifest-path examples/faucet/Cargo.toml --target wasm32-unknown-unknown --release

# Deploy
FAUCET_ID=$(soroban contract deploy \
  --wasm examples/target/wasm32-unknown-unknown/release/faucet.wasm \
  --source my-testnet-account \
  --network testnet)

# Initialise: 100 tokens per claim, 100-ledger cooldown, 1 M token cap
soroban contract invoke \
  --id $FAUCET_ID \
  --source my-testnet-account \
  --network testnet \
  -- init \
  --admin my-testnet-account \
  --drip_amount 100 \
  --cooldown_ledgers 100 \
  --max_total_claims 1000000
```

> **Note:** The faucet is testnet-only. It distributes informational tokens to
> help developers experiment -- it does not transfer real value.

See the full [faucet example](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/faucet) for source code and additional usage details.

## Next Steps

Now that your contract is deployed:

1. **Test thoroughly** — Invoke all contract functions and verify behavior
2. **Understand the transaction** — [Transaction Anatomy: Invoking a Contract](./invoke-host-function) — see the XDR and op structure the CLI builds for you
3. **Monitor events** — Check contract events and logs
4. **Prepare for mainnet** — [Deploy to Mainnet](/docs/getting-started/deploy-mainnet) when validation is complete
5. **Learn more** — Explore [Core Concepts](/docs/concepts/overview) and [Patterns](/docs/patterns/overview)
2. **Monitor events** — Check contract events and logs with `stellar events --id $CONTRACT_ID --network testnet`
3. **Prepare for mainnet** — [Deploy to Mainnet](/docs/getting-started/deploy-mainnet) when validation is complete
4. **Learn more** — Explore [Core Concepts](/docs/concepts/overview) and [Patterns](/docs/patterns/overview)

## Additional Resources

- [Stellar CLI Documentation](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- [Stellar CLI Migration Guide](/docs/getting-started/stellar-cli-migration)
- [Stellar Testnet Guide](https://developers.stellar.org/docs/fundamentals-and-concepts/testnet-public-network)
- [Soroban SDK Reference](https://docs.rs/soroban-sdk)
- [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Stellar Discord Community](https://discord.gg/stellardev)
