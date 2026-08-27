---
time: 20
sidebar_position: 7
title: Deploy to Testnet
description: Deploy Soroban contracts to Stellar testnet for validation, testing, and live environment verification before mainnet deployment.
---

# Deploy to Testnet

title: Deploy to Testnet
description: Deploy your Soroban contract to Stellar testnet for validation in a live network environment.
sidebar_position: 5
---

Deploy your Soroban contract to Stellar testnet for validation in a live network environment. This guide covers the complete workflow from contract artifact to verification.

## Prerequisites

Before deploying, ensure you have:

- **Soroban CLI** - Installed and up to date
- **Built WASM artifact** - From `soroban contract build`
- **Testnet account** - With XLM for transaction fees
- **Network access** - To Stellar testnet

## Step 1: Prepare Your Contract

### Build Your Contract

First, build your contract to a WebAssembly artifact:

```bash
cd my-first-contract
soroban contract build
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

## Step 2: Set Up Your Testnet Account

### Create a Testnet Account

If you don't have a testnet account, create one using Soroban CLI:

```bash
soroban keys generate --global my-testnet-account
```

This generates a new keypair and stores it locally. Expected output:

```
Created keypair "my-testnet-account" with public key: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Fund Your Account

Use the Stellar Friendbot to fund your testnet account:

```bash
curl "https://friendbot.stellar.org?addr=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

Replace the address with your public key from the previous step.

Expected response:

```json
{
  "hash": "...",
  "ledger": 12345678,
  "envelope_xdr": "...",
  "result_xdr": "..."
}
```

### Verify Account Funding

Check your account balance:

```bash
soroban account balance --account my-testnet-account --network testnet
```

Expected output:

```
10000.0000000 XLM
```

## Step 3: Configure Soroban CLI for Testnet

### Set Your Identity

Configure your Soroban CLI to use your testnet account:

```bash
soroban config identity fund my-testnet-account --network testnet
```

Or set it as the default identity:

```bash
soroban config identity set-default my-testnet-account
```

### Verify Network Configuration

Check that testnet is properly configured:

```bash
soroban network ls
```

Expected output:

```
testnet
  RPC URL: https://soroban-testnet.stellar.org
  Network Passphrase: Test SDF Network ; September 2015
```

If testnet is not listed, add it:

```bash
soroban network add --name testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

## Step 4: Deploy Your Contract

### Deploy the Contract

Deploy your contract to testnet:

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet
```

Expected output:

```
Contract deployed successfully.
Contract ID: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

**Save your Contract ID** - You'll need it for all future interactions with this contract.

### Store Contract ID for Later Use

Save the contract ID to an environment variable for convenience:

```bash
export CONTRACT_ID="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
```

Or save it to a file:

```bash
echo "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4" > contract-id.txt
```

## Step 5: Verify Deployment

### Check Contract Exists

Verify that your contract was deployed successfully:

```bash
soroban contract info --id $CONTRACT_ID --network testnet
```

Expected output:

```
Contract ID: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
Ledger: 12345678
```

### Inspect Contract Metadata

Get detailed information about your contract:

```bash
soroban contract inspect --id $CONTRACT_ID --network testnet
```

This shows:

- Contract specification
- Available functions
- Function parameters and return types
- Authorization requirements

Example output:

```
Contract: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4

Functions:
  hello(to: Symbol) -> Symbol
```

## Step 6: Interact with Your Contract

### Invoke a Read-Only Function

Call a read-only function to verify the contract works:

```bash
soroban contract invoke \
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
soroban contract invoke \
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

Call the function again to verify state persisted:

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- get_count
```

Expected output:

```
1
```

## Complete Deployment Workflow Example

Here's a complete example from start to finish:

```bash
# 1. Build contract
cd my-first-contract
soroban contract build

# 2. Create and fund account
soroban keys generate --global my-testnet-account
curl "https://friendbot.stellar.org?addr=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# 3. Configure network
soroban network add --name testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 4. Deploy contract
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet)

echo "Contract deployed: $CONTRACT_ID"

# 5. Verify deployment
soroban contract info --id $CONTRACT_ID --network testnet

# 6. Invoke contract
soroban contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- hello --to World
```

## Verification Checklist

Use this checklist to confirm your deployment is complete and working:

- [ ] Contract built successfully: `soroban contract build` completed without errors
- [ ] WASM file exists: `ls target/wasm32-unknown-unknown/release/*.wasm` shows file
- [ ] Testnet account created: `soroban keys list` shows your account
- [ ] Account funded: `soroban account balance --account my-testnet-account --network testnet` shows XLM balance
- [ ] Network configured: `soroban network ls` shows testnet
- [ ] Contract deployed: `soroban contract deploy` returned a Contract ID
- [ ] Deployment verified: `soroban contract info --id $CONTRACT_ID --network testnet` succeeds
- [ ] Contract callable: `soroban contract invoke` returns expected output
- [ ] State persists: Multiple invocations show consistent state changes

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
soroban contract build
```

### Account Not Funded

**Problem:** `Error: Account not found` or `Error: Insufficient balance`

**Solution:**

```bash
# Verify your public key
soroban keys show my-testnet-account

# Fund using Friendbot (replace with your public key)
curl "https://friendbot.stellar.org?addr=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Wait a few seconds and check balance
sleep 5
soroban account balance --account my-testnet-account --network testnet
```

### Network Configuration Issues

**Problem:** `Error: Network 'testnet' not found`

**Solution:**

```bash
# Add testnet network
soroban network add --name testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Verify it was added
soroban network ls
```

### Deployment Fails with "Invalid WASM"

**Problem:** `Error: Invalid WASM binary`

**Solution:**

```bash
# Ensure you're using the correct WASM file
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Rebuild the contract
cargo clean
soroban contract build

# Verify the file size is reasonable (typically 50KB-500KB)
# If too small, the build may have failed silently
```

### Contract Deployment Timeout

**Problem:** `Error: Request timeout` or `Error: Network error`

**Solution:**

```bash
# Check network connectivity
ping soroban-testnet.stellar.org

# Try again with explicit timeout
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/my_first_contract.wasm \
  --source my-testnet-account \
  --network testnet

# If still failing, check Stellar status page
# https://status.stellar.org
```

### Contract Invocation Authorization Error

**Problem:** `Error: Authorization failed` or `Error: Unauthorized`

**Solution:**

```bash
# Verify you're using the correct account
soroban keys show my-testnet-account

# Check that the account has sufficient balance for fees
soroban account balance --account my-testnet-account --network testnet

# If contract requires specific authorization, ensure your account is authorized
# (This depends on your contract's authorization logic)
```

### Contract Not Found After Deployment

**Problem:** `Error: Contract not found` when trying to invoke

**Solution:**

```bash
# Verify the contract ID is correct
echo $CONTRACT_ID

# Check that the contract exists on testnet
soroban contract info --id $CONTRACT_ID --network testnet

# If not found, the deployment may have failed
# Check the deployment transaction on Stellar Expert:
# https://testnet.stellar.expert/tx/[transaction-hash]
```

### Insufficient Fees

**Problem:** `Error: Insufficient fee` or `Error: Fee too low`

**Solution:**

```bash
# Check current network fees
soroban network info --network testnet

# Soroban CLI automatically calculates fees, but you can increase them:
soroban contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  --fee 1000 \
  -- hello --to World
```

## Common Deployment Patterns

### Deploying Multiple Contracts

If you have multiple contracts to deploy:

```bash
# Deploy first contract
CONTRACT_1=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract1.wasm \
  --source my-testnet-account \
  --network testnet)

# Deploy second contract
CONTRACT_2=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract2.wasm \
  --source my-testnet-account \
  --network testnet)

# Save both IDs
echo "Contract 1: $CONTRACT_1" > contract-ids.txt
echo "Contract 2: $CONTRACT_2" >> contract-ids.txt
```

### Deploying with Custom Initialization

Some contracts require initialization parameters:

```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source my-testnet-account \
  --network testnet \
  -- initialize --admin GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Monitoring Deployment Transactions

View your deployment transaction on Stellar Expert:

```bash
# Get your account's recent transactions
soroban account transactions --account my-testnet-account --network testnet

# View details on Stellar Expert
# https://testnet.stellar.expert/account/[your-account-id]
```

## Next Steps

Now that your contract is deployed:

1. **Test thoroughly** — Invoke all contract functions and verify behavior
2. **Monitor events** — Check contract events and logs
3. **Prepare for mainnet** — [Deploy to Mainnet](/docs/getting-started/deploy-mainnet) when validation is complete
4. **Learn more** — Explore [Core Concepts](/docs/concepts/overview) and [Patterns](/docs/patterns/overview)

## Additional Resources

- [Soroban CLI Documentation](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli)
- [Stellar Testnet](https://developers.stellar.org/docs/fundamentals-and-concepts/testnet-public-network)
- [Soroban SDK Reference](https://docs.rs/soroban-sdk)
- [Stellar Expert Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Stellar Discord Community](https://discord.gg/stellardev)

## Need Help?

If you encounter issues not covered in this guide:

1. Check the [Soroban Documentation](https://developers.stellar.org/docs/build/smart-contracts)
2. Search [GitHub Issues](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues)
3. Ask in the [Stellar Discord](https://discord.gg/stellardev)
4. Create a new issue with your error message and contract code
