# JavaScript/TypeScript SDK Quick Start

This guide provides build/sign/submit snippets for interacting with Soroban
contracts using the official `stellar-sdk` (JavaScript/TypeScript).

## Prerequisites

```bash
npm install stellar-sdk
# or: yarn add stellar-sdk
```

## Full Example: Hello World

```javascript
// index.js
const { Account, Keypair, Networks, Server, TransactionBuilder } = require("stellar-sdk");
const { Contract } = require("stellar-sdk"); // v12+ may not export Contract directly; use the lower-level API

// 1. Setup
const horizon = new Server("https://horizon.stellar.org");

// Funded keypair (use testnet friendbot or your own funded account)
const senderKeypair = Keypair.random(); // In production, load from secret seed
const senderAccount = await horizon.loadAccount(senderKeypair.publicKey());

// 2. Contract configuration
const contractId = "GBY...your-upgradeable-contract-id";
const contract = new Contract(contractId, "default");

// Or with explicit WASM hash (v2 upgrade)
// const contract = new Contract(contractId, "v2_wasm_hash");

// 3. Function invocation: set_value(42)
// The contract's `set_value` takes a single i32 argument
const setTx = new TransactionBuilder(senderAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("set_value", [42]))
  .build();

// 4. Sign and submit
setTx.sign(senderKeypair);
const setTxHash = await horizon.submitTransaction(setTx);
console.log("set_value tx submitted:", setTxHash);

// 5. Read value back
const response = await horizon.transactions()
  .forTransaction(setTxHash)
  .call();
console.log("Transaction posted successfully!");
```

## Upgrade Flow (v1 → v2)

```javascript
// After uploading v2 WASM to Horizon and getting its hash:
// const newWasmHash = "new_hash_here";

// 1. Fund and load the admin account that can upgrade
const adminKeypair = Keypair.fromSecret("SA...admin-secret");
const adminAccount = await horizon.loadAccount(adminKeypair.publicKey());

// 2. Build upgrade transaction
const upgradeTx = new TransactionBuilder(adminAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("upgrade", [new Uint8Array(32).fill(0)])) // v2 wasm hash as BytesN<32>
  .build();

// 3. Sign and submit
upgradeTx.sign(adminKeypair);
await horizon.submitTransaction(upgradeTx);

// 4. Interact with upgraded contract
// The same contract ID now runs v2 code:
const upgradedTx = new TransactionBuilder(adminAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("set_value", [999]))
  .build();

upgradedTx.sign(adminKeypair);
await horizon.submitTransaction(upgradedTx);
```

## Notes

- `Contract.createFunctionCallOp(functionName, args)` constructs the inner
  operation. `args` must match the contract's parameter types.
- WASM hash is a 32-byte value; pass as `Uint8Array(32)` or a 64-char hex string
  depending on SDK version.
- The `upgrade` function in the contract example has an admin auth guard —
  only the registered admin can call it.
- Node test scripts are skipped in CI without network; use the test harness
  (`cargo test`) for unit logic verification.